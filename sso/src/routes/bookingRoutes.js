const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, isAdmin, isStaff } = require('../middlewares/auth');

// Lấy danh sách đặt phòng
router.get('/', authenticate, bookingController.getBookings);

// Get bookings for current user - must come before /:id route
router.get('/user', authenticate, bookingController.getUserBookings);

// Lấy thông tin đặt phòng theo ID
router.get('/:id', authenticate, bookingController.getBookingById);

// Tạo đặt phòng mới
router.post('/', authenticate, bookingController.createBooking);

// Cập nhật thông tin đặt phòng
router.put('/:id', authenticate, bookingController.updateBooking);

// Huỷ đặt phòng
router.delete('/:id', authenticate, bookingController.cancelBooking);

// Check-in vào phòng
router.put('/:id/checkin', authenticate, bookingController.checkIn);

// Check-out khỏi phòng
router.put('/:id/checkout', authenticate, bookingController.checkOut);

// Confirm a booking (new route)
router.post('/:id/confirm', authenticate, bookingController.confirmBooking);

// Perform check-in for a booking
router.post('/:id/checkin', authenticate, bookingController.checkInBooking);

// Perform check-out for a booking
router.post('/:id/checkout', authenticate, bookingController.checkOutBooking);

// Cancel a booking
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);

module.exports = router; 