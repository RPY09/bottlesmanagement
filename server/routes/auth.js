const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, businessName, fssaiNo, phone, upiId } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, password, businessName, fssaiNo, phone, upiId });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, businessName: user.businessName }
  });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const match = await user.comparePassword(password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, businessName: user.businessName, upiId: user.upiId, fssaiNo: user.fssaiNo }
  });
});

// Get profile
const { authenticate } = require('../middleware/auth');
router.get('/profile', authenticate, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  const updates = req.body;
  delete updates.password;
  const user = await User.findByIdAndUpdate(req.user.id, updates, { returnDocument: 'after' }).select('-password');
  res.json(user);
});

module.exports = router;
