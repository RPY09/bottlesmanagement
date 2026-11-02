require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('express-async-errors');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/products');
const reportRoutes = require('./routes/reports');

const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration supporting local dev and Vercel domains
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, health checks)
    if (!origin) return callback(null, true);
    const clean = origin.replace(/\/$/, '');
    if (
      allowedOrigins.includes(clean) ||
      allowedOrigins.includes('*') ||
      clean.endsWith('.vercel.app') ||
      clean.includes('localhost')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/customers', authenticate, customerRoutes);
app.use('/api/orders', authenticate, orderRoutes);
app.use('/api/payments', authenticate, paymentRoutes);
app.use('/api/expenses', authenticate, expenseRoutes);
app.use('/api/products', authenticate, productRoutes);
app.use('/api/reports', authenticate, reportRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Error handler
app.use(errorHandler);

// Start server immediately (so frontend gets a response even before DB connects)
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI || MONGO_URI.includes('<username>')) {
  console.error('\n❌ ERROR: MongoDB URI is not configured!');
  console.error('📖 Please follow these steps:');
  console.error('   1. Go to https://www.mongodb.com/cloud/atlas/register (free account)');
  console.error('   2. Create a free M0 cluster');
  console.error('   3. Click "Connect" → "Drivers" → copy the connection string');
  console.error('   4. Paste it in server/.env as MONGODB_URI=<your-string>');
  console.error('   5. Replace <password> with your actual password\n');
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => {
      console.error('❌ MongoDB connection failed:', err.message);
      console.error('👉 Check your MONGODB_URI in server/.env');
    });
}
