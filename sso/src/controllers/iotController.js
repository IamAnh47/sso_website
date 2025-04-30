const IoTDevice = require('../models/IoTDevice');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Lấy trạng thái của một hoặc nhiều thiết bị IoT
exports.getIoTStatus = async (req, res) => {
  try {
    const { room_id, device_id, device_type } = req.query;
    
    // Nếu có device_id, trả về thông tin của thiết bị cụ thể
    if (device_id) {
      const device = await IoTDevice.findById(device_id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      return res.json(device);
    }
    
    // Nếu có room_id, trả về tất cả thiết bị trong phòng
    if (room_id) {
      const devices = await IoTDevice.getByRoom(room_id);
      return res.json(devices);
    }
    
    // Nếu có device_type, trả về tất cả thiết bị theo loại
    if (device_type) {
      const devices = await IoTDevice.getByType(device_type);
      return res.json(devices);
    }
    
    // Mặc định trả về tất cả thiết bị
    const devices = await IoTDevice.getAll();
    res.json(devices);
  } catch (error) {
    console.error('Get IoT status error:', error);
    res.status(500).json({ error: 'Error fetching IoT devices status' });
  }
};

// Điều khiển thiết bị IoT
exports.controlIoTDevice = async (req, res) => {
  try {
    const { device_id, room_id, command } = req.body;
    
    // Kiểm tra lệnh hợp lệ
    if (!['turnOn', 'turnOff'].includes(command)) {
      return res.status(400).json({ error: 'Invalid command. Use turnOn or turnOff' });
    }
    
    let result;
    
    // Điều khiển một thiết bị cụ thể
    if (device_id) {
      result = await IoTDevice.controlDevice(device_id, command);
    } 
    // Điều khiển tất cả thiết bị trong phòng
    else if (room_id) {
      result = await IoTDevice.controlRoomDevices(room_id, command);
    } else {
      return res.status(400).json({ error: 'Either device_id or room_id is required' });
    }
    
    // Gửi thông báo nếu cần
    if (result && result.status === 'off' && req.user) {
      // Giả lập việc gửi thông báo khi thiết bị tự động tắt
      await Notification.sendIoTStatusNotification(
        result.roomId || room_id,
        device_id ? (await IoTDevice.findById(device_id)).device_type : 'all',
        'off',
        req.user.id
      );
    }
    
    res.json(result);
  } catch (error) {
    console.error('Control IoT device error:', error);
    res.status(500).json({ error: 'Error controlling IoT device' });
  }
};

// [CHỈ ADMIN/STAFF] Tạo thiết bị IoT mới
exports.createIoTDevice = async (req, res) => {
  try {
    const { device_name, device_type, room_id, status } = req.body;
    
    // Kiểm tra dữ liệu đầu vào
    if (!device_name || !device_type || !room_id) {
      return res.status(400).json({ error: 'Device name, type and room ID are required' });
    }
    
    // Tạo thiết bị mới
    const newDevice = await IoTDevice.create({
      device_name,
      device_type,
      room_id,
      status: status || 'off'
    });
    
    res.status(201).json({
      message: 'IoT device created successfully',
      device: newDevice
    });
  } catch (error) {
    console.error('Create IoT device error:', error);
    res.status(500).json({ error: 'Error creating IoT device' });
  }
};

// [CHỈ ADMIN/STAFF] Cập nhật thông tin thiết bị IoT
exports.updateIoTDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { device_name, device_type, status } = req.body;
    
    // Kiểm tra xem thiết bị có tồn tại không
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Cập nhật thông tin thiết bị
    const updatedDevice = await IoTDevice.update(id, {
      device_name: device_name || device.device_name,
      device_type: device_type || device.device_type,
      status: status || device.status
    });
    
    res.json({
      message: 'IoT device updated successfully',
      device: updatedDevice
    });
  } catch (error) {
    console.error('Update IoT device error:', error);
    res.status(500).json({ error: 'Error updating IoT device' });
  }
};

// [CHỈ ADMIN/STAFF] Xoá thiết bị IoT
exports.deleteIoTDevice = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra xem thiết bị có tồn tại không
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Xoá thiết bị
    await IoTDevice.delete(id);
    
    res.json({ message: 'IoT device deleted successfully' });
  } catch (error) {
    console.error('Delete IoT device error:', error);
    res.status(500).json({ error: 'Error deleting IoT device' });
  }
};

