const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification/notification.controller');
const auth = require('../middlewares/auth');

// Yêu cầu xác thực cho tất cả các routes
router.use(auth.verifyToken);

// Chỉ cho phép quản trị viên và nhân viên truy cập
router.use((req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
        next();
    } else {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
});

// API để tạo thông báo cho một người dùng
router.post('/', notificationController.createNotification);

// API để tạo thông báo hàng loạt hoặc cho tất cả người dùng
router.post('/bulk', notificationController.createBulkNotifications);

// API để lấy lịch sử thông báo
router.get('/history', notificationController.getNotificationHistory);

module.exports = router; 