import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/Order.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sportwear-shop');

async function testOrders() {
  try {
    console.log('Testing orders in database...');
    
    // Get all orders
    const allOrders = await Order.find({}).lean();
    console.log(`Total orders: ${allOrders.length}`);
    
    // Check orders with phone 0362195258
    const ordersWithPhone = await Order.find({ 'shippingAddress.phone': '0362195258' }).lean();
    console.log(`Orders with phone 0362195258: ${ordersWithPhone.length}`);
    
    if (ordersWithPhone.length > 0) {
      console.log('Order details:');
      ordersWithPhone.forEach((order, index) => {
        console.log(`Order ${index + 1}:`);
        console.log(`  ID: ${order._id}`);
        console.log(`  ShortId: ${order.shortId}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  TotalPrice: ${order.totalPrice}`);
        console.log(`  Phone: ${order.shippingAddress?.phone}`);
        console.log(`  CreatedAt: ${order.createdAt}`);
        console.log('---');
      });
    }
    
    // Check all unique phone numbers
    const uniquePhones = await Order.distinct('shippingAddress.phone');
    console.log(`Unique phone numbers: ${uniquePhones.length}`);
    console.log('Phone numbers:', uniquePhones);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

testOrders(); 