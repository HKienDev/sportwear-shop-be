import { sendEmail } from '../utils/sendEmail.js';
import { render } from '@react-email/render';
import * as NewOrderEmailModule from '../email-templates/NewOrderEmail.js';
import * as AdminNewOrderEmailModule from '../email-templates/AdminNewOrderEmail.js';

const NewOrderEmail = NewOrderEmailModule.default || NewOrderEmailModule.NewOrderEmail || NewOrderEmailModule;
const AdminNewOrderEmail = AdminNewOrderEmailModule.default || AdminNewOrderEmailModule.AdminNewOrderEmail || AdminNewOrderEmailModule;

/**
 * Gửi email xác nhận đơn hàng mới cho khách hàng
 * @param {Object} params
 * @param {string} params.to - Email người nhận
 * @param {string} params.requestId - ID request để log
 * @param {Object} params.order - Thông tin đơn hàng (đúng cấu trúc NewOrderEmailProps)
 */
export async function sendOrderConfirmationEmail({ to, requestId, order }) {
  try {
    const reactElement = NewOrderEmail(order);
    const html = await render(reactElement);
    return sendEmail({
      to,
      subject: `Xác nhận đơn hàng #${order.shortId} từ Sport Store`,
      html,
      requestId,
    });
  } catch (err) {
    throw err;
  }
}

export async function sendOrderNotificationToAdmin({ order, requestId }) {
  try {
    // Chuẩn bị props cho template admin (giữ đúng cấu trúc object cho shippingAddress, items...)
    const html = await render(AdminNewOrderEmail(order));
    return sendEmail({
      to: 'notify.vjusport@gmail.com',
      subject: `Đơn hàng mới #${order.shortId} từ khách hàng ${order.shippingAddress?.fullName || ''}`,
      html,
      requestId,
    });
  } catch (err) {
    throw err;
  }
} 