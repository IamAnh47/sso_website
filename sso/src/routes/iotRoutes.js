const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');
const { authenticate, isAdmin, isStaff } = require('../middlewares/auth');
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

// [CHỈ ADMIN/STAFF] Tạo thiết bị IoT mới
router.post('/', authenticate, isStaff, iotController.createIoTDevice);

// [CHỈ ADMIN/STAFF] Cập nhật thông tin thiết bị IoT
router.put('/:id', authenticate, isStaff, iotController.updateIoTDevice);

// [CHỈ ADMIN/STAFF] Xoá thiết bị IoT
router.delete('/:id', authenticate, isStaff, iotController.deleteIoTDevice);

// [CHỈ ADMIN/STAFF] Bật/tắt thiết bị (on/off)
router.put('/:id/status', authenticate, isStaff, iotController.toggleDeviceStatus);

// [CHỈ ADMIN/STAFF] Bật/tắt chế độ bảo trì
router.put('/:id/maintenance', authenticate, isStaff, iotController.toggleMaintenanceMode);

// [CHỈ ADMIN/STAFF] Đổi tên thiết bị
router.put('/:id/rename', authenticate, isStaff, iotController.renameDevice);

// [CHỈ ADMIN/STAFF] Upload hình ảnh cho thiết bị
router.post('/:id/image', authenticate, isStaff, upload.single('image'), iotController.uploadDeviceImage);

module.exports = router; 