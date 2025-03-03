require("dotenv").config(); // Nạp biến môi trường từ .env
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function testSendEmail() {
    try {
        const response = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: "hoangtientrungkien2k3@gmail.com",
            subject: "Test Email Resend",
            html: "<p>Chào bạn! Đây là email test từ Resend API.</p>",
        });

        console.log("Email sent successfully:", response);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

testSendEmail();