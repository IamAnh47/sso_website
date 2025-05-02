const { db } = require('../config/database');

class Notification {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM notifications WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static create(notificationData) {
    const { user_id, title, message } = notificationData;
    
    console.log(`[Notification.create] Đang tạo thông báo cho user ${user_id}`);
    console.log(`[Notification.create] Tiêu đề: ${title}`);
    console.log(`[Notification.create] Nội dung: ${message}`);
    
    return new Promise((resolve, reject) => {
      if (!user_id || !title || !message) {
        console.error('[Notification.create] Thiếu thông tin bắt buộc (user_id, title, message)');
        return reject(new Error('Missing required notification data'));
      }
      
      const safeUserId = Number(user_id) || user_id;
      const safeTitle = String(title);
      const safeMessage = String(message);
      
      console.log(`[Notification.create] Dữ liệu đã xử lý: user_id=${safeUserId}, title=${safeTitle}`);
      
      db.run(
        `INSERT INTO notifications (user_id, title, message) 
         VALUES (?, ?, ?)`,
        [safeUserId, safeTitle, safeMessage],
        function(err) {
          if (err) {
            console.error(`[Notification.create] Lỗi SQL khi tạo thông báo: ${err}`);
            reject(err);
          } else {
            const createdNotification = {
              id: this.lastID,
              user_id: safeUserId,
              title: safeTitle,
              message: safeMessage,
              is_read: 0,
              created_at: new Date().toISOString()
            };
            
            console.log(`[Notification.create] Tạo thông báo thành công, ID: ${this.lastID}`);
            resolve(createdNotification);
          }
        }
      );
    });
  }

  static markAsRead(id) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE notifications SET is_read = 1 WHERE id = ?`,
        [id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, is_read: 1 });
          }
        }
      );
    });
  }

  static getUserNotifications(userId, onlyUnread = false) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM notifications WHERE user_id = ?';
      const params = [userId];
      
      if (onlyUnread) {
        query += ' AND is_read = 0';
      }
      
      query += ' ORDER BY created_at DESC';
      
      db.all(query, params, (err, rows) => {
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
      db.run('DELETE FROM notifications WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, deleted: this.changes > 0 });
        }
      });
    });
  }

  static deleteAllForUser(userId) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM notifications WHERE user_id = ?', [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ userId, deletedCount: this.changes });
        }
      });
    });
  }

  static async sendBookingReminder(booking, user) {
    try {
      const title = 'Upcoming Booking Reminder';
      const message = `Your booking for ${booking.room_name} is starting soon at ${booking.start_time}. Don't forget to check in!`;
      
