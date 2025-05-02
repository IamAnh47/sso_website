const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/StatisticsController');
const { authenticate, isAdmin, isStaff } = require('../middlewares/auth');

// Diagnostic route
router.get('/diagnostic', statisticsController.diagnosticDataCheck);

// Get overall statistics
router.get('/', authenticate, isAdmin, statisticsController.getOverallStatistics);

// Get booking trends data
router.get('/booking-trends', authenticate, isAdmin, statisticsController.getBookingTrends);

// Get room usage data
router.get('/room-usage', authenticate, isStaff, statisticsController.getRoomUsage);

// Get room type statistics
router.get('/room-type-stats', authenticate, isAdmin, statisticsController.getRoomTypeStats);

// Get department statistics
router.get('/departments', authenticate, isAdmin, statisticsController.getDepartmentStats);

// Get top users
router.get('/top-users', authenticate, isAdmin, statisticsController.getTopUsers);

// Get room usage statistics
router.get('/rooms', authenticate, isStaff, statisticsController.getRoomUsageStatistics);

// Get user booking statistics
router.get('/users', authenticate, isAdmin, statisticsController.getUsersStatistics);

// Get statistics for currently logged in user
router.get('/user', authenticate, statisticsController.getUserStatistics);

module.exports = router; 