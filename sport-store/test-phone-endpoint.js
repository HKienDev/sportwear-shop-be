import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './src/models/Order.js';
import User from './src/models/User.js';
import Product from './src/models/Product.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sportwear-shop');

async function testPhoneEndpoint() {
  try {
    console.log('Testing getOrdersByPhone logic directly...');
    
    const phone = '0362195258';
    console.log(`Searching for orders with phone: ${phone}`);
    
    const query = { 'shippingAddress.phone': phone };
    console.log('Query:', JSON.stringify(query));

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate('user', 'email fullname phone customId')
      .populate('items.product', 'name price image')
      .lean();

    console.log(`Found ${orders.length} orders for phone ${phone}`);
    
    if (orders.length > 0) {
      console.log('Order details:');
      orders.forEach((order, index) => {
        console.log(`Order ${index + 1}:`);
        console.log(`  ID: ${order._id}`);
        console.log(`  ShortId: ${order.shortId}`);
        console.log(`  Status: ${order.status}`);
        console.log(`  TotalPrice: ${order.totalPrice}`);
        console.log(`  Phone: ${order.shippingAddress?.phone}`);
        console.log(`  User: ${order.user?.fullname || 'N/A'}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

testPhoneEndpoint(); 