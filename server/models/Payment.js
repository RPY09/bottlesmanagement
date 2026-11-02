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
  reference: { type: String }, // UPI ref, cheque no, bank ref
  date: { type: Date, default: Date.now },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
