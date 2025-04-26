const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/StatisticsController');
const { authenticate, isAdmin, isStaff } = require('../middlewares/auth');

// Diagnostic route - no auth required for testing
router.get('/diagnostic', statisticsController.diagnosticDataCheck);

// Get overall statistics (admin only)
router.get('/', authenticate, isAdmin, statisticsController.getOverallStatistics);

// Get booking trends data (admin only)
router.get('/booking-trends', authenticate, isAdmin, statisticsController.getBookingTrends);

// Get room usage data (admin and staff)
router.get('/room-usage', authenticate, isStaff, statisticsController.getRoomUsage);

// Get room type statistics (admin only) - Thay thế cho booking-purpose
router.get('/room-type-stats', authenticate, isAdmin, statisticsController.getRoomTypeStats);

// Get department statistics (admin only)
router.get('/departments', authenticate, isAdmin, statisticsController.getDepartmentStats);

// Get top users (admin only)
router.get('/top-users', authenticate, isAdmin, statisticsController.getTopUsers);

// Get room usage statistics (admin only)
router.get('/rooms', authenticate, isStaff, statisticsController.getRoomUsageStatistics);

// Get user booking statistics (admin only)
router.get('/users', authenticate, isAdmin, statisticsController.getUsersStatistics);

// Get statistics for currently logged in user
router.get('/user', authenticate, statisticsController.getUserStatistics);

module.exports = router; 