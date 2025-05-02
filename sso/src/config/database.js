const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const dbPath = path.join(dbDir, 'smart_study_space.db');

sqlite3.verbose();

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    db.run('PRAGMA foreign_keys = ON;');
    
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
      if (err) {
        console.error('Error getting table list:', err);
      } else {
        console.log('Database tables:', tables.map(t => t.name).join(', '));
      }
    });
  }
});

function initializeDatabase() {
  console.log('Creating database tables...');
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
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

      db.run(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

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
    db.get('SELECT * FROM users WHERE role = "admin" LIMIT 1', (err, row) => {
      if (err) {
        console.error('Error checking for admin:', err);
        return reject(err);
      }
      
      if (row) {
        console.log('Admin user already exists');
        return resolve();
      }
      
      const bcrypt = require('bcrypt');
      
      bcrypt.hash('admin123', 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing password:', err);
          return reject(err);
        }
        
            
      });
    });
  });
};

module.exports = {
  db,
  createAdminIfNotExists,
  initializeDatabase,
  dbPath
}; 