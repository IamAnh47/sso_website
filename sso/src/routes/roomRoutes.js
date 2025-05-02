const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticate, isAdmin, isStaff, isITStaffOrAdmin } = require('../middlewares/auth');

// Lấy danh sách tất cả các phòng
router.get('/', roomController.getAllRooms);

// Lấy danh sách các loại phòng
router.get('/types', roomController.getRoomTypes);

// Lấy danh sách các phòng trống theo thời gian
router.get('/available', roomController.getAvailableRooms);

// API endpoints để lấy data cho IT staff dashboard
router.get('/count', authenticate, isITStaffOrAdmin, roomController.getRoomCount);
router.get('/buildings', authenticate, roomController.getBuildingList);
router.get('/floors', authenticate, roomController.getFloorList);

// Lấy thông tin chi tiết của một phòng
router.get('/:id', roomController.getRoomById);

// [ADMIN/STAFF] Tạo phòng mới
router.post('/', authenticate, isStaff, roomController.createRoom);

// [ADMIN/STAFF] Cập nhật thông tin phòng
router.put('/:id', authenticate, isStaff, roomController.updateRoom);

// [ADMIN/STAFF] Cập nhật trạng thái phòng
router.put('/:id/status', authenticate, isStaff, roomController.updateRoomStatus);

// [ADMIN/STAFF] Xoá phòng
router.delete('/:id', authenticate, isStaff, roomController.deleteRoom);

module.exports = router; 