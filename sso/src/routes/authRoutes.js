const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Logout
router.post('/logout', authenticate, authController.logout);

// Xác minh token và get inf người dùng
router.get('/verify', authenticate, authController.verify);

module.exports = router; 