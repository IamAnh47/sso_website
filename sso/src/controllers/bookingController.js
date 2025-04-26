const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomActivity = require('../models/RoomActivity');
const IoTDevice = require('../models/IoTDevice');
const Notification = require('../models/Notification');

// Lấy danh sách đặt phòng theo filter
exports.getBookings = async (req, res) => {
  try {
    const { date, room_type, status } = req.query;
    const filters = {};
    
    if (date) filters.date = date;
    if (room_type) filters.room_type = room_type;
    if (status) filters.status = status;
    
    // Nếu không phải admin hoặc staff, chỉ lấy booking của user hiện tại
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      const bookings = await Booking.getUserBookings(req.user.id, status);
      return res.json(bookings);
    }
    
    // Admin và staff có thể xem tất cả booking
    const bookings = await Booking.getAll(filters);
    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Error fetching bookings' });
  }
};

// Tạo đặt phòng mới
exports.createBooking = async (req, res) => {
  try {
    const { room_id, booking_date, start_time, end_time, purpose, participants } = req.body;
    const user_id = req.user.id;
    
    // Kiểm tra xem phòng có tồn tại không
    const room = await Room.findById(room_id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Kiểm tra xem phòng có trống vào thời gian đặt không
    const availableRooms = await Room.getAvailableRooms(booking_date, start_time, end_time, participants);
    const isRoomAvailable = availableRooms.some(r => r.id === parseInt(room_id));
    
    if (!isRoomAvailable) {
      return res.status(400).json({ error: 'Room is not available at the selected time' });
    }
    
    // Tạo đặt phòng mới
    const newBooking = await Booking.create({
      user_id,
      room_id,
      booking_date,
      start_time,
      end_time,
      purpose,
      participants: participants || 1
    });
    
    res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Error creating booking' });
  }
};

// Cập nhật thông tin đặt phòng
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { booking_date, start_time, end_time, status, purpose, participants } = req.body;
    
    // Kiểm tra xem booking có tồn tại không
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Kiểm tra quyền: chỉ admin, staff hoặc chủ booking có thể cập nhật
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this booking' });
    }
    
    // Nếu thay đổi ngày hoặc thời gian, kiểm tra xem phòng có còn trống không
    if (booking_date || start_time || end_time) {
      const newDate = booking_date || booking.booking_date;
      const newStartTime = start_time || booking.start_time;
      const newEndTime = end_time || booking.end_time;
      
      const availableRooms = await Room.getAvailableRooms(newDate, newStartTime, newEndTime, participants);
      const isRoomAvailable = availableRooms.some(r => r.id === booking.room_id);
      
      if (!isRoomAvailable) {
        return res.status(400).json({ error: 'Room is not available at the selected time' });
      }
    }
    
    // Cập nhật booking
    const updatedBooking = await Booking.update(id, {
      booking_date: booking_date || booking.booking_date,
      start_time: start_time || booking.start_time,
      end_time: end_time || booking.end_time,
      status: status || booking.status,
      purpose: purpose || booking.purpose,
      participants: participants || booking.participants
    });
    
    res.json({
      message: 'Booking updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Error updating booking' });
  }
};

// Huỷ đặt phòng
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    
    console.log(`[cancelBooking] Bắt đầu hủy booking #${bookingId} bởi user ${userId}`);
    
    // Get booking
    const booking = await Booking.findById(bookingId);
    
    // Check if booking exists
    if (!booking) {
      console.log(`[cancelBooking] Không tìm thấy booking #${bookingId}`);
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    console.log(`[cancelBooking] Thông tin booking: ${JSON.stringify(booking)}`);
    
    // Check if booking belongs to user or user is admin/staff
    if (booking.user_id !== userId && req.user.role !== 'admin' && req.user.role !== 'staff') {
      console.log(`[cancelBooking] User ${userId} không có quyền hủy booking #${bookingId} của user ${booking.user_id}`);
      return res.status(403).json({ error: 'Unauthorized: This booking belongs to another user' });
    }
    
    // Check if booking can be cancelled (only pending or confirmed bookings can be cancelled)
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      console.log(`[cancelBooking] Không thể hủy booking với trạng thái ${booking.status}`);
      return res.status(400).json({ error: 'Only pending or confirmed bookings can be cancelled' });
    }
    
    // Update booking status to cancelled
    await Booking.updateStatus(bookingId, 'cancelled');
    console.log(`[cancelBooking] Đã cập nhật trạng thái booking #${bookingId} thành cancelled`);
    
    // Log room activity
    await RoomActivity.create({
      room_id: booking.room_id,
      user_id: userId,
      booking_id: bookingId,
      activity_type: 'cancel',
      description: `Booking #${bookingId} cancelled by ${req.user.role === 'admin' || req.user.role === 'staff' ? 'staff' : 'user'}`
    });
    console.log(`[cancelBooking] Đã tạo room activity log cho booking #${bookingId}`);
    
    // Gửi thông báo về việc hủy đặt phòng
    const cancelledBy = req.user.role === 'admin' || req.user.role === 'staff' ? 'ban quản lý' : 'bạn';
    console.log(`[cancelBooking] Chuẩn bị gửi thông báo đến user ${booking.user_id} về việc hủy booking bởi ${cancelledBy}`);
    
    // Xử lý trường hợp booking.location không tồn tại
    const location = booking.location || 'không xác định';
    const roomName = booking.room_name || `ID: ${booking.room_id}`;
    
    try {
      const notification = await Notification.create({
        user_id: booking.user_id,
        title: '[ROOM] Đăng ký đặt phòng của bạn bị hủy',
        message: `Đặt phòng của bạn cho Phòng ${roomName} tòa ${location} vào ngày ${booking.booking_date} (${booking.start_time}-${booking.end_time}) đã bị hủy bởi ${cancelledBy}.`
      });
      
      console.log(`[cancelBooking] Đã gửi thông báo hủy booking thành công: ${JSON.stringify(notification)}`);
    } catch (notifError) {
      console.error(`[cancelBooking] Lỗi khi gửi thông báo hủy booking: ${notifError}`);
      // Tiếp tục xử lý, không ảnh hưởng đến việc hủy booking
    }
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error(`[cancelBooking] Lỗi khi hủy booking: ${error}`);
    res.status(500).json({ error: 'Error cancelling booking' });
  }
};