      return await this.create({
        user_id: user.id,
        title,
        message
      });
    } catch (error) {
      throw error;
    }
  }

  static async sendIoTStatusNotification(roomId, deviceType, status, userId) {
    try {
      let title, message;
      
      if (status === 'off' && deviceType === 'light') {
        title = 'Lights Turned Off';
        message = `The lights in your study space (Room ID: ${roomId}) have been automatically turned off.`;
      } else if (status === 'off' && deviceType === 'ac') {
        title = 'Air Conditioning Turned Off';
        message = `The air conditioning in your study space (Room ID: ${roomId}) has been automatically turned off.`;
      } else {
        title = `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Status Change`;
        message = `The ${deviceType} in your study space (Room ID: ${roomId}) is now ${status}.`;
      }
      
      return await this.create({
        user_id: userId,
        title,
        message
      });
    } catch (error) {
      throw error;
    }
  }

  static getByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT n.id, n.title, n.message, n.message as content, n.is_read, n.created_at, u.username as sender
         FROM notifications n
         LEFT JOIN users u ON n.sender_id = u.id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  static getById(id) {
    return new Promise((resolve, reject) => {
      console.log(`Looking up notification with ID: ${id}`);
      
      const query = `
        SELECT n.*, u.username as sender 
         FROM notifications n
         LEFT JOIN users u ON n.sender_id = u.id
        WHERE n.id = ?
      `;
      
      db.get(query, [id], (err, row) => {
          if (err) {
          console.error('Error in getById query:', err);
            reject(err);
        } else {
          if (row) {
            console.log('Found notification:', {
              id: row.id,
              user_id: row.user_id,
              user_id_type: typeof row.user_id,
              title: row.title,
              is_read: row.is_read
            });
          } else {
            console.log(`No notification found with ID: ${id}`);
          }
          resolve(row);
        }
      });
    });
  }

  static createSingle(senderId, userId, title, message) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO notifications (sender_id, user_id, title, message)
         VALUES (?, ?, ?, ?)`,
        [senderId, userId, title, message],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              sender_id: senderId,
              user_id: userId,
              title,
              message,
              is_read: 0,
              created_at: new Date().toISOString()
            });
          }
        }
      );
    });
  }

  static createMultiple(senderId, userIds, title, message) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return reject(new Error('User IDs must be a non-empty array'));
      }

      const promises = userIds.map(userId => 
        this.createSingle(senderId, userId, title, message)
      );

      Promise.all(promises)
        .then(results => resolve(results))
        .catch(err => reject(err));
    });
  }

  static markAllAsRead(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
        [userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              updated: this.changes
            });
          }
        }
      );
    });
  }

  static countUnread(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = ? AND is_read = 0`,
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.count : 0);
          }
        }
      );
    });
  }

  static findByCriteria(criteria = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM notifications WHERE 1=1';
      const params = [];
      
      if (criteria.userId) {
        query += ' AND user_id = ?';
        params.push(criteria.userId);
      }
      
      if (criteria.senderId) {
        query += ' AND sender_id = ?';
        params.push(criteria.senderId);
      }
      
      if (criteria.isRead !== undefined) {
        query += ' AND is_read = ?';
        params.push(criteria.isRead ? 1 : 0);
      }
      
      if (criteria.startDate) {
        query += ' AND created_at >= ?';
        params.push(criteria.startDate);
      }
      
      if (criteria.endDate) {
        query += ' AND created_at <= ?';
        params.push(criteria.endDate);
      }
      
      if (criteria.searchTerm) {
        if (criteria.searchInTitle) {
          query += ' AND title LIKE ?';
          params.push(criteria.searchTerm);
        } else if (criteria.excludeMatches) {
          query += ' AND (title NOT LIKE ? AND message NOT LIKE ?)';
          params.push(criteria.searchTerm, criteria.searchTerm);
        } else {
        query += ' AND (title LIKE ? OR message LIKE ?)';
          params.push(criteria.searchTerm, criteria.searchTerm);
        }
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (criteria.limit) {
        query += ' LIMIT ?';
        params.push(criteria.limit);
        
        if (criteria.offset) {
          query += ' OFFSET ?';
          params.push(criteria.offset);
        }
      }
      
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async createByUserCriteria(senderId, userCriteria, title, message) {
    try {
      let userQuery = 'SELECT id FROM users WHERE 1=1';
      const params = [];
      
      if (userCriteria.role) {
        userQuery += ' AND role = ?';
        params.push(userCriteria.role);
      }
      
      if (userCriteria.department) {
        userQuery += ' AND department = ?';
        params.push(userCriteria.department);
      }
      
      if (userCriteria.active !== undefined) {
        userQuery += ' AND active = ?';
        params.push(userCriteria.active ? 1 : 0);
      }
      
      if (userCriteria.createdBefore) {
        userQuery += ' AND created_at <= ?';
        params.push(userCriteria.createdBefore);
      }
      
      if (userCriteria.createdAfter) {
        userQuery += ' AND created_at >= ?';
        params.push(userCriteria.createdAfter);
      }
      
      const userIds = await new Promise((resolve, reject) => {
        db.all(userQuery, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map(row => row.id));
          }
        });
      });
      
      if (userIds.length === 0) {
        return [];
      }
      
      return await this.createMultiple(senderId, userIds, title, message);
    } catch (error) {
      throw error;
    }
  }

  static getStatistics(criteria = {}) {
    return new Promise((resolve, reject) => {
      const queries = {
        total: 'SELECT COUNT(*) as count FROM notifications',
        read: 'SELECT COUNT(*) as count FROM notifications WHERE is_read = 1',
        unread: 'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0',
        byDay: `
          SELECT 
            date(created_at) as day, 
            COUNT(*) as count 
          FROM notifications 
          GROUP BY date(created_at) 
          ORDER BY day DESC 
          LIMIT 30
        `,
        byRecipient: `
          SELECT 
            u.username, 
            COUNT(*) as count 
          FROM notifications n
          JOIN users u ON n.user_id = u.id
          GROUP BY n.user_id
          ORDER BY count DESC
          LIMIT 10
        `
      };
      
      const stats = {};
      let completed = 0;
      const totalQueries = Object.keys(queries).length;
      
      for (const [key, query] of Object.entries(queries)) {
        db.all(query, [], (err, rows) => {
          if (err) {
            return reject(err);
          }
          
          if (key === 'total' || key === 'read' || key === 'unread') {
            stats[key] = rows[0]?.count || 0;
          } else {
            stats[key] = rows;
          }
          
          completed++;
          if (completed === totalQueries) {
            resolve(stats);
          }
        });
      }
    });
  }
}

module.exports = Notification; 