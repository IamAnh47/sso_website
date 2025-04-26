const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

class Session {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static findByToken(token) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM sessions WHERE token = ?', [token], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static findByUserId(userId) {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM sessions WHERE user_id = ?', [userId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static create(userId, expiresInHours = 24, existingToken = null) {
    // Nếu có token hiện tại, sử dụng nó thay vì tạo token mới
    const token = existingToken || jwt.sign({ id: userId }, config.jwtSecret, {
      expiresIn: `${expiresInHours}h`
    });
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    return new Promise((resolve, reject) => {
      // Kiểm tra xem token đã tồn tại trong database chưa
      if (existingToken) {
        this.findByToken(existingToken)
          .then(session => {
            if (session) {
              // Nếu token đã tồn tại, cập nhật thời gian hết hạn
              db.run(
                'UPDATE sessions SET expires_at = ? WHERE token = ?',
                [expiresAt.toISOString(), existingToken],
                function(err) {
                  if (err) {
                    reject(err);
                  } else {
                    resolve({
                      id: session.id,
                      user_id: userId,
                      token: existingToken,
                      expires_at: expiresAt.toISOString()
                    });
                  }
                }
              );
            } else {
              // Nếu token chưa tồn tại, tạo mới
              insertNewSession();
            }
          })
          .catch(err => reject(err));
      } else {
        // Không có token hiện tại, tạo mới
        insertNewSession();
      }
      
      function insertNewSession() {
        db.run(
          `INSERT INTO sessions (user_id, token, expires_at) 
           VALUES (?, ?, ?)`,
          [userId, token, expiresAt.toISOString()],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({
                id: this.lastID,
                user_id: userId,
                token,
                expires_at: expiresAt.toISOString()
              });
            }
          }
        );
      }
    });
  }

  static delete(token) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM sessions WHERE token = ?', [token], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ token, deleted: this.changes > 0 });
        }
      });
    });
  }

  static deleteAllForUser(userId) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM sessions WHERE user_id = ?', [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ userId, deletedCount: this.changes });
        }
      });
    });
  }

  static deleteExpired() {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM sessions WHERE expires_at < ?', [now], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deletedCount: this.changes });
        }
      });
    });
  }

  static isValid(token) {
    return new Promise(async (resolve, reject) => {
      try {
        // Trước tiên kiểm tra xem token có phải là JWT hợp lệ
        try {
          jwt.verify(token, config.jwtSecret);
          // Nếu token là JWT hợp lệ, tiếp tục kiểm tra session
        } catch (jwtError) {
          console.error('JWT verification failed:', jwtError);
          return resolve(false);
        }
        
        // Kiểm tra trong database
        const session = await this.findByToken(token);
        
        if (!session) {
          // Token không tồn tại trong database
          // Nhưng JWT hợp lệ, nên vẫn có thể được chấp nhận
          console.log('Valid JWT token but not found in sessions database');
          return resolve(true);
        }
        
        const expiresAt = new Date(session.expires_at);
        const now = new Date();
        
        if (now > expiresAt) {
          // Session expired, delete it
          await this.delete(token);
          return resolve(false);
        }
        
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  static async getUserIdFromToken(token) {
    try {
      const session = await this.findByToken(token);
      
      if (!session) {
        return null;
      }
      
      const expiresAt = new Date(session.expires_at);
      const now = new Date();
      
      if (now > expiresAt) {
        // Session expired, delete it
        await this.delete(token);
        return null;
      }
      
      return session.user_id;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Session; 