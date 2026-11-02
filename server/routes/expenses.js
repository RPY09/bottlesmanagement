const express = require('express');
const Expense = require('../models/Expense');
const router = express.Router();

// Get all expenses
router.get('/', async (req, res) => {
  const { category, startDate, endDate } = req.query;
  const query = { user: req.user.id };
  if (category) query.category = category;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  const expenses = await Expense.find(query).sort({ date: -1 });
  res.json(expenses);
});

// Create expense
router.post('/', async (req, res) => {
  const expense = await Expense.create({ ...req.body, user: req.user.id });
  res.status(201).json(expense);
});

// Update expense
router.put('/:id', async (req, res) => {
  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    req.body,
    { returnDocument: 'after' }
  );
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json(expense);
});

// Delete expense
router.delete('/:id', async (req, res) => {
  await Expense.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  res.json({ message: 'Expense deleted' });
});

// Summary by category
router.get('/summary/by-category', async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
  const summary = await Expense.aggregate([
    { $match: { user: req.user.id, date: { $gte: start, $lte: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);
  res.json(summary);
});

module.exports = router;
