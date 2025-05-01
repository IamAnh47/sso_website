const { db } = require('../config/database');

class IoTActivity {
  // Lấy các hoạt động gần đây của thiết bị IoT
  static getRecent(limit = 10) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          a.*, 
          d.device_name, 
          d.device_type,
          r.room_name
        FROM 
          iot_device_activities a
        LEFT JOIN 
          iot_devices d ON a.device_id = d.id
        LEFT JOIN 
          rooms r ON d.room_id = r.id
        ORDER BY 
          a.timestamp DESC
        LIMIT ?
      `;
      
      db.all(query, [limit], (err, rows) => {
        if (err) {
          console.error('Error getting recent IoT activities:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
  
  // Tạo một bản ghi hoạt động mới
  static log(activityData) {
    return new Promise((resolve, reject) => {
      const { device_id, action, status, details, user_id } = activityData;
      
      if (!device_id || !action) {
        return reject(new Error('Device ID and action are required'));
      }
      
      const query = `
        INSERT INTO iot_device_activities (
          device_id, action, status, details, user_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const params = [
        device_id,
        action,
        status || 'success',
        details || null,
        user_id || null
      ];
      
      db.run(query, params, function(err) {
        if (err) {
          console.error('Error logging IoT activity:', err);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            ...activityData,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  }
  
  // Lấy tất cả hoạt động của một thiết bị cụ thể
  static getByDevice(deviceId, limit = 50) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM iot_device_activities
        WHERE device_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `;
      
      db.all(query, [deviceId, limit], (err, rows) => {
        if (err) {
          console.error('Error getting device activities:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }
  
  // Xóa lịch sử hoạt động cũ (giữ lại activities trong X ngày)
  static cleanupOldActivities(daysToKeep = 30) {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM iot_device_activities
        WHERE timestamp < datetime('now', '-' || ? || ' days')
      `;
      
      db.run(query, [daysToKeep], function(err) {
        if (err) {
          console.error('Error cleaning up old activities:', err);
          reject(err);
        } else {
          resolve({
            deleted: this.changes,
            message: `Deleted ${this.changes} old activity records`
          });
        }
      });
    });
  }
}

module.exports = IoTActivity; 