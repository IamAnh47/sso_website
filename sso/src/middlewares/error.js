// Middleware bắt lỗi 404 - Not Found
exports.notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Middleware xử lý lỗi chung
exports.errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  console.error(`[ERROR] ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  
  res.status(statusCode).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
}; 