// [CHỈ ADMIN/STAFF] Cập nhật trạng thái bật/tắt thiết bị
exports.toggleDeviceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!status || !['on', 'off'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "on" or "off"' });
    }
    
    // Kiểm tra thiết bị
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Kiểm tra nếu thiết bị đang trong chế độ bảo trì
    if (device.maintenance_mode === 1) {
      return res.status(400).json({ 
        error: 'Cannot change status when device is in maintenance mode' 
      });
    }
    
    // Cập nhật trạng thái
    const result = await IoTDevice.updateStatus(id, status);
    
    res.json({
      message: `Device status updated to ${status}`,
      device: {
        id: device.id,
        device_name: device.device_name,
        status: status,
        last_activity: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Toggle device status error:', error);
    res.status(500).json({ error: 'Error updating device status' });
  }
};

// [CHỈ ADMIN/STAFF] Bật/tắt chế độ bảo trì của thiết bị
exports.toggleMaintenanceMode = async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenance_mode } = req.body;
    
    // Validate input
    if (maintenance_mode === undefined || typeof maintenance_mode !== 'boolean') {
      return res.status(400).json({ 
        error: 'maintenance_mode parameter is required and must be a boolean' 
      });
    }
    
    // Kiểm tra thiết bị
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Cập nhật chế độ bảo trì
    const result = await IoTDevice.setMaintenanceMode(id, maintenance_mode);
    
    res.json({
      message: maintenance_mode ? 
        'Device set to maintenance mode' : 
        'Device maintenance mode disabled',
      device: {
        id: device.id,
        device_name: device.device_name,
        status: result.status,
        maintenance_mode: maintenance_mode,
        last_activity: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Toggle maintenance mode error:', error);
    res.status(500).json({ error: 'Error updating maintenance mode' });
  }
};

// [CHỈ ADMIN/STAFF] Đổi tên thiết bị
exports.renameDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { device_name } = req.body;
    
    // Validate input
    if (!device_name || device_name.trim() === '') {
      return res.status(400).json({ error: 'Device name is required' });
    }
    
    // Kiểm tra thiết bị
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Cập nhật tên thiết bị
    const result = await IoTDevice.update(id, { device_name });
    
    res.json({
      message: 'Device renamed successfully',
      device: {
        id: device.id,
        device_name: device_name,
        device_type: device.device_type,
        status: device.status
      }
    });
  } catch (error) {
    console.error('Rename device error:', error);
    res.status(500).json({ error: 'Error renaming device' });
  }
};

// [CHỈ ADMIN/STAFF] Upload hình ảnh cho thiết bị
exports.uploadDeviceImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra thiết bị
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    // Kiểm tra file đã được upload chưa
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    
    // Tạo thư mục nếu chưa tồn tại
    const uploadsDir = path.join(__dirname, '../../public/uploads/devices');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Tạo tên file mới với UUID để tránh trùng lặp
    const fileExtension = path.extname(req.file.originalname);
    const newFileName = `${device.device_type}_${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadsDir, newFileName);
    
    // Ghi file vào thư mục uploads
    fs.writeFileSync(filePath, req.file.buffer);
    
    // URL để lưu vào database
    const imageUrl = `/uploads/devices/${newFileName}`;
    
    // Xóa ảnh cũ nếu có
    if (device.image_url) {
      const oldImagePath = path.join(__dirname, '../../public', device.image_url);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    // Cập nhật URL ảnh trong database
    await IoTDevice.updateImage(id, imageUrl);
    
    res.json({
      message: 'Device image uploaded successfully',
      device: {
        id: device.id,
        device_name: device.device_name,
        image_url: imageUrl
      }
    });
  } catch (error) {
    console.error('Upload device image error:', error);
    res.status(500).json({ error: 'Error uploading device image' });
  }
};

// [CHỈ ADMIN/STAFF] Lấy danh sách thiết bị IoT trong phòng
exports.getDevicesByRoom = async (req, res) => {
  try {
    const { room_id } = req.params;
    
    // Lấy danh sách thiết bị
    const devices = await IoTDevice.getByRoom(room_id);
    
    res.json(devices);
  } catch (error) {
    console.error('Get devices by room error:', error);
    res.status(500).json({ error: 'Error fetching devices' });
  }
}; 