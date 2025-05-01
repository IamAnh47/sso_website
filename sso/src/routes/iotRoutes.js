const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');
const { authenticate, isAdmin, isStaff, isITStaffOrAdmin } = require('../middlewares/auth');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB size limit
});

// Lấy danh sách thiết bị IoT
router.get('/', authenticate, iotController.getIoTStatus);

// Lấy trạng thái của thiết bị IoT
router.get('/status', authenticate, iotController.getIoTStatus);

// Lấy thiết bị theo phòng
router.get('/room/:room_id', authenticate, iotController.getDevicesByRoom);

// Điều khiển thiết bị IoT (lệnh turnOn/turnOff)
router.post('/control', authenticate, iotController.controlIoTDevice);

// Lấy số liệu tổng quan về thiết bị IoT (số lượng, trạng thái)
router.get('/devices/count', authenticate, isITStaffOrAdmin, iotController.getDevicesCount);

// Lấy các hoạt động gần đây của thiết bị IoT
router.get('/devices/activities', authenticate, isITStaffOrAdmin, iotController.getRecentActivities);

// [ADMIN/IT STAFF] Tạo thiết bị IoT mới
router.post('/', authenticate, isITStaffOrAdmin, iotController.createIoTDevice);

// [ADMIN/IT STAFF] Cập nhật thông tin thiết bị IoT
router.put('/:id', authenticate, isITStaffOrAdmin, iotController.updateIoTDevice);

// [ADMIN/IT STAFF] Xoá thiết bị IoT
router.delete('/:id', authenticate, isITStaffOrAdmin, iotController.deleteIoTDevice);

// [ADMIN/IT STAFF] Bật/tắt thiết bị (on/off)
router.put('/:id/status', authenticate, isITStaffOrAdmin, iotController.toggleDeviceStatus);

// [ADMIN/IT STAFF] Bật/tắt chế độ bảo trì
router.put('/:id/maintenance', authenticate, isITStaffOrAdmin, iotController.toggleMaintenanceMode);

// [ADMIN/IT STAFF] Đổi tên thiết bị
router.put('/:id/rename', authenticate, isITStaffOrAdmin, iotController.renameDevice);

// [ADMIN/IT STAFF] Upload hình ảnh cho thiết bị
router.post('/:id/image', authenticate, isITStaffOrAdmin, upload.single('image'), iotController.uploadDeviceImage);

module.exports = router; 