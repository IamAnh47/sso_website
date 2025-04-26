const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

// Middleware để đảm bảo tất cả các routes yêu cầu đăng nhập
router.use(authenticate);

// Lấy tất cả thông báo của người dùng hiện tại
router.get('/', notificationController.getUserNotifications);

// Lấy thông báo theo loại (all, unread, system, booking)
router.get('/type/:type', notificationController.getNotificationsByType);

// Lấy số lượng thông báo chưa đọc
router.get('/unread/count', notificationController.getUnreadCount);

// Lấy lịch sử thông báo đã gửi (chỉ dành cho admin và staff)
router.get('/history', notificationController.getNotificationHistory);

// ENDPOINT ĐẶC BIỆT: Đánh dấu một thông báo là đã đọc (dành cho sinh viên)
router.put('/student-mark-read/:id', notificationController.studentMarkAsRead);

// Đánh dấu tất cả thông báo đã đọc
router.post('/mark-all-read', notificationController.markAllAsRead);

// SPECIAL ROUTE - Đánh dấu tất cả thông báo đã đọc (không kiểm tra quyền)
router.post('/force-mark-all-read', notificationController.forceMarkAllAsRead);

// SPECIAL ROUTE - Đánh dấu thông báo đã đọc (không kiểm tra quyền)
router.put('/force-read/:id', notificationController.forceMarkAsRead);

// SPECIAL ROUTE - Xóa thông báo (không kiểm tra quyền)
router.delete('/force-delete/:id', notificationController.forceDeleteNotification);

// Đánh dấu thông báo đã đọc
router.put('/:id/read', notificationController.markAsRead);

// Xóa thông báo
router.delete('/:id', notificationController.deleteNotification);

// Gửi thông báo đến một người dùng (chỉ dành cho admin và staff)
// POST /api/notifications
router.post('/', notificationController.sendNotification);

// Gửi thông báo đến nhiều người dùng (chỉ dành cho admin và staff)
// POST /api/notifications/bulk
router.post('/bulk', notificationController.sendBulkNotifications);

// Legacy endpoints - giữ lại để đảm bảo tương thích ngược
router.post('/send', notificationController.sendNotification);
router.post('/send-bulk', notificationController.sendBulkNotifications);

module.exports = router; 