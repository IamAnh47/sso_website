const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, isAdmin, isStaff } = require('../middlewares/auth');

// [ADMIN/STAFF] Get dữ liệu for dashboard
router.get('/', authenticate, isStaff, dashboardController.getDashboardData);

// [STUDENT] Get dữ liệu for student dashboard
router.get('/student', authenticate, dashboardController.getStudentDashboardData);

// [ADMIN/STAFF] Get usage stats phòng theo phân loại
router.get('/room-usage', authenticate, isStaff, dashboardController.getRoomUsageStats);

// [ADMIN/STAFF] Get thống kê detail cho một phòng
router.get('/room/:id', authenticate, isStaff, dashboardController.getRoomDetailStats);

module.exports = router; 