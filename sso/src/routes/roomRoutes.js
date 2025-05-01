const express = require('express');
const router = express.Router();
const roomController = require('../controllers/FixedRoomController');
const { authenticate, isAdmin, isStaff, isITStaffOrAdmin } = require('../middlewares/auth');

// Lấy danh sách tất cả các phòng (công khai)
router.get('/', roomController.getAllRooms);

// Lấy danh sách các loại phòng (công khai)
router.get('/types', roomController.getRoomTypes);

// Lấy danh sách các phòng trống theo thời gian (công khai)
router.get('/available', roomController.getAvailableRooms);

// API endpoints để lấy dữ liệu cho IT staff dashboard
router.get('/count', authenticate, isITStaffOrAdmin, roomController.getRoomCount);
router.get('/buildings', authenticate, roomController.getBuildingList);
router.get('/floors', authenticate, roomController.getFloorList);

// Lấy thông tin chi tiết của một phòng (công khai)
router.get('/:id', roomController.getRoomById);

// [CHỈ ADMIN/STAFF] Tạo phòng mới
router.post('/', authenticate, isStaff, roomController.createRoom);

// [CHỈ ADMIN/STAFF] Cập nhật thông tin phòng
router.put('/:id', authenticate, isStaff, roomController.updateRoom);

// [CHỈ ADMIN/STAFF] Cập nhật trạng thái phòng
router.put('/:id/status', authenticate, isStaff, roomController.updateRoomStatus);

// [CHỈ ADMIN/STAFF] Xoá phòng
router.delete('/:id', authenticate, isStaff, roomController.deleteRoom);

// [CHỈ ADMIN/STAFF] Kiểm tra cấu trúc bảng (for debugging)
// router.get('/check-structure', authenticate, isAdmin, roomController.checkTableStructure);

module.exports = router; 