const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Đảm bảo thư mục data tồn tại
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const dbPath = path.join(dbDir, 'smart_study_space.db');

// Enable SQLite tracing for debug (ghi nhật ký các truy vấn)
sqlite3.verbose();

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON;');
    
    // Ghi nhật ký schema để kiểm tra cấu trúc bảng khi khởi động
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error('Error getting table list:', err);
      } else {
        console.log('Database tables:', tables.map(t => t.name).join(', '));
      }
    });
  }
});

// Hàm khởi tạo database - được export để gọi từ bên ngoài
function initializeDatabase() {
  console.log('Creating database tables...');
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tạo bảng Users
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        role TEXT NOT NULL DEFAULT 'student',
        full_name TEXT,
        student_id TEXT UNIQUE,
        phone TEXT,
        department_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tạo bảng Rooms
      db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT NOT NULL,
        location TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        room_type TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'available',
        facilities TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Tạo bảng Bookings
      db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        booking_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        purpose TEXT,
        participants INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (room_id) REFERENCES rooms (id)
      )`);

      // Tạo bảng IoT devices
      db.run(`CREATE TABLE IF NOT EXISTS iot_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_name TEXT NOT NULL,
        device_type TEXT NOT NULL,
        room_id INTEGER NOT NULL,
        status TEXT DEFAULT 'off',
        maintenance_mode BOOLEAN DEFAULT 0,
        image_url TEXT,
        display_order INTEGER DEFAULT 0,
        last_activity TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms (id)
      )`);

      // Tạo bảng IoT device activities
      db.run(`CREATE TABLE IF NOT EXISTS iot_device_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'success',
        details TEXT,
        user_id INTEGER,
        FOREIGN KEY (device_id) REFERENCES iot_devices(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )`);

      // Tạo bảng Notifications
      db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (sender_id) REFERENCES users (id)
      )`);

      // Tạo bảng Sessions để lưu trữ token và phiên làm việc
      db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

      // Tạo bảng Room Activities để theo dõi check-in/check-out
      db.run(`CREATE TABLE IF NOT EXISTS room_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER NOT NULL,
        room_id INTEGER,
        user_id INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        description TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings (id),
        FOREIGN KEY (room_id) REFERENCES rooms (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('Database tables created successfully.');
          resolve();
        }
      });
    });
  });
}

/**
 * Function to create an admin user
 * This can be called during initial setup to ensure there's always an admin
 */
const createAdminIfNotExists = () => {
  return new Promise((resolve, reject) => {
    // Check if admin already exists
    db.get('SELECT * FROM users WHERE role = "admin" LIMIT 1', (err, row) => {
      if (err) {
        console.error('Error checking for admin:', err);
        return reject(err);
      }
      
      // If admin exists, do nothing
      if (row) {
        console.log('Admin user already exists');
        return resolve();
      }
      
      // Import bcrypt to hash password
      const bcrypt = require('bcrypt');
      
      // Create admin user
      bcrypt.hash('admin123', 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return reject(err);
        }
        
        // Insert admin user
        // db.run(
        //   `INSERT INTO users (username, password, email, full_name, student_id, role, phone, department_id) 
        //    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        //   ['admin', hashedPassword, 'admin@hcmut.edu.vn', 'System Administrator', 'ADMIN001', 'admin', '', ''],
        //   function(err) {
        //     if (err) {
        //       console.error('Error creating admin user:', err);
        //       return reject(err);
        //     }
            
        //     console.log('Admin user created successfully');
        //     resolve();
        //   }
        // );
      });
    });
  });
};

// Export functions for use elsewhere
module.exports = {
  db,
  createAdminIfNotExists,
  initializeDatabase,
  dbPath
}; 