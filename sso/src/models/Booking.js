const { db } = require('../config/database');

class Booking {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT b.*, r.room_name, r.location, u.full_name, u.student_id 
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN users u ON b.user_id = u.id
        WHERE b.id = ?
      `, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static create(bookingData) {
    const { user_id, room_id, booking_date, start_time, end_time, purpose, participants } = bookingData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO bookings (user_id, room_id, booking_date, start_time, end_time, status, purpose, participants) 
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [user_id, room_id, booking_date, start_time, end_time, purpose, participants],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              ...bookingData,
              status: 'pending'
            });
          }
        }
      );
    });
  }

  static update(id, bookingData) {
    const { booking_date, start_time, end_time, status, purpose, participants } = bookingData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE bookings SET booking_date = ?, start_time = ?, end_time = ?, 
         status = ?, purpose = ?, participants = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [booking_date, start_time, end_time, status, purpose, participants, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...bookingData });
          }
        }
      );
    });
  }

  static updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE bookings SET status = ? WHERE id = ?`,
        [status, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            if (this.changes === 0) {
              reject(new Error('Booking not found'));
            } else {
              resolve({ id, status });
            }
          }
        }
      );
    });
  }

  /**
   * Get bookings for a specific user with optional status filter
   * @param {number} userId - The user ID
   * @param {string|array} status - Optional booking status or array of statuses to filter by
   * @returns {Promise<Array>} - Array of bookings
   */
  static getUserBookings(userId, status = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT b.*, r.room_name, r.location, r.room_type
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.user_id = ?
      `;
      const params = [userId];
      
      if (status) {
        // Handle both single status string and array of statuses
        if (Array.isArray(status)) {
          const placeholders = status.map(() => '?').join(',');
          query += ` AND b.status IN (${placeholders})`;
          params.push(...status);
        } else {
          query += ' AND b.status = ?';
          params.push(status);
        }
      }
      
      query += ' ORDER BY b.booking_date DESC, b.start_time ASC';
      
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static getRoomBookings(roomId, date = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT b.*, u.full_name, u.student_id, r.room_name, r.location
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN rooms r ON b.room_id = r.id
        WHERE b.room_id = ?
      `;
      const params = [roomId];
      
      if (date) {
        query += ' AND b.booking_date = ?';
        params.push(date);
      }
      
      query += ' ORDER BY b.booking_date ASC, b.start_time ASC';
      
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error(`[getRoomBookings] Lỗi khi lấy bookings cho phòng ${roomId}: ${err}`);
          reject(err);
        } else {
          console.log(`[getRoomBookings] Đã tìm thấy ${rows.length} bookings cho phòng ${roomId}`);
          resolve(rows);
        }
      });
    });
  }

  static getAll(filters = {}) {
    let query = `
      SELECT b.*, r.room_name, r.location, u.full_name, u.student_id
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN users u ON b.user_id = u.id
    `;
    
    const whereConditions = [];
    const queryParams = [];
    
    if (filters.status) {
      whereConditions.push('b.status = ?');
      queryParams.push(filters.status);
    }
    
    if (filters.date) {
      whereConditions.push('b.booking_date = ?');
      queryParams.push(filters.date);
    }
    
    if (filters.room_type) {
      whereConditions.push('r.room_type = ?');
      queryParams.push(filters.room_type);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY b.booking_date DESC, b.start_time ASC';
    
    return new Promise((resolve, reject) => {
      db.all(query, queryParams, (err, rows) => {
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
      db.run('DELETE FROM bookings WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, deleted: this.changes > 0 });
        }
      });
    });
  }

  static checkIn(id) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE bookings SET status = 'in_use', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, status: 'in_use' });
          }
        }
      );
    });
  }

  static checkOut(id) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE bookings SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, status: 'completed' });
          }
        }
      );
    });
  }

  static getPendingCheckInBookings() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT b.*, r.room_name, r.location, u.full_name, u.email
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        JOIN users u ON b.user_id = u.id
        WHERE b.booking_date = ?
        AND b.start_time <= ?
        AND b.status = 'confirmed'
      `;
      
      db.all(query, [today, currentTime], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = Booking; 