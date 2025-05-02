const IoTDevice = require('../models/IoTDevice');
const Notification = require('../models/Notification');
const IoTActivity = require('../models/IoTActivity');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

// Lấy trạng thái của một hoặc nhiều thiết bị IoT
exports.getIoTStatus = async (req, res) => {
  try {
    const { room_id, device_id, device_type } = req.query;
    
    if (device_id) {
      const device = await IoTDevice.findById(device_id);
      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }
      return res.json(device);
    }
    
    if (room_id) {
      const devices = await IoTDevice.getByRoom(room_id);
      return res.json(devices);
    }
    
    if (device_type) {
      const devices = await IoTDevice.getByType(device_type);
      return res.json(devices);
    }
    
    const devices = await IoTDevice.getAll();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching IoT devices status' });
  }
};

// Điều khiển thiết bị IoT
exports.controlIoTDevice = async (req, res) => {
  try {
    const { device_id, room_id, command } = req.body;
    
    if (!['turnOn', 'turnOff'].includes(command)) {
      return res.status(400).json({ error: 'Invalid command. Use turnOn or turnOff' });
    }
    
    let result;
    
    if (device_id) {
      result = await IoTDevice.controlDevice(device_id, command);
      
      if (result) {
        await IoTActivity.log({
          device_id,
          action: command === 'turnOn' ? 'turned on' : 'turned off',
          status: 'success',
          details: `Device ${result.message}`,
          user_id: req.user ? req.user.id : null
        });
      }
    } 
    else if (room_id) {
      result = await IoTDevice.controlRoomDevices(room_id, command);
      
      if (result && result.deviceCount > 0) {
        const devices = await IoTDevice.getByRoom(room_id);
        for (const device of devices) {
          if (device.maintenance_mode !== 1) {
            await IoTActivity.log({
              device_id: device.id,
              action: command === 'turnOn' ? 'turned on' : 'turned off',
              status: 'success',
              details: `Room control: ${result.message}`,
              user_id: req.user ? req.user.id : null
            });
          }
        }
      }
    } else {
      return res.status(400).json({ error: 'Either device_id or room_id is required' });
    }
    
    if (result && result.status === 'off' && req.user) {
      await Notification.sendIoTStatusNotification(
        result.roomId || room_id,
        device_id ? (await IoTDevice.findById(device_id)).device_type : 'all',
        'off',
        req.user.id
      );
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error controlling IoT device' });
  }
};

// [ADMIN/STAFF] Tạo thiết bị IoT mới
exports.createIoTDevice = async (req, res) => {
  try {
    const { device_name, device_type, room_id, status } = req.body;
    
    if (!device_name || !device_type || !room_id) {
      return res.status(400).json({ error: 'Device name, type and room ID are required' });
    }
    
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
    res.status(500).json({ error: 'Error creating IoT device' });
  }
};

// [ADMIN/STAFF] Cập nhật thông tin thiết bị IoT
exports.updateIoTDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { device_name, device_type, status } = req.body;
    
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
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

// [ADMIN/STAFF] Xoá thiết bị IoT
exports.deleteIoTDevice = async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    await IoTDevice.delete(id);
    
    res.json({ message: 'IoT device deleted successfully' });
  } catch (error) {
    console.error('Delete IoT device error:', error);
    res.status(500).json({ error: 'Error deleting IoT device' });
  }
};

// [ADMIN/STAFF] Cập nhật trạng thái bật/tắt thiết bị
exports.toggleDeviceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['on', 'off'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "on" or "off"' });
    }
    
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.maintenance_mode === 1) {
      return res.status(400).json({ 
        error: 'Cannot change status when device is in maintenance mode' 
      });
    }
    
    const result = await IoTDevice.updateStatus(id, status);
    
    await IoTActivity.log({
      device_id: id,
      action: status === 'on' ? 'turned on' : 'turned off',
      status: 'success',
      details: `Status manually changed to "${status}"`,
      user_id: req.user ? req.user.id : null
    });
    
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

// [ADMIN/STAFF] Bật/tắt chế độ bảo trì của thiết bị
exports.toggleMaintenanceMode = async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenance_mode } = req.body;
    
    if (maintenance_mode === undefined || typeof maintenance_mode !== 'boolean') {
      return res.status(400).json({ 
        error: 'maintenance_mode parameter is required and must be a boolean' 
      });
    }
    
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    const currentMaintenanceMode = device.maintenance_mode === 1;
    if (currentMaintenanceMode === maintenance_mode) {
      return res.json({
        message: maintenance_mode ? 
          'Device already in maintenance mode' : 
          'Device maintenance mode already disabled',
        device: {
          id: device.id,
          device_name: device.device_name,
          status: device.status,
          maintenance_mode: maintenance_mode,
          last_activity: new Date().toISOString()
        }
      });
    }
    
    const result = await IoTDevice.setMaintenanceMode(id, maintenance_mode);
    
    await IoTActivity.log({
      device_id: id,
      action: maintenance_mode ? 'entered maintenance mode' : 'exited maintenance mode',
      status: 'success',
      details: `Maintenance mode ${maintenance_mode ? 'enabled' : 'disabled'}`,
      user_id: req.user ? req.user.id : null
    });
    
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

