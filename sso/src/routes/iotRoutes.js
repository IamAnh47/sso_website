const express = require('express');
const router = express.Router();
const iotController = require('../controllers/iotController');
const { authenticate, isAdmin, isStaff } = require('../middlewares/auth');

// Lấy trạng thái của thiết bị IoT
router.get('/status', authenticate, iotController.getIoTStatus);

// Điều khiển thiết bị IoT
router.post('/control', authenticate, iotController.controlIoTDevice);

// [CHỈ ADMIN/STAFF] Tạo thiết bị IoT mới
router.post('/', authenticate, isStaff, iotController.createIoTDevice);

// [CHỈ ADMIN/STAFF] Cập nhật thông tin thiết bị IoT
router.put('/:id', authenticate, isStaff, iotController.updateIoTDevice);

// [CHỈ ADMIN/STAFF] Xoá thiết bị IoT
router.delete('/:id', authenticate, isStaff, iotController.deleteIoTDevice);

module.exports = router; 