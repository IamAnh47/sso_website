const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const config = require('./config/config');
const logger = require('./middlewares/logger');
const errorMiddleware = require('./middlewares/error');
const routes = require('./routes');

// Khởi tạo express app
const app = express();

// Middleware cơ bản
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"]
    }
  }
})); // Bảo mật HTTP headers nhưng cho phép inline scripts

// Cấu hình CORS để cho phép cookies
app.use(cors({
  origin: true, // Cho phép domain nguồn gốc của request
  credentials: true // Cho phép gửi cookies qua CORS
}));

app.use(bodyParser.json()); // Parse JSON request body
app.use(bodyParser.urlencoded({ extended: false })); // Parse URL-encoded bodies

// Cấu hình cookie parser với chuỗi bí mật từ config
app.use(cookieParser(config.cookieSecret));

app.use(logger); // Ghi nhật ký request

// API Routes - take precedence over static files
app.use(routes);

// Phục vụ các file tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, '../public')));

// Serving frontend for any route not matched by API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use(errorMiddleware.notFound);
app.use(errorMiddleware.errorHandler);

module.exports = app; 