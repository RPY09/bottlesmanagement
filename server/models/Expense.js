const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, default: Date.now },
  notes: { type: String, trim: true },
  vendor: { type: String, trim: true }, // who you paid
  paymentMode: {
    type: String,
    enum: ['cash', 'upi', 'bank', 'bank transfer', 'cheque', 'other'],
    default: 'cash',
  },
  status: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'paid',
  },
}, { timestamps: true });

// Query indexes
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
