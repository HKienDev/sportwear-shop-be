const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
    try {
        console.log(`Đang gửi email đến: ${to}`);

        const response = await resend.emails.send({
            from: "no-reply@vjusport.com",
            to,
            subject,
            html,
        });

        console.log(`Gửi email thành công đến: ${to}`);

        return response; // Trả về response để sử dụng nếu cần
    } catch (error) {
        console.error("Lỗi khi gửi email:", error);
        throw error;
    }
};

// Template HTML chung
const generateEmailTemplate = (title, message, highlightText, footerText = "") => `
  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #007bff; text-align: center;">${title}</h2>
      <p style="text-align: center; font-size: 16px; color: #333;">${message}</p>
      <p style="font-size: 20px; font-weight: bold; text-align: center; background: #f4f4f4; padding: 10px; border-radius: 5px; color: #d9534f;">
          ${highlightText}
      </p>
      <p style="text-align: center; font-size: 14px; color: #555;">${footerText}</p>
      <p style="text-align: center; font-size: 14px; color: #555;"><strong>Đội ngũ VjuSport</strong></p>
  </div>
`;

// Viết gọn các hàm gửi email với template đẹp hơn
const sendOtpEmail = (to, otp) => 
    sendEmail(to, "Mã OTP của bạn - VjuSport", generateEmailTemplate(
        "Xác thực tài khoản",
        "Chúng tôi nhận được yêu cầu xác thực tài khoản của bạn.",
        `Mã OTP của bạn: <span style="color: #007bff;">${otp}</span>`,
        "Mã OTP có hiệu lực trong <strong>1 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai."
    ));

const sendResetOtpEmail = (to, otp) => 
    sendEmail(to, "Mã OTP đặt lại mật khẩu - VjuSport", generateEmailTemplate(
        "Đặt lại mật khẩu",
        "Bạn vừa yêu cầu đặt lại mật khẩu. Đây là mã OTP của bạn:",
        `<span style="color: #007bff;">${otp}</span>`,
        "Mã OTP có hiệu lực trong <strong>1 phút</strong>. Nếu bạn không yêu cầu, vui lòng bỏ qua email này."
    ));

const sendOrderNotification = (to, orderId) => 
    sendEmail(to, "Xác nhận đơn hàng - VjuSport", generateEmailTemplate(
        "Đơn hàng thành công!",
        `Đơn hàng <strong>${orderId}</strong> của bạn đã được đặt thành công.`,
        "Cảm ơn bạn đã mua sắm tại HKZeusVN!",
        "Đơn hàng của bạn đang được xử lý. Chúng tôi sẽ sớm gửi thông tin cập nhật!"
    ));

module.exports = { sendOtpEmail, sendResetOtpEmail, sendOrderNotification };