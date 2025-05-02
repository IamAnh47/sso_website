const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, isAdmin, isStaff } = require('../middlewares/auth');

// Lấy danh sách đặt phòng
router.get('/', authenticate, bookingController.getBookings);

// Get bookings for current user /:id route
router.get('/user', authenticate, bookingController.getUserBookings);

// Get booking by ID
router.get('/:id', authenticate, bookingController.getBookingById);

// Create new booking
router.post('/', authenticate, bookingController.createBooking);

// Update booking info
router.put('/:id', authenticate, bookingController.updateBooking);

// Cancel booking
router.delete('/:id', authenticate, bookingController.cancelBooking);

// Check-in
router.put('/:id/checkin', authenticate, bookingController.checkIn);

// Check-out
router.put('/:id/checkout', authenticate, bookingController.checkOut);

// Confirm a booking
router.post('/:id/confirm', authenticate, bookingController.confirmBooking);

// Perform check-in
router.post('/:id/checkin', authenticate, bookingController.checkInBooking);

// Perform check-out
router.post('/:id/checkout', authenticate, bookingController.checkOutBooking);

// Cancel a booking
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);

module.exports = router; 