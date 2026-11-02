const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const router = express.Router();

const BOTTLES_PER_CASE = 12;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

const parsePage = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const parseLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res, next) => {
  try {
    const { status, paymentStatus, customer, startDate, endDate, search, page, limit } = req.query;
    const userId = req.user?._id || req.user?.id;
    const query = { user: userId };

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customer) query.customer = customer;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegExp(search.trim()), 'i');
      const customerIds = await Customer.find({ user: userId, name: regex }).select('_id').lean();
      query.$or = [
        { orderNumber: regex },
        { notes: regex },
        { 'lines.productName': regex },
        ...(customerIds.length ? [{ customer: { $in: customerIds.map(({ _id }) => _id) } }] : []),
      ];
    }

    const hasPagination = Object.prototype.hasOwnProperty.call(req.query, 'page') || Object.prototype.hasOwnProperty.call(req.query, 'limit');
    const baseQuery = Order.find(query)
      .select('orderNumber customer lines totalAmount paidAmount paymentStatus status createdAt notes')
      .populate('customer', 'name phone address')
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const orders = await baseQuery;
      return res.json(orders);
    }

    const safePage = parsePage(page);
    const safeLimit = parseLimit(limit);
    const skip = (safePage - 1) * safeLimit;
    const [orders, total] = await Promise.all([
      baseQuery.skip(skip).limit(safeLimit),
      Order.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return res.json({ items: orders, pagination: { page: safePage, limit: safeLimit, total, totalPages, hasNextPage: safePage < totalPages } });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).populate('customer');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const payments = await Payment.find({ order: req.params.id });
  res.json({ order, payments });
});

router.post('/', async (req, res) => {
  const { customer, lines, status, deliveryDate, notes, paymentStatus, paidAmount, paymentMode } = req.body;

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

router.get('/pending/reminders', async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const userId = req.user?._id || req.user?.id;
    const query = {
      user: userId,
      paymentStatus: { $in: ['unpaid', 'partial'] },
      status: 'delivered',
    };

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegExp(search.trim()), 'i');
      const customerIds = await Customer.find({ user: userId, name: regex }).select('_id').lean();
      query.$or = [
        { orderNumber: regex },
        { notes: regex },
        ...(customerIds.length ? [{ customer: { $in: customerIds.map(({ _id }) => _id) } }] : []),
      ];
    }

    const hasPagination = Object.prototype.hasOwnProperty.call(req.query, 'page') || Object.prototype.hasOwnProperty.call(req.query, 'limit');
    const baseQuery = Order.find(query)
      .select('orderNumber customer totalAmount paidAmount paymentStatus status createdAt deliveryDate notes reminderSent reminderSentAt')
      .populate('customer', 'name phone email')
      .sort({ createdAt: -1 })
      .lean();

    if (!hasPagination) {
      const orders = await baseQuery;
      return res.json(orders);
    }

    const safePage = parsePage(page);
    const safeLimit = parseLimit(limit);
    const skip = (safePage - 1) * safeLimit;
    const [orders, total] = await Promise.all([
      baseQuery.skip(skip).limit(safeLimit),
      Order.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return res.json({ items: orders, pagination: { page: safePage, limit: safeLimit, total, totalPages, hasNextPage: safePage < totalPages } });
  } catch (err) {
    return next(err);
  }
});

router.patch('/:id/reminder', async (req, res) => {
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    { reminderSent: true, reminderSentAt: new Date() },
    { returnDocument: 'after' }
  );
  res.json(order);
});

router.delete('/:id', async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const order = await Order.findOne({ _id: req.params.id, user: userId }).select('_id').lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });

  // Payments belong to the order and must not survive its deletion.
  await Payment.deleteMany({ order: order._id, user: userId });
  await Order.deleteOne({ _id: order._id, user: userId });

  res.json({ message: 'Order and related payments deleted', id: order._id });
});

module.exports = router;
