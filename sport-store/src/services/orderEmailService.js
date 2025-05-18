import { sendEmail } from '../utils/sendEmail.js';
import { render } from '@react-email/render';
import * as NewOrderEmailModule from '../email-templates/NewOrderEmail.js';

const NewOrderEmail = NewOrderEmailModule.default || NewOrderEmailModule.NewOrderEmail || NewOrderEmailModule;

/**
 * Gửi email xác nhận đơn hàng mới cho khách hàng
 * @param {Object} params
 * @param {string} params.to - Email người nhận
 * @param {string} params.requestId - ID request để log
 * @param {Object} params.order - Thông tin đơn hàng (đúng cấu trúc NewOrderEmailProps)
 */
export async function sendOrderConfirmationEmail({ to, requestId, order }) {
  try {
    console.log('[EMAIL DEBUG]', { step: 'typeof NewOrderEmail', type: typeof NewOrderEmail });
    console.log('[EMAIL DEBUG]', { step: 'NewOrderEmail', value: NewOrderEmail });
    const reactElement = NewOrderEmail(order);
    console.log('[EMAIL DEBUG]', { step: 'reactElement', value: reactElement });
    const html = render(reactElement);
    console.log('[EMAIL DEBUG]', { step: 'html', value: html, type: typeof html });
    return sendEmail({
      to,
      subject: `Xác nhận đơn hàng #${order.shortId} từ Sport Store`,
      html,
      requestId,
    });
  } catch (err) {
    console.error('[EMAIL DEBUG] Error rendering or sending email:', err);
    throw err;
  }
} 