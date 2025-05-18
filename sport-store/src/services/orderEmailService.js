import { sendEmail } from '../utils/sendEmail.js';
import { render } from '@react-email/render';
import NewOrderEmail from '../email-templates/NewOrderEmail.js';

/**
 * Gửi email xác nhận đơn hàng mới cho khách hàng
 * @param {Object} params
 * @param {string} params.to - Email người nhận
 * @param {string} params.requestId - ID request để log
 * @param {Object} params.order - Thông tin đơn hàng (đúng cấu trúc NewOrderEmailProps)
 */
export async function sendOrderConfirmationEmail({ to, requestId, order }) {
  // order phải có đủ các trường như NewOrderEmailProps
  const html = render(NewOrderEmail(order));

  return sendEmail({
    to,
    subject: `Xác nhận đơn hàng #${order.shortId} từ Sport Store`,
    html,
    requestId,
  });
} 