const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Tạo thư mục logs nếu chưa tồn tại
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Stream cho file logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Format log tuỳ chỉnh
morgan.token('user', (req) => {
  return req.user ? `user:${req.user.id}` : 'anonymous';
});

morgan.token('body', (req) => {
  const body = { ...req.body };
  
  // Che giấu thông tin nhạy cảm
  if (body.password) body.password = '******';
  if (body.token) body.token = '******';
  
  return JSON.stringify(body);
});

// Khởi tạo middleware logger cho development
const developmentLogger = morgan((tokens, req, res) => {
  return [
    '\x1b[36m', // Cyan color
    tokens.method(req, res),
    '\x1b[0m', // Reset color
    tokens.url(req, res),
    '\x1b[33m', // Yellow color
    tokens.status(req, res),
    '\x1b[0m', // Reset color
    tokens['response-time'](req, res), 'ms',
    '\x1b[32m', // Green color
    tokens.user(req, res),
    '\x1b[0m', // Reset color
    tokens.body(req, res)
  ].join(' ');
});

// Khởi tạo middleware logger cho production
const productionLogger = morgan('combined', { stream: accessLogStream });

// Export middleware logger phù hợp với môi trường
module.exports = process.env.NODE_ENV === 'production' ? productionLogger : developmentLogger; 