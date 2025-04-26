const Room = require('../models/Room');
const Booking = require('../models/Booking');

console.log('Loading RoomController.js');

// Lấy danh sách tất cả các phòng
exports.getAllRooms = async (req, res) => {
  try {
    const { status, room_type, location, capacity } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (room_type) filters.room_type = room_type;
    if (location) filters.location = location;
    if (capacity) filters.capacity = parseInt(capacity);
    
    const rooms = await Room.getAll(filters);
    res.json(rooms);
  } catch (error) {
    console.error('Get all rooms error:', error);
    res.status(500).json({ error: 'Error fetching rooms' });
  }
};

// Lấy danh sách loại phòng
exports.getRoomTypes = async (req, res) => {
  try {
    console.log('Inside getRoomTypes function');
    // Danh sách các loại phòng
    const roomTypes = [
      { id: 1, name: 'Phòng học', code: 'classroom' },
      { id: 2, name: 'Phòng họp', code: 'meeting_room' },
      { id: 3, name: 'Phòng thí nghiệm', code: 'lab' },
      { id: 4, name: 'Phòng máy tính', code: 'computer_lab' },
      { id: 5, name: 'Giảng đường', code: 'lecture_hall' },
      { id: 6, name: 'Không gian học tập', code: 'study_space' }
    ];
    
    res.json(roomTypes);
  } catch (error) {
    console.error('Get room types error:', error);
    res.status(500).json({ error: 'Error fetching room types' });
  }
};

// Lấy thông tin chi tiết của một phòng
exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findById(id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('Get room by id error:', error);
    res.status(500).json({ error: 'Error fetching room details' });
  }
};

