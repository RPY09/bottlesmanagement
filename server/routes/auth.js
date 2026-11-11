const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Token configurations
const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m'; // Short-lived access token
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'; // Inactivity threshold (e.g. 7 days)
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET || 'secret'}_refresh`;
const isProduction = process.env.NODE_ENV === 'production';

// Cookie options for HttpOnly Refresh Token
const getCookieOptions = () => ({
  httpOnly: true, // Prevents JavaScript from reading the cookie (immune to XSS)
  secure: isProduction, // HTTPS required when sameSite is 'none'
  sameSite: isProduction ? 'none' : 'lax', // 'none' allows cross-domain (Vercel <-> Render)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (inactivity threshold)
  path: '/',
});

// Helper to extract cookie from request
const getCookie = (req, name) => {
  if (req.cookies && req.cookies[name]) return req.cookies[name];
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

const generateTokens = (userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: userId, type: 'refresh' }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
  return { token, refreshToken };
};

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, businessName, fssaiNo, phone, upiId } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, password, businessName, fssaiNo, phone, upiId });
  const { token, refreshToken } = generateTokens(user._id);

  // Set secure HttpOnly cookie for refresh token
  res.cookie('refreshToken', refreshToken, getCookieOptions());

  res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email, businessName: user.businessName, language: user.language }
  });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const match = await user.comparePassword(password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  const { token, refreshToken } = generateTokens(user._id);

  // Set secure HttpOnly cookie for refresh token
  res.cookie('refreshToken', refreshToken, getCookieOptions());

  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, businessName: user.businessName, upiId: user.upiId, fssaiNo: user.fssaiNo, language: user.language }
  });
});

// Refresh Token (Sliding Session)
// Reads refreshToken from secure HttpOnly cookie and issues a new access token + refreshed cookie
router.post('/refresh', async (req, res) => {
  const refreshToken = getCookie(req, 'refreshToken') || req.body?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: 'No active session or refresh token found' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Issue new pair (sliding window reset)
    const tokens = generateTokens(user._id);

    // Refresh the HttpOnly cookie with new expiry
    res.cookie('refreshToken', tokens.refreshToken, getCookieOptions());

    return res.json({
      token: tokens.token,
      user: { id: user._id, name: user.name, email: user.email, businessName: user.businessName, upiId: user.upiId, fssaiNo: user.fssaiNo, language: user.language }
    });
  } catch (err) {
    // Clear expired cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    return res.status(401).json({ message: 'Session expired due to inactivity. Please log in again.' });
  }
});

// Logout - Clears the secure HttpOnly cookie
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  res.json({ message: 'Logged out successfully' });
});

// Get profile
const { authenticate } = require('../middleware/auth');
router.get('/profile', authenticate, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Seamless migration for existing users:
  // If an existing user has a valid access token but does not have the refreshToken cookie yet,
  // automatically issue the secure HttpOnly cookie so they don't get logged out!
  if (!getCookie(req, 'refreshToken')) {
    const { refreshToken } = generateTokens(user._id);
    res.cookie('refreshToken', refreshToken, getCookieOptions());
  }

  res.json(user);
});

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  const updates = req.body;
  delete updates.password;
  if (updates.language && !['en', 'te'].includes(updates.language)) {
    return res.status(400).json({ message: 'Unsupported language' });
  }
  const user = await User.findByIdAndUpdate(req.user.id, updates, { returnDocument: 'after' }).select('-password');
  res.json(user);
});

module.exports = router;
