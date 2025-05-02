const { db } = require('../config/database');

class Room {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM rooms WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row && row.facilities && typeof row.facilities === 'string') {
            try {
              row.facilities = JSON.parse(row.facilities);
            } catch (e) {
            }
          }
          resolve(row);
        }
      });
    });
  }

  static findByNameAndLocation(room_name, location) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM rooms WHERE room_name = ? AND location = ?', [room_name, location], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async create(roomData) {
    try {
      console.log('Creating room with data:', roomData);
      
      const description = (roomData.description !== undefined && roomData.description !== null) 
        ? String(roomData.description) 
        : null;
      
      const status = (roomData.status !== undefined && roomData.status !== null) 
        ? String(roomData.status) 
        : 'available';
      
      console.log('Description type:', typeof description, 'Value:', description);
      console.log('Status type:', typeof status, 'Value:', status);
      
      const existingRoom = await this.findByNameAndLocation(roomData.room_name, roomData.location);
      if (existingRoom) {
        throw new Error(`Room with name "${roomData.room_name}" at location "${roomData.location}" already exists.`);
      }
      
      const sql = `
        INSERT INTO rooms (
          room_name, location, capacity, room_type, 
          description, status, facilities, created_at, updated_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `;
      
      const params = [
        roomData.room_name,
        roomData.location,
        roomData.capacity,
        roomData.room_type,
        description,
        status,
        roomData.facilities
      ];
      
      console.log('SQL params:', params);
      
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) {
            console.error('Error creating room:', err);
            reject(err);
          } else {
            console.log(`Room created with ID: ${this.lastID}`);
            
            db.get(`SELECT * FROM rooms WHERE id = ?`, [this.lastID], (err, room) => {
              if (err) {
                console.error('Error retrieving created room:', err);
                reject(err);
              } else {
                console.log('Created room:', room);
                resolve({
                  id: this.lastID,
                  ...roomData,
                  description: description, 
                  status: status,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
              }
            });
          }
        });
      });
    } catch (error) {
      console.error('Error in create room:', error);
      throw error;
    }
  }

  static update(id, roomData) {
    const { room_name, location, capacity, room_type, description, status, facilities } = roomData;
    
    const safeDescription = description === undefined || description === null ? '' : String(description).trim();
    const safeStatus = status === undefined || status === null ? 'available' : String(status).trim();
    const facilitiesStr = typeof facilities === 'object' ? JSON.stringify(facilities) : facilities;
    
    return new Promise((resolve, reject) => {
      const sqlQuery = `
        UPDATE rooms 
        SET 
          room_name = ?, 
          location = ?, 
          capacity = ?, 
          room_type = ?, 
          description = ?, 
          status = ?, 
          facilities = ?, 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      const params = [
        room_name,
        location,
        capacity,
        room_type,
        safeDescription,
        safeStatus,
        facilitiesStr,
        id
      ];
      
      console.log('Room.update: SQL Query:', sqlQuery);
      console.log('Room.update: SQL Params:', JSON.stringify(params, null, 2));
      
      //UPDATE
      db.run(sqlQuery, params, function(err) {
        if (err) {
          console.error('Room.update: Database error:', err);
          reject(err);
        } else {
          console.log('Room.update: Success! Rows affected:', this.changes);
          
          db.get('SELECT description, status FROM rooms WHERE id = ?', [id], (checkErr, checkRow) => {
            if (checkErr) {
              console.error('Error in direct check after update:', checkErr);
            } else {
              console.log('Direct database check after update:');
              console.log('- Description in DB:', checkRow ? checkRow.description : 'null');
              console.log('- Status in DB:', checkRow ? checkRow.status : 'null');
            }
          });
          
          db.get('SELECT * FROM rooms WHERE id = ?', [id], (err, row) => {
            if (err) {
              console.error('Room.update: Error fetching updated room:', err);
              reject(err);
            } else {
              console.log('Room.update: Retrieved from DB:', JSON.stringify(row, null, 2));
              resolve(row);
            }
          });
        }
      });
    });
  }

  static updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE rooms SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
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

  static getAll(filters = {}) {
    let query = 'SELECT * FROM rooms';
    const queryParams = [];
    const whereConditions = [];
    
    if (filters.status) {
      whereConditions.push('status = ?');
      queryParams.push(filters.status);
    }
    
    if (filters.room_type) {
      whereConditions.push('room_type = ?');
      queryParams.push(filters.room_type);
    }
    
    if (filters.location) {
      whereConditions.push('location LIKE ?');
      queryParams.push(`%${filters.location}%`);
    }
    
    if (filters.capacity) {
      whereConditions.push('capacity >= ?');
      queryParams.push(filters.capacity);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
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
      db.run('DELETE FROM rooms WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id, deleted: this.changes > 0 });
        }
      });
    });
  }

  static getAvailableRooms(date, startTime, endTime, capacity, room_type, location) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT r.* FROM rooms r
        WHERE r.status = 'available'
        AND r.capacity >= ?
        AND r.id NOT IN (
          SELECT b.room_id FROM bookings b
          WHERE b.booking_date = ?
          AND b.status IN ('confirmed', 'in_use')
          AND NOT (b.end_time <= ? OR b.start_time >= ?)
        )
      `;
      
      let params = [capacity || 1, date, startTime, endTime];
      
      if (room_type && room_type !== 'all') {
        query += ' AND r.room_type = ?';
        params.push(room_type);
      }
      
      if (location && location !== 'all') {
        query += ' AND r.location = ?';
        params.push(location);
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

  static getCount() {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM rooms', (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }
}

module.exports = Room; 