/**
 * Script để cập nhật bảng notifications
 * Thêm cột sender_id nếu chưa tồn tại
 */

const { db } = require('../src/config/database');

console.log('Kiểm tra và cập nhật cấu trúc bảng notifications...');

// Hàm kiểm tra xem bảng notifications có tồn tại hay không
function checkTableExists() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT name FROM sqlite_master 
       WHERE type='table' AND name='notifications'`,
      (err, row) => {
        if (err) {
          console.error('Lỗi kiểm tra bảng:', err.message);
          reject(err);
        } else {
          resolve(row !== undefined);
        }
      }
    );
  });
}

// Hàm kiểm tra xem cột sender_id có tồn tại trong bảng notifications hay không
function checkColumnExists() {
  return new Promise((resolve, reject) => {
    db.get(
      `PRAGMA table_info(notifications)`,
      (err, rows) => {
        if (err) {
          console.error('Lỗi kiểm tra cấu trúc bảng:', err.message);
          reject(err);
        } else {
          // Chuyển đổi kết quả sang mảng để tìm kiếm cột
          const columns = Array.isArray(rows) ? rows : [rows];
          const senderIdColumn = columns.find(col => col && col.name === 'sender_id');
          resolve(senderIdColumn !== undefined);
        }
      }
    );
  });
}

// Hàm tạo bảng notifications nếu chưa tồn tại
function createTable() {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        sender_id INTEGER,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (sender_id) REFERENCES users(id)
      )`,
      (err) => {
        if (err) {
          console.error('Lỗi tạo bảng:', err.message);
          reject(err);
        } else {
          console.log('Đã tạo bảng notifications.');
          
          // Tạo index cho các cột thường được tìm kiếm
          const indexPromises = [
            createIndex('idx_notifications_user_id', 'user_id'),
            createIndex('idx_notifications_sender_id', 'sender_id'),
            createIndex('idx_notifications_is_read', 'is_read')
          ];
          
          Promise.all(indexPromises)
            .then(() => resolve())
            .catch(err => {
              console.error('Lỗi tạo index:', err.message);
              // Vẫn resolve kể cả khi tạo index lỗi
              resolve();
            });
        }
      }
    );
  });
}

// Hàm tạo index
function createIndex(indexName, columnName) {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE INDEX IF NOT EXISTS ${indexName} ON notifications(${columnName})`,
      (err) => {
        if (err) {
          console.error(`Lỗi tạo index ${indexName}:`, err.message);
          reject(err);
        } else {
          console.log(`Đã tạo index ${indexName}.`);
          resolve();
        }
      }
    );
  });
}

// Hàm thêm cột sender_id vào bảng notifications
function addSenderIdColumn() {
  return new Promise((resolve, reject) => {
    db.run(
      `ALTER TABLE notifications ADD COLUMN sender_id INTEGER REFERENCES users(id)`,
      (err) => {
        if (err) {
          if (err.message.includes('duplicate column name')) {
            console.log('Cột sender_id đã tồn tại.');
            resolve();
          } else {
            console.error('Lỗi thêm cột:', err.message);
            reject(err);
          }
        } else {
          console.log('Đã thêm cột sender_id vào bảng notifications.');
          resolve();
        }
      }
    );
  });
}

// Hàm chính để thực hiện kiểm tra và cập nhật
async function updateDatabase() {
  try {
    const tableExists = await checkTableExists();
    
    if (!tableExists) {
      console.log('Bảng notifications chưa tồn tại. Đang tạo bảng...');
      await createTable();
    } else {
      console.log('Bảng notifications đã tồn tại.');
      
      const columnExists = await checkColumnExists();
      
      if (!columnExists) {
        console.log('Cột sender_id chưa tồn tại. Đang thêm cột...');
        await addSenderIdColumn();
      } else {
        console.log('Cột sender_id đã tồn tại.');
      }
    }
    
    console.log('Đã hoàn tất cập nhật bảng notifications.');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi cập nhật bảng:', error.message);
    process.exit(1);
  }
}

// Thực hiện cập nhật
updateDatabase(); 