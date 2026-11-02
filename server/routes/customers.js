const express = require('express');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const router = express.Router();

// Get all customers
router.get('/', async (req, res) => {
  const { search, type } = req.query;
  const query = { user: req.user.id };
  if (type) query.type = type;
  if (search) query.name = { $regex: search, $options: 'i' };
  const customers = await Customer.find(query).sort({ createdAt: -1 });
  res.json(customers);
});

// Get single customer with order summary
router.get('/:id', async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, user: req.user.id });
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const orders = await Order.find({ customer: req.params.id, user: req.user.id }).sort({ createdAt: -1 });
  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  res.json({ customer, orders, summary: { totalOrders, totalValue, totalPaid, pending: totalValue - totalPaid } });
});

// Create customer
router.post('/', async (req, res) => {
  const customer = await Customer.create({ ...req.body, user: req.user.id });
  res.status(201).json(customer);
});

// Update customer
router.put('/:id', async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, user: req.user.id },
    req.body,
    { returnDocument: 'after' }
  );
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  res.json(customer);
});

// Delete customer
router.delete('/:id', async (req, res) => {
  await Customer.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  res.json({ message: 'Customer deleted' });
});

module.exports = router;
