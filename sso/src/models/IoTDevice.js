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
    const { device_name, device_type, room_id, status = 'off', image_url = null } = deviceData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO iot_devices (device_name, device_type, room_id, status, image_url) 
         VALUES (?, ?, ?, ?, ?)`,
        [device_name, device_type, room_id, status, image_url],
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
    const { device_name, device_type, status, image_url, maintenance_mode } = deviceData;
    
    let query = `UPDATE iot_devices SET `;
    const params = [];
    
    // Build the dynamic update query
    if (device_name !== undefined) {
      query += `device_name = ?, `;
      params.push(device_name);
    }
    
    if (device_type !== undefined) {
      query += `device_type = ?, `;
      params.push(device_type);
    }
    
    if (status !== undefined) {
      query += `status = ?, `;
      params.push(status);
    }
    
    if (image_url !== undefined) {
      query += `image_url = ?, `;
      params.push(image_url);
    }
    
    if (maintenance_mode !== undefined) {
      query += `maintenance_mode = ?, `;
      params.push(maintenance_mode ? 1 : 0);
    }
    
    // Add updated timestamp
    query += `updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    params.push(id);
    
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ 
            id, 
            ...deviceData, 
            changes: this.changes 
          });
        }
      });
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

  static setMaintenanceMode(id, maintenanceMode) {
    const status = maintenanceMode ? 'maintenance' : 'off';
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE iot_devices SET status = ?, maintenance_mode = ?, 
         last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status, maintenanceMode ? 1 : 0, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              id, 
              status, 
              maintenance_mode: maintenanceMode,
              changes: this.changes 
            });
          }
        }
      );
    });
  }

  static updateImage(id, imageUrl) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE iot_devices SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [imageUrl, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              id, 
              image_url: imageUrl,
              changes: this.changes 
            });
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
      
      // Check if device is in maintenance mode
      if (device.maintenance_mode === 1) {
        throw new Error('Device is in maintenance mode and cannot be controlled');
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
      
      // Update only devices not in maintenance mode
      const promises = devices
        .filter(device => device.maintenance_mode !== 1)
        .map(device => this.updateStatus(device.id, newStatus));
      
      await Promise.all(promises);
      
      return {
        roomId,
        status: newStatus,
        deviceCount: devices.length,
        message: `All available devices in room ${roomId} are now ${newStatus}`
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = IoTDevice; 