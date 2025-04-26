const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

// Đăng ký người dùng mới
router.post('/register', authController.register);

// Đăng nhập
router.post('/login', authController.login);

// Đăng xuất (yêu cầu xác thực)
router.post('/logout', authenticate, authController.logout);

// Xác minh token và lấy thông tin người dùng
router.get('/verify', authenticate, authController.verify);

module.exports = router; 