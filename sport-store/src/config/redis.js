const { createClient } = require("redis");

const redisClient = createClient();

redisClient.on("error", (err) => {
    console.error("Redis lỗi:", err);
});

redisClient.connect()
    .then(() => console.log("Redis Connected"))
    .catch((err) => console.error("Redis Connection Error:", err));

module.exports = redisClient;