// [CHỈ ADMIN/STAFF] Tạo phòng mới
exports.createRoom = async (req, res) => {
  try {
    const { room_name, location, capacity, room_type, description, status, facilities} = req.body;
    const newRoom = await Room.create({
      room_name,
      location,
      capacity,
      room_type,
      description,
      status: status || 'available',
      facilities: facilities ? JSON.stringify(facilities) : null
    });
    
    res.status(201).json({
      message: 'Room created successfully',
      room: newRoom
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Error creating room' });
  }
};

// [CHỈ ADMIN/STAFF] Cập nhật thông tin phòng
exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_name, location, capacity, room_type, description, status, facilities } = req.body;
    
    // Kiểm tra xem phòng có tồn tại không
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Cập nhật thông tin phòng
    const updatedRoom = await Room.update(id, {
      room_name: room_name || room.room_name,
      location: location || room.location,
      capacity: capacity || room.capacity,
      room_type: room_type || room.room_type,
      description: description !== undefined ? description : room.description,
      status: status || room.status,
      facilities: facilities ? JSON.stringify(facilities) : room.facilities
    });
    
    res.json({
      message: 'Room updated successfully',
      room: updatedRoom
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Error updating room' });
  }
};

// [CHỈ ADMIN/STAFF] Cập nhật trạng thái phòng
exports.updateRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`[updateRoomStatus] Đang cập nhật trạng thái phòng ${id} thành ${status}`);
    
    // Kiểm tra trạng thái hợp lệ
    if (!['available', 'unavailable', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Kiểm tra xem phòng có tồn tại không
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Cập nhật trạng thái phòng
    const updatedRoom = await Room.updateStatus(id, status);
    
    // Nếu chuyển sang trạng thái bảo trì, hủy các đặt phòng trong tương lai
    if (status === 'maintenance') {
      try {
        const RoomActivity = require('../models/RoomActivity');
        const Notification = require('../models/Notification');
        
        console.log(`[updateRoomStatus] Đang chuyển phòng ${id} sang trạng thái bảo trì. Chuẩn bị hủy các booking`);
        
        // Lấy các booking đang chờ hoặc đã xác nhận của phòng này
        const bookings = await Booking.getRoomBookings(id);
        console.log(`[updateRoomStatus] Tìm thấy ${bookings.length} booking cho phòng ${id}`);
        
        const activeBookings = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
        console.log(`[updateRoomStatus] Có ${activeBookings.length} booking cần hủy do bảo trì`);
        
        // Hủy từng booking và gửi thông báo
        for (const booking of activeBookings) {
          console.log(`[updateRoomStatus] Đang hủy booking #${booking.id} do phòng bảo trì`);
          
          try {
            // Cập nhật trạng thái booking thành cancelled
            await Booking.updateStatus(booking.id, 'cancelled');
            console.log(`[updateRoomStatus] Đã cập nhật trạng thái booking #${booking.id} thành cancelled`);
            
            // Ghi log hoạt động
            await RoomActivity.create({
              room_id: id,
              user_id: req.user.id,
              booking_id: booking.id,
              activity_type: 'cancel',
              description: `Booking #${booking.id} cancelled automatically due to room maintenance`
            });
            console.log(`[updateRoomStatus] Đã tạo room activity log cho booking #${booking.id}`);
            
            // Xử lý trường hợp room.location không tồn tại
            const location = room.location || 'không xác định';
            const roomName = room.room_name || `ID: ${room.id}`;
            
            // Gửi thông báo cho người dùng
            const notification = await Notification.create({
              user_id: booking.user_id,
              title: '[ROOM] Đăng ký đặt phòng của bạn bị hủy',
              message: `Đặt phòng của bạn cho Phòng ${roomName} tòa ${location} vào ngày ${booking.booking_date} (${booking.start_time}-${booking.end_time}) đã bị hủy bởi hệ thống do phòng cần bảo trì.`
            });
            
            console.log(`[updateRoomStatus] Đã gửi thông báo hủy booking #${booking.id} thành công: ${JSON.stringify(notification)}`);
          } catch (bookingError) {
            console.error(`[updateRoomStatus] Lỗi khi xử lý hủy booking #${booking.id}: ${bookingError}`);
            // Tiếp tục với booking tiếp theo, không dừng quá trình
          }
        }
        
        console.log(`[updateRoomStatus] Đã hủy ${activeBookings.length} booking do phòng ${id} chuyển sang bảo trì`);
      } catch (error) {
        console.error(`[updateRoomStatus] Lỗi khi hủy bookings do bảo trì: ${error}`);
        // Tiếp tục xử lý, không ảnh hưởng đến việc cập nhật trạng thái phòng
      }
    }
    
    res.json({
      message: 'Room status updated successfully',
      room: updatedRoom
    });
  } catch (error) {
    console.error('Update room status error:', error);
    res.status(500).json({ error: 'Error updating room status' });
  }
};

// [CHỈ ADMIN/STAFF] Xoá phòng
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra xem phòng có tồn tại không
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Kiểm tra xem phòng có đang được đặt hoặc sử dụng không
    const bookings = await Booking.getRoomBookings(id);
    const activeBookings = bookings.filter(b => ['pending', 'confirmed', 'in_use'].includes(b.status));
    
    if (activeBookings.length > 0) {
      return res.status(400).json({ error: 'Cannot delete room with active bookings' });
    }
    
    // Xoá phòng
    await Room.delete(id);
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Error deleting room' });
  }
};

// Lấy danh sách các phòng trống theo thời gian
exports.getAvailableRooms = async (req, res) => {
  try {
    const { date, start_time, end_time, capacity, room_type, location } = req.query;
    
    // console.log('getAvailableRooms query parameters:', req.query);
    
    // Kiểm tra dữ liệu đầu vào
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Date, start time, and end time are required' });
    }
    
    // Pass all filters directly to the model
    const availableRooms = await Room.getAvailableRooms(
      date,
      start_time,
      end_time,
      capacity ? parseInt(capacity) : 1,
      room_type,
      location
    );
    
    // console.log(`Found ${availableRooms.length} available rooms after filtering`);
    
    res.json(availableRooms);
  } catch (error) {
    console.error('Get available rooms error:', error);
    res.status(500).json({ error: 'Error fetching available rooms' });
  }
}; 