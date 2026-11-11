const mongoose = require('mongoose');

const BOTTLES_PER_CASE = 12;

const orderLineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  size: { type: String },
  cases: { type: Number, required: true, min: 1 },
  bottlesPerCase: { type: Number, default: BOTTLES_PER_CASE },
  rateMode: { type: String, enum: ['case', 'bottle'], default: 'bottle' },
  pricePerBottle: { type: Number, required: true },
  subtotal: { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String },
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

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ user: 1, status: 1, paymentStatus: 1, createdAt: -1 });
orderSchema.index({ user: 1, customer: 1, createdAt: -1 });
orderSchema.index({ user: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ user: 1, reminderSent: 1, status: 1, paymentStatus: 1, createdAt: -1 });

orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    // Find the order with highest orderNumber for this user to prevent collisions
    const lastOrder = await mongoose.model('Order')
      .findOne({ user: this.user, orderNumber: /^ORD\d+$/ })
      .sort({ orderNumber: -1 })
      .select('orderNumber')
      .lean();

    let nextNumber = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const match = lastOrder.orderNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Ensure nextNumber is at least countDocuments + 1
    const count = await mongoose.model('Order').countDocuments({ user: this.user });
    if (count >= nextNumber) {
      nextNumber = count + 1;
    }

    // Double check availability to guarantee no collisions
    let candidate = `ORD${String(nextNumber).padStart(3, '0')}`;
    let exists = await mongoose.model('Order').exists({ user: this.user, orderNumber: candidate });
    while (exists) {
      nextNumber += 1;
      candidate = `ORD${String(nextNumber).padStart(3, '0')}`;
      exists = await mongoose.model('Order').exists({ user: this.user, orderNumber: candidate });
    }

    this.orderNumber = candidate;
  }
});

module.exports = mongoose.model('Order', orderSchema);
module.exports.BOTTLES_PER_CASE = BOTTLES_PER_CASE;
