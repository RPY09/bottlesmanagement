const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  size: { type: String, required: true }, // e.g. "250ml", "500ml", "1L", "2L", "20L Can"
  bottlesPerCase: { type: Number, default: 12 }, // number of bottles per case
  name: { type: String, required: true },
  pricePerUnit: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
