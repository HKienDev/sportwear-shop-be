import axios from "axios";

const getExchangeRate = async () => {
    try {
        const apiKey = process.env.EXCHANGE_RATE_API_KEY; // Lấy API Key từ biến môi trường
        const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;

        const response = await axios.get(url);
        const exchangeRate = response.data.conversion_rates.VND; // Lấy tỷ giá USD → VND

        console.log(`💰 Tỷ giá USD/VND: ${exchangeRate}`);
        return exchangeRate;
    } catch (error) {
        console.error("❌ Lỗi khi lấy tỷ giá:", error);
        return null;
    }
};

export default getExchangeRate;