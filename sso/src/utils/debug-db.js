/**
 * Database Debug Utility
 * This file provides utilities to debug database issues
 */

const { db } = require('../config/database');

// Kiểm tra cấu trúc bảng
function checkTableStructure(tableName) {
  return new Promise((resolve, reject) => {
    console.log(`Checking table structure for '${tableName}'...`);
    
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
      if (err) {
        console.error(`Error getting table structure for '${tableName}':`, err);
        reject(err);
        return;
      }
      
      console.log(`Table '${tableName}' structure:`);
      columns.forEach(col => {
        console.log(`- ${col.cid}: ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''} DEFAULT: ${col.dflt_value || 'NULL'}`);
      });
      
      resolve(columns);
    });
  });
}

// Thực hiện lệnh SQL trực tiếp và trả về kết quả
function runDirectQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    console.log(`Running direct query: ${sql}`);
    console.log(`With params:`, params);
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error(`Error running direct query:`, err);
        reject(err);
        return;
      }
      
      console.log(`Query returned ${rows.length} rows`);
      console.log(rows);
      
      resolve(rows);
    });
  });
}

// Export các hàm
module.exports = {
  checkTableStructure,
  runDirectQuery
};

// Khi chạy file này trực tiếp
if (require.main === module) {
  // Check all important tables
  Promise.all([
    checkTableStructure('rooms'),
    checkTableStructure('users'),
    checkTableStructure('bookings')
  ])
  .then(() => {
    // Check một room cụ thể
    return runDirectQuery('SELECT * FROM rooms LIMIT 1');
  })
  .then((rows) => {
    if (rows && rows.length > 0) {
      console.log('Room entry found:');
      console.log(JSON.stringify(rows[0], null, 2));
      
      // Test cập nhật description và status
      console.log('Testing direct update...');
      const roomId = rows[0].id;
      const testDescription = 'Test description ' + new Date().toISOString();
      const testStatus = 'maintenance';
      
      return runDirectQuery(
        'UPDATE rooms SET description = ?, status = ? WHERE id = ?',
        [testDescription, testStatus, roomId]
      ).then(() => {
        return runDirectQuery('SELECT * FROM rooms WHERE id = ?', [roomId]);
      });
    }
    return null;
  })
  .then((rows) => {
    if (rows && rows.length > 0) {
      console.log('After direct update:');
      console.log(JSON.stringify(rows[0], null, 2));
    }
    console.log('Database check complete!');
    db.close();
  })
  .catch(err => {
    console.error('Error during database check:', err);
    db.close();
  });
} 