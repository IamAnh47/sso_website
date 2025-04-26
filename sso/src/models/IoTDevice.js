const { db } = require('../config/database');

class IoTDevice {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM iot_devices WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static create(deviceData) {
    const { device_name, device_type, room_id, status = 'off' } = deviceData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO iot_devices (device_name, device_type, room_id, status) 
         VALUES (?, ?, ?, ?)`,
        [device_name, device_type, room_id, status],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              ...deviceData
            });
          }
        }
      );
    });
  }

  static update(id, deviceData) {
    const { device_name, device_type, status } = deviceData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE iot_devices SET device_name = ?, device_type = ?, status = ?,
         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [device_name, device_type, status, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...deviceData });
          }
        }
      );
    });
  }

  static updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE iot_devices SET status = ?, last_activity = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [status, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, status });
          }
        }
      );
    });
  }

  static getByRoom(roomId) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM iot_devices WHERE room_id = ?', [roomId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static getByType(deviceType) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM iot_devices WHERE device_type = ?', [deviceType], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static getAll() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT d.*, r.room_name, r.location 
        FROM iot_devices d
        JOIN rooms r ON d.room_id = r.id
      `, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM iot_devices WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, deleted: this.changes > 0 });
        }
      });
    });
  }

  // Simulated IoT interaction
  static async controlDevice(deviceId, command) {
    try {
      // Get current status
      const device = await this.findById(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }
      
      // Process command (on/off)
      let newStatus;
      if (command === 'turnOn') {
        newStatus = 'on';
      } else if (command === 'turnOff') {
        newStatus = 'off';
      } else {
        throw new Error('Invalid command');
      }
      
      // Update status in database
      const result = await this.updateStatus(deviceId, newStatus);
      
      // In a real system, would trigger actual IoT device operation here
      
      return {
        id: deviceId,
        status: newStatus,
        message: `Device ${device.device_name} is now ${newStatus}`
      };
    } catch (error) {
      throw error;
    }
  }

  // Simulate turning all devices on or off for a room
  static async controlRoomDevices(roomId, command) {
    try {
      // Get all devices for the room
      const devices = await this.getByRoom(roomId);
      if (devices.length === 0) {
        return { message: 'No devices found for this room' };
      }
      
      // Process command (on/off)
      let newStatus;
      if (command === 'turnOn') {
        newStatus = 'on';
      } else if (command === 'turnOff') {
        newStatus = 'off';
      } else {
        throw new Error('Invalid command');
      }
      
      // Update all devices
      const promises = devices.map(device => 
        this.updateStatus(device.id, newStatus)
      );
      
      await Promise.all(promises);
      
      return {
        roomId,
        status: newStatus,
        deviceCount: devices.length,
        message: `All devices in room ${roomId} are now ${newStatus}`
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = IoTDevice; 