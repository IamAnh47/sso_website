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
}));
// Bảo mật HTTP headers nhưng cho phép inline scripts
// Cấu hình CORS để cho phép cookies
app.use(cors({
  origin: true, 
  credentials: true 
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false })); 

// Cấu hình cookie parser với private key từ config
app.use(cookieParser(config.cookieSecret));

app.use(logger); // Ghi log request

// API Routes 
app.use(routes);

// Static filea
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use(errorMiddleware.notFound);
app.use(errorMiddleware.errorHandler);

module.exports = app; 