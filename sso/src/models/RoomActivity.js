const { db } = require('../config/database');

class RoomActivity {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM room_activities WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static create(activityData) {
    const { room_id, booking_id, user_id, activity_type, description } = activityData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO room_activities (room_id, booking_id, user_id, activity_type, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [room_id, booking_id, user_id, activity_type, description || null],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              ...activityData,
              timestamp: new Date().toISOString()
            });
          }
        }
      );
    });
  }

  static getByBookingId(bookingId) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM room_activities WHERE booking_id = ? ORDER BY timestamp ASC', [bookingId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static getByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT ra.*, b.booking_date, b.start_time, b.end_time, r.room_name, r.location 
        FROM room_activities ra
        JOIN bookings b ON ra.booking_id = b.id
        JOIN rooms r ON b.room_id = r.id
        WHERE ra.user_id = ?
        ORDER BY ra.timestamp DESC
      `, [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static getAll(limit = 100) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT ra.*, b.booking_date, b.start_time, b.end_time, 
               r.room_name, r.location, u.full_name, u.student_id
        FROM room_activities ra
        JOIN bookings b ON ra.booking_id = b.id
        JOIN rooms r ON b.room_id = r.id
        JOIN users u ON ra.user_id = u.id
        ORDER BY ra.timestamp DESC
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async recordCheckIn(bookingId, userId) {
    try {
      return await this.create({
        booking_id: bookingId,
        user_id: userId,
        activity_type: 'check_in'
      });
    } catch (error) {
      throw error;
    }
  }

  static async recordCheckOut(bookingId, userId) {
    try {
      return await this.create({
        booking_id: bookingId,
        user_id: userId,
        activity_type: 'check_out'
      });
    } catch (error) {
      throw error;
    }
  }

  static getActivityStats(startDate, endDate) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT r.id as room_id, r.room_name, r.location, COUNT(ra.id) as activity_count,
               COUNT(DISTINCT b.id) as booking_count, COUNT(DISTINCT ra.user_id) as unique_users
        FROM rooms r
        LEFT JOIN bookings b ON r.id = b.room_id
        LEFT JOIN room_activities ra ON b.id = ra.booking_id
        WHERE b.booking_date BETWEEN ? AND ?
        GROUP BY r.id
        ORDER BY activity_count DESC
      `;
      
      db.all(query, [startDate, endDate], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = RoomActivity; 