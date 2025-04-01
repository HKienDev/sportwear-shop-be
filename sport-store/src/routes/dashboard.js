import express from 'express';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Middleware để check admin role
router.use(isAuthenticated, isAdmin);

// Get Dashboard Stats
router.get('/stats', async (req, res) => {
  try {
    const [totalOrders, totalRevenue, totalCustomers, totalProducts] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { 
          $match: { status: 'completed' } 
        },
        { 
          $group: { 
            _id: null, 
            total: { $sum: "$totalAmount" } 
          } 
        }
      ]),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments()
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalCustomers,
      totalProducts
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Error getting dashboard stats' });
  }
});

// Get Revenue Data
router.get('/revenue', async (req, res) => {
  try {
    const revenue = await Order.aggregate([
      {
        $match: { 
          status: 'completed',
          createdAt: { 
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) 
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          revenue: { $sum: "$totalAmount" }
        }
      },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: "$_id.month" },
              "/",
              { $toString: "$_id.year" }
            ]
          },
          revenue: 1
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    res.json(revenue);
  } catch (error) {
    console.error('Error getting revenue data:', error);
    res.status(500).json({ message: 'Error getting revenue data' });
  }
});

// Get Recent Orders
router.get('/recent-orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name')
      .select('orderNumber user totalAmount status createdAt');

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.user.name,
      total: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error('Error getting recent orders:', error);
    res.status(500).json({ message: 'Error getting recent orders' });
  }
});

// Get Best Selling Products
router.get('/best-selling-products', async (req, res) => {
  try {
    const products = await Order.aggregate([
      {
        $match: { status: 'completed' }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSales: { $sum: "$items.quantity" }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: "$product._id",
          name: "$product.name",
          category: "$product.category",
          image: "$product.image",
          price: "$product.price",
          totalSales: 1
        }
      }
    ]);
    
    res.json(products);
  } catch (error) {
    console.error('Error getting best selling products:', error);
    res.status(500).json({ message: 'Error getting best selling products' });
  }
});

export default router; 