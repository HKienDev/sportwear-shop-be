import stripeService from '../services/stripe.service.js';
import Order from '../models/order.js';
import { PAYMENT_STATUS } from '../utils/constants.js';
import env from '../config/env.js';
import Stripe from 'stripe';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function retryWebhookHandler(event, attempt = 1) {
  try {
    await stripeService.handleStripeWebhook(event);
  } catch (error) {
    console.error(`Webhook handling error (attempt ${attempt}/${MAX_RETRIES}):`, error);
    
    if (attempt < MAX_RETRIES) {
      console.log(`Retrying webhook handling in ${RETRY_DELAY}ms (${attempt}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryWebhookHandler(event, attempt + 1);
    }
    throw error;
  }
}

export const createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    console.log('Creating payment intent for order:', orderId);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      return res.status(400).json({ 
        success: false,
        message: 'Đơn hàng đã được thanh toán' 
      });
    }

    // Kiểm tra nếu đã có payment intent
    if (order.paymentIntentId) {
      try {
        // Kiểm tra trạng thái của payment intent hiện tại
        const existingIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);
        
        if (['succeeded', 'processing'].includes(existingIntent.status)) {
          return res.status(400).json({
            success: false,
            message: 'Đơn hàng đang được xử lý thanh toán'
          });
        }

        if (existingIntent.status !== 'canceled') {
          // Hủy payment intent cũ nếu chưa bị hủy
          await stripe.paymentIntents.cancel(order.paymentIntentId);
        }
      } catch (error) {
        console.error('Error checking existing payment intent:', error);
      }
    }

    const { clientSecret, paymentIntentId } = await stripeService.createPaymentIntent(
      order.totalPrice,
      orderId
    );

    // Cập nhật paymentIntentId vào order
    await Order.findByIdAndUpdate(orderId, { 
      paymentIntentId,
      payment: {
        amount: order.totalPrice,
        currency: 'vnd',
        status: 'pending',
        updatedAt: new Date()
      }
    });

    console.log('Payment intent response:', {
      clientSecret,
      paymentIntentId,
      amount: order.totalPrice
    });

    res.json({
      success: true,
      clientSecret,
      paymentIntentId,
      amount: order.totalPrice,
      currency: 'vnd'
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra khi tạo yêu cầu thanh toán',
      error: error.message
    });
  }
};

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  console.log('Received Stripe webhook', {
    signature: sig ? 'Present' : 'Missing',
    rawBodyPresent: req.body ? 'Yes' : 'No',
    contentType: req.headers['content-type'],
    webhookSecretPresent: webhookSecret ? 'Yes' : 'No'
  });

  try {
    if (!req.body) {
      throw new Error('No request body provided');
    }

    if (!sig) {
      throw new Error('No Stripe signature found in headers');
    }

    if (!webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('Webhook event verified:', {
      type: event.type,
      id: event.id,
      apiVersion: event.api_version,
      data: JSON.stringify(event.data.object).substring(0, 100) + '...'
    });

    // Xử lý webhook với retry mechanism
    await retryWebhookHandler(event);

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

export const stripeController = {
  createPaymentIntent,
  handleWebhook
};

export default stripeController; 