const express = require('express');
const Expense = require('../models/Expense');
const router = express.Router();

// Get all expenses with filtering & search
router.get('/', async (req, res) => {
  const { category, startDate, endDate, search, paymentMode, status } = req.query;
  const userId = req.user._id || req.user.id;
  const query = { user: userId };

  if (category && category !== 'all') {
    query.category = new RegExp(`^${category.trim()}$`, 'i');
  }

  if (paymentMode && paymentMode !== 'all') {
    query.paymentMode = paymentMode.toLowerCase();
  }

  if (status && status !== 'all') {
    query.status = status.toLowerCase();
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  if (search && search.trim()) {
    const s = search.trim();
    const regex = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ description: regex }, { vendor: regex }, { notes: regex }];
  }

  const expenses = await Expense.find(query).sort({ date: -1 }).lean();
  res.json(expenses);
});

// Get single expense
router.get('/:id', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const expense = await Expense.findOne({ _id: req.params.id, user: userId }).lean();
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json(expense);
});

// Create expense
router.post('/', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const expense = await Expense.create({
    ...req.body,
    amount: parseFloat(req.body.amount),
    user: userId,
  });
  res.status(201).json(expense);
});

// Update expense
router.put('/:id', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const updateData = { ...req.body };
  if (updateData.amount !== undefined) {
    updateData.amount = parseFloat(updateData.amount);
  }
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, user: userId },
    updateData,
    { returnDocument: 'after', runValidators: true }
  );
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json(expense);
});

// Delete expense
router.delete('/:id', async (req, res) => {
  const userId = req.user._id || req.user.id;
  const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: userId });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json({ message: 'Expense deleted', id: req.params.id });
});

// Summary by category (used by Reports.jsx)
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
