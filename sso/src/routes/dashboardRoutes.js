const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, isAdmin, isStaff } = require('../middlewares/auth');

// [CHỈ ADMIN/STAFF] Lấy dữ liệu tổng quan cho dashboard
router.get('/', authenticate, isStaff, dashboardController.getDashboardData);

// [CHỈ STUDENT] Lấy dữ liệu tổng quan cho student dashboard
router.get('/student', authenticate, dashboardController.getStudentDashboardData);

// [CHỈ ADMIN/STAFF] Lấy thống kê sử dụng phòng theo phân loại
router.get('/room-usage', authenticate, isStaff, dashboardController.getRoomUsageStats);

// [CHỈ ADMIN/STAFF] Lấy thống kê chi tiết cho một phòng cụ thể
router.get('/room/:id', authenticate, isStaff, dashboardController.getRoomDetailStats);

module.exports = router; 