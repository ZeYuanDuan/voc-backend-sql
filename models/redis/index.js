const { createClient } = require("redis");
const RedisStore = require("connect-redis").default;

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    reconnectStrategy(retries) {
      return Math.min(retries * 50, 2000); // 重試延遲策略
    },
  },
  maxRetriesPerRequest: null, // 不限制重試次數
  enableOfflineQueue: false, // 不啟用離線隊列
  max_user_connections: process.env.REDIS_MAX_CONNECTIONS,
});

redisClient.on("error", (err) => {
  const targetError = "READONLY";
  if (err.message.includes(targetError)) {
    redisClient.connect(); // 重新連接
  }
});

// 連接 Redis
redisClient.connect().catch((err) => {
  console.error(err);
});

module.exports = { redisClient, RedisStore };
