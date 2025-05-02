const Room = require('../models/Room');
const Booking = require('../models/Booking');

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

// [ADMIN/STAFF] Tạo phòng mới
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

// [ADMIN/STAFF] Cập nhật thông tin phòng
exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { room_name, location, capacity, room_type, description, status, facilities } = req.body;
    
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
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

// [ADMIN/STAFF] Cập nhật trạng thái phòng
exports.updateRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`[updateRoomStatus] Đang cập nhật trạng thái phòng ${id} thành ${status}`);
    
    if (!['available', 'unavailable', 'maintenance'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const updatedRoom = await Room.updateStatus(id, status);
    
    if (status === 'maintenance') {
      try {
        const RoomActivity = require('../models/RoomActivity');
        const Notification = require('../models/Notification');
        
        console.log(`[updateRoomStatus] Đang chuyển phòng ${id} sang trạng thái bảo trì. Chuẩn bị hủy các booking`);
        
        const bookings = await Booking.getRoomBookings(id);
        console.log(`[updateRoomStatus] Tìm thấy ${bookings.length} booking cho phòng ${id}`);
        
        const activeBookings = bookings.filter(b => ['pending', 'confirmed'].includes(b.status));
        console.log(`[updateRoomStatus] Có ${activeBookings.length} booking cần hủy do bảo trì`);
        
        for (const booking of activeBookings) {
          console.log(`[updateRoomStatus] Đang hủy booking #${booking.id} do phòng bảo trì`);
          
          try {
            await Booking.updateStatus(booking.id, 'cancelled');
            console.log(`[updateRoomStatus] Đã cập nhật trạng thái booking #${booking.id} thành cancelled`);
            
            await RoomActivity.create({
              room_id: id,
              user_id: req.user.id,
              booking_id: booking.id,
              activity_type: 'cancel',
              description: `Booking #${booking.id} cancelled automatically due to room maintenance`
            });
            console.log(`[updateRoomStatus] Đã tạo room activity log cho booking #${booking.id}`);
            
            const location = room.location || 'không xác định';
            const roomName = room.room_name || `ID: ${room.id}`;
            
            const notification = await Notification.create({
              user_id: booking.user_id,
              title: '[ROOM] Đăng ký đặt phòng của bạn bị hủy',
              message: `Đặt phòng của bạn cho Phòng ${roomName} tòa ${location} vào ngày ${booking.booking_date} (${booking.start_time}-${booking.end_time}) đã bị hủy bởi hệ thống do phòng cần bảo trì.`
            });
            
            console.log(`[updateRoomStatus] Đã gửi thông báo hủy booking #${booking.id} thành công: ${JSON.stringify(notification)}`);
          } catch (bookingError) {
            console.error(`[updateRoomStatus] Lỗi khi xử lý hủy booking #${booking.id}: ${bookingError}`);
          }
        }
        
        console.log(`[updateRoomStatus] Đã hủy ${activeBookings.length} booking do phòng ${id} chuyển sang bảo trì`);
      } catch (error) {
        console.error(`[updateRoomStatus] Lỗi khi hủy bookings do bảo trì: ${error}`);
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

// [ADMIN/STAFF] Xoá phòng
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const bookings = await Booking.getRoomBookings(id);
    const activeBookings = bookings.filter(b => ['pending', 'confirmed', 'in_use'].includes(b.status));
    
    if (activeBookings.length > 0) {
      return res.status(400).json({ error: 'Cannot delete room with active bookings' });
    }
    
    await Room.delete(id);
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Error deleting room' });
  }
};

// Lấy danh sách các phòng trống theo time
exports.getAvailableRooms = async (req, res) => {
  try {
    const { date, start_time, end_time, capacity, room_type, location } = req.query;
    
    
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Date, start time, and end time are required' });
    }
    
    const availableRooms = await Room.getAvailableRooms(
      date,
      start_time,
      end_time,
      capacity ? parseInt(capacity) : 1,
      room_type,
      location
    );
    
    
    res.json(availableRooms);
  } catch (error) {
    console.error('Get available rooms error:', error);
    res.status(500).json({ error: 'Error fetching available rooms' });
  }
};

// Lấy số lượng phòng trong hệ thống
exports.getRoomCount = async (req, res) => {
  try {
    const count = await Room.getCount();
    return res.status(200).json({ count });
  } catch (error) {
    console.error('Error getting room count:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Lấy danh sách các tòa nhà
exports.getBuildingList = async (req, res) => {
  try {
    const { db } = require('../config/database');
    
    const buildingsResult = await new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT location FROM rooms ORDER BY location', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.location).filter(Boolean));
      });
    });
    
    return res.status(200).json(buildingsResult);
  } catch (error) {
    console.error('Error getting building list:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Lấy danh sách các tầng
exports.getFloorList = async (req, res) => {
  try {
    const { db } = require('../config/database');
    
    const floorsResult = await new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT floor FROM rooms ORDER BY floor', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.floor).filter(Boolean));
      });
    });
    
    return res.status(200).json(floorsResult);
  } catch (error) {
    console.error('Error getting floor list:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 