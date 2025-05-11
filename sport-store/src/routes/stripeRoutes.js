import express from 'express';
import { createPaymentIntent, handleWebhook } from '../controllers/stripeController.js';
import { verifyUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route tạo payment intent - cần authentication
router.post('/create-payment-intent', verifyUser, createPaymentIntent);

// Route webhook từ Stripe - không cần authentication vì Stripe gọi trực tiếp
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router; 