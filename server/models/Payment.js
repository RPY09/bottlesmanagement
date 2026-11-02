const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount: { type: Number, required: true },
  mode: {
    type: String,
    lowercase: true,
    enum: ['cash', 'upi', 'bank', 'bank transfer', 'cheque', 'other'],
    required: true,
  },
  reference: { type: String },
  date: { type: Date, default: Date.now },
  notes: { type: String },
}, { timestamps: true });

paymentSchema.index({ user: 1, date: -1 });
paymentSchema.index({ user: 1, customer: 1, date: -1 });
paymentSchema.index({ user: 1, order: 1, date: -1 });
paymentSchema.index({ user: 1, mode: 1, date: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
