const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['purchase', 'transport', 'utilities', 'salary', 'maintenance', 'rent', 'other'],
    required: true,
  },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  vendor: { type: String }, // who you paid
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
