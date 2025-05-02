const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

// Middleware để đảm bảo tất cả các routes request login
router.use(authenticate);

// Lấy all notifications
router.get('/', notificationController.getUserNotifications);

// Lấy thông báo theo type
router.get('/type/:type', notificationController.getNotificationsByType);

// Lấy count thông báo chưa đọc
router.get('/unread/count', notificationController.getUnreadCount);

// Lấy lịch sử thông báo đã send (admin và staff)
router.get('/history', notificationController.getNotificationHistory);

// Đánh dấu một thông báo là đã đọc
router.put('/student-mark-read/:id', notificationController.studentMarkAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.post('/mark-all-read', notificationController.markAllAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.post('/force-mark-all-read', notificationController.forceMarkAllAsRead);

// Đánh dấu thông báo đã đọc
router.put('/force-read/:id', notificationController.forceMarkAsRead);

// Xóa thông báo
router.delete('/force-delete/:id', notificationController.forceDeleteNotification);

// Đánh dấu thông báo đã đọc
router.put('/:id/read', notificationController.markAsRead);

// Xóa thông báo
router.delete('/:id', notificationController.deleteNotification);

// Gửi thông báo đến một người dùng 
// POST /api/notifications
router.post('/', notificationController.sendNotification);

// Gửi thông báo đến nhiều người dùng)
// POST /api/notifications/bulk
router.post('/bulk', notificationController.sendBulkNotifications);

// Legacy endpoints
router.post('/send', notificationController.sendNotification);
router.post('/send-bulk', notificationController.sendBulkNotifications);

module.exports = router; 