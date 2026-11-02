const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const router = express.Router();

const BOTTLES_PER_CASE = 12;

// Get all orders
router.get('/', async (req, res) => {
  const { status, paymentStatus, customer, startDate, endDate } = req.query;
  const query = { user: req.user.id };
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (customer) query.customer = customer;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  const orders = await Order.find(query)
    .populate('customer', 'name phone address')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// Get single order
router.get('/:id', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id })
    .populate('customer');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const payments = await Payment.find({ order: req.params.id });
  res.json({ order, payments });
});

// Create order
router.post('/', async (req, res) => {
  const { customer, lines, status, deliveryDate, notes, paymentStatus, paidAmount, paymentMode } = req.body;

  // Resolve product prices and build line snapshots (allow admin price override)
  const resolvedLines = await Promise.all(lines.map(async (line) => {
    const product = await Product.findOne({ _id: line.product, user: req.user.id });
    if (!product) throw Object.assign(new Error(`Product not found: ${line.product}`), { statusCode: 400 });
    const cases = parseInt(line.cases) || 1;
    const pricePerBottle = (line.pricePerBottle !== undefined && !isNaN(line.pricePerBottle))
      ? parseFloat(line.pricePerBottle)
      : product.pricePerUnit;
    const bottlesPerCase = parseInt(line.bottlesPerCase) || product.bottlesPerCase || BOTTLES_PER_CASE;
    const subtotal = cases * bottlesPerCase * pricePerBottle;
    return {
      product: product._id,
      productName: product.name,
      size: product.size,
      cases,
      bottlesPerCase,
      pricePerBottle,
      subtotal,
    };
  }));

  const totalAmount = resolvedLines.reduce((s, l) => s + l.subtotal, 0);
  const isPaid = paymentStatus === 'paid' || (paidAmount && parseFloat(paidAmount) >= totalAmount);
  const initialPaid = isPaid ? totalAmount : (parseFloat(paidAmount) || 0);
  const actualPayStatus = isPaid ? 'paid' : (initialPaid > 0 ? 'partial' : 'unpaid');

  const order = await Order.create({
    user: req.user.id,
    customer,
    lines: resolvedLines,
    totalAmount,
    paidAmount: initialPaid,
    paymentStatus: actualPayStatus,
    status: status || 'pending',
    deliveryDate,
    notes,
  });

  if (initialPaid > 0) {
    await Payment.create({
      user: req.user.id,
      customer,
      order: order._id,
      amount: initialPaid,
      mode: (paymentMode || 'cash').toLowerCase(),
      date: new Date(),
      notes: `Payment recorded upon order creation (${order.orderNumber})`,
    });
  }

  await order.populate('customer');
  res.status(201).json(order);
});

// Quick Mark Order as Paid
router.patch('/:id/pay', async (req, res) => {
  const { mode = 'cash', reference = '' } = req.body;
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const dueAmount = Math.max(0, order.totalAmount - (order.paidAmount || 0));
  if (dueAmount > 0) {
    await Payment.create({
      user: req.user.id,
      customer: order.customer,
      order: order._id,
      amount: dueAmount,
      mode: (mode || 'cash').toLowerCase(),
      reference,
      date: new Date(),
      notes: `Payment for ${order.orderNumber}`,
    });
    order.paidAmount = order.totalAmount;
    order.paymentStatus = 'paid';
    await order.save();
  } else {
    order.paymentStatus = 'paid';
    await order.save();
  }

  await order.populate('customer', 'name phone address');
  res.json(order);
});

// Update order
router.put('/:id', async (req, res) => {
  const { lines, ...rest } = req.body;
  let update = { ...rest };

  if (lines) {
    const resolvedLines = await Promise.all(lines.map(async (line) => {
      const product = await Product.findOne({ _id: line.product, user: req.user.id });
      const bottlesPerCase = parseInt(line.bottlesPerCase) || product?.bottlesPerCase || BOTTLES_PER_CASE;
      const cases = parseInt(line.cases) || 1;
      const pricePerBottle = (line.pricePerBottle !== undefined && !isNaN(line.pricePerBottle))
        ? parseFloat(line.pricePerBottle)
        : (product ? product.pricePerUnit : line.pricePerBottle);
      const subtotal = cases * bottlesPerCase * pricePerBottle;

      return {
        product: product ? product._id : line.product,
        productName: line.productName || product?.name,
        size: line.size || product?.size,
        cases,
        bottlesPerCase,
        pricePerBottle,
        subtotal,
      };
    }));
    update.lines = resolvedLines;
    update.totalAmount = resolvedLines.reduce((s, l) => s + l.subtotal, 0);
  }

  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    update,
    { returnDocument: 'after' }
  ).populate('customer', 'name phone address');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
});

// Pending orders for reminders
router.get('/pending/reminders', async (req, res) => {
  const orders = await Order.find({
    user: req.user.id,
    paymentStatus: { $in: ['unpaid', 'partial'] },
    status: 'delivered',
  }).populate('customer', 'name phone email');
  res.json(orders);
});

// Mark reminder sent
router.patch('/:id/reminder', async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { reminderSent: true, reminderSentAt: new Date() },
    { returnDocument: 'after' }
  );
  res.json(order);
});

// Delete order
router.delete('/:id', async (req, res) => {
  await Order.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  res.json({ message: 'Order deleted' });
});

module.exports = router;
