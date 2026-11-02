require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Order = require('./models/Order');
    const Payment = require('./models/Payment');
    const Expense = require('./models/Expense');
    const User = require('./models/User');

    const users = await User.find({}, '_id name email');
    console.log('USERS:', users);

    const orders = await Order.find({});
    console.log('ORDERS count:', orders.length);
    if (orders.length > 0) {
      console.log('SAMPLE ORDER:', {
        user: orders[0].user,
        userType: typeof orders[0].user,
        createdAt: orders[0].createdAt,
        totalAmount: orders[0].totalAmount,
        status: orders[0].status,
        paymentStatus: orders[0].paymentStatus
      });
    }

    const payments = await Payment.find({});
    console.log('PAYMENTS count:', payments.length);
    if (payments.length > 0) {
      console.log('SAMPLE PAYMENT:', {
        user: payments[0].user,
        amount: payments[0].amount,
        date: payments[0].date
      });
    }

    const expenses = await Expense.find({});
    console.log('EXPENSES count:', expenses.length);

    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

test();

