const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  address: { type: String },
  stickerImage: { type: String },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

customerSchema.index({ user: 1, createdAt: -1 });
customerSchema.index({ user: 1, name: 1, createdAt: -1 });

module.exports = mongoose.model('Customer', customerSchema);
