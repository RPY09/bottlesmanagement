const mongoose = require('mongoose');

const BOTTLES_PER_CASE = 12;

const orderLineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String }, // snapshot at time of order
  size: { type: String },        // snapshot
  cases: { type: Number, required: true, min: 1 },
  bottlesPerCase: { type: Number, default: BOTTLES_PER_CASE },
  pricePerBottle: { type: Number, required: true }, // snapshot at time of order
  subtotal: { type: Number, required: true },        // cases * 12 * pricePerBottle
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  lines: [orderLineSchema],
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'delivered', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  deliveryDate: { type: Date },
  notes: { type: String },
  reminderSent: { type: Boolean, default: false },
  reminderSentAt: { type: Date },
}, { timestamps: true });

// Auto-generate order number
orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments({ user: this.user });
    this.orderNumber = `ORD${String(count + 1).padStart(3, '0')}`;
  }
});

module.exports = mongoose.model('Order', orderSchema);
module.exports.BOTTLES_PER_CASE = BOTTLES_PER_CASE;
