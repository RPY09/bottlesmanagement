const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  size: { type: String, required: true },
  bottlesPerCase: { type: Number, default: 12 },
  name: { type: String, required: true },
  pricePerUnit: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

productSchema.index({ user: 1, createdAt: -1 });
productSchema.index({ user: 1, isActive: 1, name: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
