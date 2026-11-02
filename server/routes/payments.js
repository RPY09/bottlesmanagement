const express = require('express');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const router = express.Router();

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
    const { startDate, endDate, mode, customer, search, page, limit } = req.query;
    const userId = req.user?._id || req.user?.id;
    const query = { user: userId };

    if (mode) query.mode = mode;
    if (customer) query.customer = customer;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegExp(search.trim()), 'i');
      const [customerIds, orderIds] = await Promise.all([
        Customer.find({ user: userId, name: regex }).select('_id').lean(),
        Order.find({ user: userId, orderNumber: regex }).select('_id').lean(),
      ]);
      query.$or = [
        { reference: regex },
        { notes: regex },
        { mode: regex },
        ...(customerIds.length ? [{ customer: { $in: customerIds.map(({ _id }) => _id) } }] : []),
        ...(orderIds.length ? [{ order: { $in: orderIds.map(({ _id }) => _id) } }] : []),
      ];
    }

    const hasPagination = Object.prototype.hasOwnProperty.call(req.query, 'page') || Object.prototype.hasOwnProperty.call(req.query, 'limit');
    const baseQuery = Payment.find(query)
      .select('customer order amount mode reference date notes createdAt')
      .populate('customer', 'name phone')
      .populate('order', 'orderNumber totalAmount')
      .sort({ date: -1 })
      .lean();

    if (!hasPagination) {
      const payments = await baseQuery;
      return res.json(payments);
    }

    const safePage = parsePage(page);
    const safeLimit = parseLimit(limit);
    const skip = (safePage - 1) * safeLimit;
    const [payments, total] = await Promise.all([
      baseQuery.skip(skip).limit(safeLimit),
      Payment.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return res.json({ items: payments, pagination: { page: safePage, limit: safeLimit, total, totalPages, hasNextPage: safePage < totalPages } });
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res) => {
  const { orderId, amount, mode, reference, date, notes, customerId } = req.body;
  const cleanMode = (mode || 'cash').toLowerCase();
  const payment = await Payment.create({ user: req.user.id, customer: customerId, order: orderId, amount, mode: cleanMode, reference, date: date || new Date(), notes });

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

router.delete('/:id', async (req, res) => {
  const payment = await Payment.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

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
