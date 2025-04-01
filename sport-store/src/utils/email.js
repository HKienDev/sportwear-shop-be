import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Gửi email chung
export const sendEmail = async (email, subject, html) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Sport Store <no-reply@sportstore.com>',
      to: email,
      subject,
      html
    });
    return true;
  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
};

// Gửi email xác nhận đăng ký
export const sendVerificationEmail = async (email, verificationLink) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Sport Store <no-reply@sportstore.com>',
      to: email,
      subject: 'Xác nhận đăng ký tài khoản',
      html: `
        <h2>Xác nhận đăng ký tài khoản</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại Sport Store.</p>
        <p>Vui lòng click vào link bên dưới để xác nhận email của bạn:</p>
        <a href="${verificationLink}">${verificationLink}</a>
        <p>Link này sẽ hết hạn sau 24 giờ.</p>
        <p>Nếu bạn không yêu cầu đăng ký tài khoản, vui lòng bỏ qua email này.</p>
      `
    });
    return true;
  } catch (error) {
    console.error('Send verification email error:', error);
    return false;
  }
};

// Gửi email reset password
export const sendResetPasswordEmail = async (email, resetLink) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Sport Store <no-reply@sportstore.com>',
      to: email,
      subject: 'Đặt lại mật khẩu',
      html: `
        <h2>Đặt lại mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
        <p>Vui lòng click vào link bên dưới để đặt lại mật khẩu:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>Link này sẽ hết hạn sau 1 giờ.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      `
    });
    return true;
  } catch (error) {
    console.error('Send reset password email error:', error);
    return false;
  }
};

// Gửi email thông báo đơn hàng mới
export const sendOrderConfirmationEmail = async (email, order) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Sport Store <no-reply@sportstore.com>',
      to: email,
      subject: 'Xác nhận đơn hàng',
      html: `
        <h2>Xác nhận đơn hàng #${order._id}</h2>
        <p>Cảm ơn bạn đã đặt hàng tại Sport Store.</p>
        <h3>Thông tin đơn hàng:</h3>
        <ul>
          ${order.items.map(item => `
            <li>${item.product.name} x ${item.quantity} = ${item.price * item.quantity}đ</li>
          `).join('')}
        </ul>
        <p>Tổng tiền: ${order.totalAmount}đ</p>
        <h3>Thông tin giao hàng:</h3>
        <p>Họ tên: ${order.shippingInfo.fullName}</p>
        <p>Địa chỉ: ${order.shippingInfo.address}</p>
        <p>Số điện thoại: ${order.shippingInfo.phone}</p>
        <p>Phương thức thanh toán: ${order.paymentMethod}</p>
      `
    });
    return true;
  } catch (error) {
    console.error('Send order confirmation email error:', error);
    return false;
  }
};

// Gửi email cập nhật trạng thái đơn hàng
export const sendOrderStatusEmail = async (email, order) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Sport Store <no-reply@sportstore.com>',
      to: email,
      subject: 'Cập nhật trạng thái đơn hàng',
      html: `
        <h2>Cập nhật trạng thái đơn hàng #${order._id}</h2>
        <p>Đơn hàng của bạn đã được cập nhật trạng thái mới:</p>
        <p><strong>${order.status}</strong></p>
        <p>Vui lòng truy cập website để xem chi tiết.</p>
      `
    });
    return true;
  } catch (error) {
    console.error('Send order status email error:', error);
    return false;
  }
}; 