const { db } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  static findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static findByStudentId(studentId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE student_id = ?', [studentId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  static async create(userData) {
    const { username, password, email, full_name, student_id, phone, department_id, role = 'student' } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (username, password, email, full_name, student_id, phone, department_id, role) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, hashedPassword, email, full_name, student_id, phone, department_id, role],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              username,
              email,
              full_name,
              student_id,
              phone,
              department_id,
              role
            });
          }
        }
      );
    });
  }

  static async authenticate(username, password) {
    try {
      const user = await this.findByUsername(username);
      if (!user) {
        return null;
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  static update(id, userData) {
    const { email, full_name, role, phone, department_id } = userData;
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET email = ?, full_name = ?, role = ?, phone = ?, department_id = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [email, full_name, role, phone, department_id, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, ...userData });
          }
        }
      );
    });
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [hashedPassword, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id, passwordUpdated: true });
          }
        }
      );
    });
  }

  static getAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT id, username, email, full_name, student_id, role, created_at FROM users', (err, rows) => {
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
      db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ deleted: true, rows: this.changes });
        }
      });
    });
  }
}

module.exports = User; 