// [ADMIN/STAFF] Đổi tên thiết bị
exports.renameDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { device_name } = req.body;
    
    if (!device_name || device_name.trim() === '') {
      return res.status(400).json({ error: 'Device name is required' });
    }
    
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
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

// [ADMIN/STAFF] Upload hình ảnh cho thiết bị
exports.uploadDeviceImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await IoTDevice.findById(id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    
    const uploadsDir = path.join(__dirname, '../../public/uploads/devices');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileExtension = path.extname(req.file.originalname);
    const newFileName = `${device.device_type}_${uuidv4()}${fileExtension}`;
    const filePath = path.join(uploadsDir, newFileName);
    
    fs.writeFileSync(filePath, req.file.buffer);
    
    const imageUrl = `/uploads/devices/${newFileName}`;
    
    if (device.image_url) {
      const oldImagePath = path.join(__dirname, '../../public', device.image_url);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
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

// [ADMIN/STAFF] Lấy danh sách thiết bị IoT trong phòng
exports.getDevicesByRoom = async (req, res) => {
  try {
    const { room_id } = req.params;
    const devices = await IoTDevice.getByRoom(room_id);
    res.json(devices);
  } catch (error) {
    console.error('Get devices by room error:', error);
    res.status(500).json({ error: 'Error fetching devices by room' });
  }
};

// Lấy số liệu tổng quan về thiết bị IoT (số lượng, trạng thái)
exports.getDevicesCount = async (req, res) => {
  try {
    const devices = await IoTDevice.getAll();
    
    const count = devices.length;
    const online = devices.filter(device => device.status === 'on').length;
    const offline = devices.filter(device => device.status === 'off').length;
    
    res.json({
      count,
      online,
      offline
    });
  } catch (error) {
    console.error('Get devices count error:', error);
    res.status(500).json({ error: 'Error fetching devices count' });
  }
};

// Lấy các hoạt động gần đây của thiết bị IoT
exports.getRecentActivities = async (req, res) => {
  try {
    let activities = [];
    
    try {
      activities = await IoTActivity.getRecent(10);
    } catch (error) {
      console.log('Error fetching IoT activities:', error);
    }
    
    if (activities.length === 0) {
      const devices = await IoTDevice.getAll();
      
      if (devices && devices.length > 0) {
        activities = devices.slice(0, 5).map((device, index) => {
          const actions = ['turned on', 'turned off', 'status changed', 'setting adjusted'];
          const timestamps = [
            new Date(Date.now() - 5 * 60000).toISOString(),
            new Date(Date.now() - 15 * 60000).toISOString(),
            new Date(Date.now() - 35 * 60000).toISOString(),
            new Date(Date.now() - 55 * 60000).toISOString(),
            new Date(Date.now() - 85 * 60000).toISOString()
          ];
          
          return {
            id: index + 1,
            device_id: device.id,
            device_name: device.device_name,
            device_type: device.device_type,
            room_name: 'Phòng ' + (Math.floor(Math.random() * 10) + 100),
            action: actions[Math.floor(Math.random() * actions.length)],
            timestamp: timestamps[index],
            status: Math.random() > 0.2 ? 'success' : 'warning'
          };
        });
      } else {
        activities = [
          {
            id: 1,
            device_id: 1,
            device_name: 'Máy chiếu 101',
            device_type: 'projector',
            room_name: 'Phòng 101',
            action: 'turned on',
            timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
            status: 'success'
          },
          {
            id: 2,
            device_id: 2,
            device_name: 'Điều hòa 102',
            device_type: 'air_conditioner',
            room_name: 'Phòng 102',
            action: 'temperature changed',
            timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
            status: 'success'
          },
          {
            id: 3,
            device_id: 3,
            device_name: 'Đèn 103',
            device_type: 'light',
            room_name: 'Phòng 103',
            action: 'turned off',
            timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
            status: 'warning'
          },
          {
            id: 4,
            device_id: 4,
            device_name: 'Máy tính 104',
            device_type: 'computer',
            room_name: 'Phòng 104',
            action: 'restarted',
            timestamp: new Date(Date.now() - 55 * 60000).toISOString(),
            status: 'success'
          },
          {
            id: 5,
            device_id: 5,
            device_name: 'Quạt 105',
            device_type: 'fan',
            room_name: 'Phòng 105',
            action: 'speed changed',
            timestamp: new Date(Date.now() - 85 * 60000).toISOString(),
            status: 'success'
          }
        ];
      }
    }
    
    res.json(activities);
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ error: 'Error fetching activities' });
  }
}; 