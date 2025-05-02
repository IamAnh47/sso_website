const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification/notification.controller');
const auth = require('../middlewares/auth');

// Yêu cầu xác thực
router.use(auth.verifyToken);

// Chỉ cho phép admin và staff truy cập
router.use((req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
        next();
    } else {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
});

// API tạo thông báo
router.post('/', notificationController.createNotification);

// API tạo thông báo hàng loạt
router.post('/bulk', notificationController.createBulkNotifications);

// API lấy lịch sử thông báo
router.get('/history', notificationController.getNotificationHistory);

module.exports = router; 