// Check-in vào phòng
exports.checkIn = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra xem booking có tồn tại không
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Kiểm tra quyền: chỉ chủ booking có thể check-in
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to check in for this booking' });
    }
    
    // Kiểm tra nếu booking không ở trạng thái pending hoặc confirmed
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return res.status(400).json({ error: `Cannot check in for booking with status: ${booking.status}` });
    }
    
    // Cập nhật trạng thái và ghi nhận hoạt động
    await Booking.checkIn(id);
    await RoomActivity.recordCheckIn(id, req.user.id);
    
    // Bật thiết bị IoT trong phòng (giả lập)
    await IoTDevice.controlRoomDevices(booking.room_id, 'turnOn');
    
    res.json({ message: 'Check-in successful' });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Error during check-in' });
  }
};

// Check-out khỏi phòng
exports.checkOut = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra xem booking có tồn tại không
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Kiểm tra quyền: chỉ chủ booking có thể check-out
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to check out for this booking' });
    }
    
    // Kiểm tra nếu booking không ở trạng thái in_use
    if (booking.status !== 'in_use') {
      return res.status(400).json({ error: 'Cannot check out for booking that is not in use' });
    }
    
    // Cập nhật trạng thái và ghi nhận hoạt động
    await Booking.checkOut(id);
    await RoomActivity.recordCheckOut(id, req.user.id);
    
    // Tắt thiết bị IoT trong phòng (giả lập)
    await IoTDevice.controlRoomDevices(booking.room_id, 'turnOff');
    
    // Gửi thông báo cảm ơn
    await Notification.create({
      user_id: req.user.id,
      title: 'Thank you for using our space',
      message: `Your booking for room ${booking.room_name} has been completed. We hope you had a productive time!`
    });
    
    res.json({ message: 'Check-out successful' });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Error during check-out' });
  }
};

/**
 * Get bookings for current user
 */
exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status ? req.query.status.split(',') : null;
    
    // Get user's bookings
    const bookings = await Booking.getUserBookings(userId, status);
    
    res.json(bookings);
  } catch (error) {
    console.error('Error getting user bookings:', error);
    res.status(500).json({ error: 'Error retrieving bookings' });
  }
};

/**
 * Check in to a booking
 */
exports.checkInBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    
    // Get booking
    const booking = await Booking.findById(bookingId);
    
    // Check if booking exists
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check if booking belongs to user
    if (booking.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized: This booking belongs to another user' });
    }
    
    // Check if booking is in confirmed status
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Booking must be confirmed to check in' });
    }
    
    // Update booking status to in_use
    await Booking.updateStatus(bookingId, 'in_use');
    
    // Log room activity
    await RoomActivity.create({
      room_id: booking.room_id,
      user_id: userId,
      booking_id: bookingId,
      activity_type: 'check_in',
      description: `User checked in to booking #${bookingId}`
    });
    
    res.json({ message: 'Check-in successful' });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ error: 'Error processing check-in' });
  }
};

/**
 * Check out from a booking
 */
exports.checkOutBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.id;
    
    // Get booking
    const booking = await Booking.findById(bookingId);
    
    // Check if booking exists
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check if booking belongs to user
    if (booking.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized: This booking belongs to another user' });
    }
    
    // Check if booking is in in_use status
    if (booking.status !== 'in_use') {
      return res.status(400).json({ error: 'Booking must be in use to check out' });
    }
    
    // Update booking status to completed
    await Booking.updateStatus(bookingId, 'completed');
    
    // Log room activity
    await RoomActivity.create({
      room_id: booking.room_id,
      user_id: userId,
      booking_id: bookingId,
      activity_type: 'check_out',
      description: `User checked out from booking #${bookingId}`
    });
    
    res.json({ message: 'Check-out successful' });
  } catch (error) {
    console.error('Error checking out:', error);
    res.status(500).json({ error: 'Error processing check-out' });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get booking details
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Only admin, staff or the owner of the booking can view details
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to view this booking' });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ error: 'Error retrieving booking details' });
  }
};

// Confirm a booking
exports.confirmBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    
    // Only admin or staff can confirm bookings
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Only administrators or staff can confirm bookings' });
    }
    
    // Get booking
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check if booking can be confirmed (only pending bookings can be confirmed)
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending bookings can be confirmed' });
    }
    
    // Update booking status to confirmed
    await Booking.updateStatus(bookingId, 'confirmed');
    
    // Log room activity
    await RoomActivity.create({
      room_id: booking.room_id,
      user_id: req.user.id,
      booking_id: bookingId,
      activity_type: 'confirm',
      description: `Booking #${bookingId} confirmed by ${req.user.role}`
    });
    
    // Send notification to user
    await Notification.create({
      user_id: booking.user_id,
      title: '[ROOM] Xác nhận đặt phòng thành công',
      message: `Đặt phòng của bạn cho Phòng ${booking.room_name} tòa ${booking.location} vào ngày ${booking.booking_date} (${booking.start_time}-${booking.end_time}) đã được xác nhận.`
    });
    
    res.json({ message: 'Booking confirmed successfully' });
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: 'Error confirming booking' });
  }
}; 