import stripe from 'stripe';
import env from '../config/env.js';
import Order from '../models/order.js';
import { PAYMENT_STATUS, ORDER_STATUS } from '../utils/constants.js';
import { logInfo, logError } from '../utils/logger.js';
import { getRedisClient } from '../config/redis.js';

const stripeInstance = stripe(env.STRIPE_SECRET_KEY);

class StripeService {
  async createPaymentIntent(amount, orderId) {
    try {
      logInfo(`Payment activity [${orderId}] CREATE_INTENT_START: { amountVND: ${amount}, amountUSD: ${Math.floor(amount / 24500)}, amountCents: ${Math.floor(amount / 24500 * 100)} }`);

      const paymentIntent = await stripeInstance.paymentIntents.create({
        amount: Math.floor(amount / 24500 * 100), // Convert VND to USD cents
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always'
        },
        metadata: {
          orderId,
          originalAmount: amount.toString(),
          currency: 'vnd'
        },
        capture_method: 'automatic_async'
      });

      logInfo(`Payment activity [${orderId}] CREATE_INTENT_SUCCESS: {
        id: '${paymentIntent.id}',
        clientSecret: '${paymentIntent.client_secret}',
        amount: ${paymentIntent.amount},
        currency: '${paymentIntent.currency}'
      }`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      logError(`Payment activity [${orderId}] CREATE_INTENT_ERROR: {
        error: '${error.message}',
        type: '${error.type}'
      }`);
      throw error;
    }
  }

  async handleStripeWebhook(event) {
    const { type, data } = event;
    const paymentIntent = data.object;
    const orderId = paymentIntent.metadata.orderId;

    logInfo(`Payment activity [${orderId}] WEBHOOK_${type.toUpperCase()}: {
      eventId: '${event.id}',
      type: '${type}',
      object: ${JSON.stringify(paymentIntent)}
    }`);

    switch (type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(paymentIntent);
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentCanceled(paymentIntent);
        break;

      default:
        logInfo(`Payment activity [${orderId}] UNHANDLED_EVENT: {
          type: '${type}',
          eventId: '${event.id}'
        }`);
        break;
    }
  }

  async handlePaymentSuccess(paymentIntent) {
    const orderId = paymentIntent.metadata.orderId;
    const originalAmount = parseInt(paymentIntent.metadata.originalAmount);

    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Cập nhật trạng thái thanh toán và đơn hàng
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: PAYMENT_STATUS.PAID,
        status: ORDER_STATUS.PROCESSING,
        payment: {
          amount: originalAmount,
          currency: 'vnd',
          status: 'completed',
          method: 'stripe',
          transactionId: paymentIntent.id,
          updatedAt: new Date()
        }
      });

      // Clear cache
      await this.clearCache(orderId);

      logInfo(`Payment activity [${orderId}] PAYMENT_SUCCESS: {
        paymentIntentId: '${paymentIntent.id}',
        amount: ${originalAmount}
      }`);
    } catch (error) {
      logError(`Payment activity [${orderId}] PAYMENT_SUCCESS_ERROR: {
        error: '${error.message}',
        paymentIntentId: '${paymentIntent.id}'
      }`);
      throw error;
    }
  }

  async handlePaymentFailure(paymentIntent) {
    const orderId = paymentIntent.metadata.orderId;

    try {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: PAYMENT_STATUS.FAILED,
        'payment.status': 'failed',
        'payment.error': paymentIntent.last_payment_error?.message || 'Payment failed',
        'payment.updatedAt': new Date()
      });

      logInfo(`Payment activity [${orderId}] PAYMENT_FAILED: {
        paymentIntentId: '${paymentIntent.id}',
        error: '${paymentIntent.last_payment_error?.message || 'Unknown error'}'
      }`);
    } catch (error) {
      logError(`Payment activity [${orderId}] PAYMENT_FAILURE_ERROR: {
        error: '${error.message}',
        paymentIntentId: '${paymentIntent.id}'
      }`);
      throw error;
    }
  }

  async handlePaymentCanceled(paymentIntent) {
    const orderId = paymentIntent.metadata.orderId;

    try {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: PAYMENT_STATUS.CANCELED,
        'payment.status': 'canceled',
        'payment.updatedAt': new Date()
      });

      logInfo(`Payment activity [${orderId}] PAYMENT_CANCELED: {
        paymentIntentId: '${paymentIntent.id}',
        reason: ${paymentIntent.cancellation_reason || null}
      }`);
    } catch (error) {
      logError(`Payment activity [${orderId}] PAYMENT_CANCEL_ERROR: {
        error: '${error.message}',
        paymentIntentId: '${paymentIntent.id}'
      }`);
      throw error;
    }
  }

  async clearCache(orderId) {
    try {
      const redis = getRedisClient();
      if (redis) {
        const keys = await redis.keys('*orders*');
        if (keys.length > 0) {
          await redis.del(keys);
          logInfo(`Cache cleared for order ${orderId}`);
        }
      }
    } catch (error) {
      logError(`Error clearing cache for order ${orderId}: ${error.message}`);
    }
  }
}

export default new StripeService(); 