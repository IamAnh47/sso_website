const app = require('./app');
const config = require('./config/config');

// Log environment settings
const nodeEnv = process.env.NODE_ENV || 'production';
const skipAuth = process.env.SKIP_AUTH === 'true';

// Cảnh báo nếu bỏ qua xác thực
if (skipAuth) {
  console.log('WARNING: Authentication checks are disabled (SKIP_AUTH=true)');
}

// Khởi động server
const server = app.listen(config.port, () => {
  console.log(`Server is running on port http://localhost:${config.port}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated!');
  });
});

module.exports = server; 