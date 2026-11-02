const express = require('express');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const router = express.Router();

// Get all payments
router.get('/', async (req, res) => {
  const { startDate, endDate, mode, customer } = req.query;
  const query = { user: req.user.id };
  if (mode) query.mode = mode;
  if (customer) query.customer = customer;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  const payments = await Payment.find(query)
    .populate('customer', 'name phone')
    .populate('order', 'orderNumber totalAmount')
    .sort({ date: -1 });
  res.json(payments);
});

// Record a payment
router.post('/', async (req, res) => {
  const { orderId, amount, mode, reference, date, notes, customerId } = req.body;
  const cleanMode = (mode || 'cash').toLowerCase();
  const payment = await Payment.create({
    user: req.user.id,
    customer: customerId,
    order: orderId,
    amount,
    mode: cleanMode,
    reference,
    date: date || new Date(),
    notes,
  });

  // Update order paid amount and payment status
  if (orderId) {
    const order = await Order.findById(orderId);
    if (order) {
      order.paidAmount = (order.paidAmount || 0) + amount;
      if (order.paidAmount >= order.totalAmount) {
        order.paymentStatus = 'paid';
      } else if (order.paidAmount > 0) {
        order.paymentStatus = 'partial';
      }
      await order.save();
    }
  }

  await payment.populate('customer', 'name phone');
  res.status(201).json(payment);
});

// Delete payment
router.delete('/:id', async (req, res) => {
  const payment = await Payment.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  // Revert order paid amount
  if (payment.order) {
    const order = await Order.findById(payment.order);
    if (order) {
      order.paidAmount = Math.max(0, (order.paidAmount || 0) - payment.amount);
      if (order.paidAmount >= order.totalAmount) order.paymentStatus = 'paid';
      else if (order.paidAmount > 0) order.paymentStatus = 'partial';
      else order.paymentStatus = 'unpaid';
      await order.save();
    }
  }
  res.json({ message: 'Payment deleted' });
});

module.exports = router;
