const express = require('express');
const Expense = require('../models/Expense');
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
    const { category, startDate, endDate, search, paymentMode, status, page, limit } = req.query;
    const userId = req.user?._id || req.user?.id;
    const query = { user: userId };

    if (category && category !== 'all') {
      query.category = new RegExp(`^${escapeRegExp(category.trim())}$`, 'i');
    }

    if (paymentMode && paymentMode !== 'all') {
      query.paymentMode = paymentMode.toLowerCase();
    }

    if (status && status !== 'all') {
      query.status = status.toLowerCase();
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) query.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    if (search && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(escapeRegExp(s), 'i');
      query.$or = [{ description: regex }, { vendor: regex }, { notes: regex }, { category: regex }, { paymentMode: regex }];
    }

    const hasPagination = Object.prototype.hasOwnProperty.call(req.query, 'page') || Object.prototype.hasOwnProperty.call(req.query, 'limit');
    const baseQuery = Expense.find(query)
      .select('description vendor category amount date paymentMode status notes createdAt')
      .sort({ date: -1 })
      .lean();

    if (!hasPagination) {
      const expenses = await baseQuery;
      return res.json(expenses);
    }

    const safePage = parsePage(page);
    const safeLimit = parseLimit(limit);
    const skip = (safePage - 1) * safeLimit;
    const [expenses, total] = await Promise.all([
      baseQuery.skip(skip).limit(safeLimit),
      Expense.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return res.json({ items: expenses, pagination: { page: safePage, limit: safeLimit, total, totalPages, hasNextPage: safePage < totalPages } });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const expense = await Expense.findOne({ _id: req.params.id, user: userId }).lean();
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json(expense);
});

router.post('/', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const expense = await Expense.create({ ...req.body, amount: parseFloat(req.body.amount), user: userId });
  res.status(201).json(expense);
});

router.put('/:id', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const updateData = { ...req.body };
  if (updateData.amount !== undefined) updateData.amount = parseFloat(updateData.amount);
  const expense = await Expense.findOneAndUpdate({ _id: req.params.id, user: userId }, updateData, { returnDocument: 'after', runValidators: true });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json(expense);
});

router.delete('/:id', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: userId });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json({ message: 'Expense deleted', id: req.params.id });
});

router.get('/summary/by-category', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { month, year } = req.query;
  const y = parseInt(year, 10) || new Date().getFullYear();
  const m = parseInt(month, 10) || new Date().getMonth() + 1;
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

  const summary = await Expense.aggregate([
    { $match: { user: userId, date: { $gte: start, $lte: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  res.json(summary);
});

module.exports = router;
