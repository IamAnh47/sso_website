const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const bookingRoutes = require('./bookingRoutes');
const roomRoutes = require('./roomRoutes');
const iotRoutes = require('./iotRoutes');
const notificationRoutes = require('./notificationRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const statisticsRoutes = require('./statisticsRoutes');
const { authenticate, isAdmin } = require('../middlewares/auth');
const path = require('path');

// API routes
router.use('/api/auth', authRoutes);
router.use('/api/users', userRoutes);
router.use('/api/bookings', bookingRoutes);
router.use('/api/rooms', roomRoutes);
router.use('/api/iot', iotRoutes);
router.use('/api/notifications', notificationRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/statistics', statisticsRoutes);

// Admin dashboard route
router.get('/admin', authenticate, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin-user-management.html'));
});

// Route for the main dashboard
router.get('/dashboard', authenticate, (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
});

// Route mặc định
router.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Smart Study Space API',
    version: '1.0.0'
  });
});

module.exports = router; 