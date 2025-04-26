/**
 * Database Initialization Script
 * 
 * This script initializes the database and creates default accounts
 * Supports creating admin and test user accounts automatically
 */

const { db, initializeDatabase, dbPath } = require('./database');
const fs = require('fs');
const bcrypt = require('bcrypt');
const readline = require('readline');
const path = require('path');

// Ensure data directory exists
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
  console.log('Created data directory.');
}

// Kiểm tra xem database đã tồn tại chưa
const isNewDb = !fs.existsSync(dbPath);

// Khởi tạo database và tạo tài khoản
async function init() {
  try {
    // Khởi tạo cấu trúc database
    await initializeDatabase();
    
    // Tạo tài khoản nếu cần
    if (isNewDb) {
      console.log('New database detected. Creating default accounts...');
      await createDefaultUsers();
    } else {
      // Kiểm tra nếu không có tài khoản admin nào
      const adminExists = await checkAdminExists();
      if (!adminExists) {
        console.log('No admin user found. Creating default admin...');
        await createAdminUser();
      } else {
        console.log(`Found admin user(s) in database.`);
      }
    }
    
    // Hỏi người dùng có muốn tạo thêm tài khoản không
    promptForUserCreation();
  } catch (error) {
    console.error('Error initializing database:', error.message);
    closeDbAndExit();
  }
}

// Kiểm tra xem có tài khoản admin nào không
function checkAdminExists() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'], (err, result) => {
      if (err) {
        console.error('Error checking for admin users:', err.message);
        reject(err);
        return;
      }
      
      resolve(result.count > 0);
    });
  });
}

// Tạo các tài khoản mặc định
async function createDefaultUsers() {
  try {
    await createAdminUser();
    await createTestUser();
    await createStaffUser();
  } catch (error) {
    console.error('Error creating default users:', error.message);
    throw error;
  }
}

// Tạo tài khoản admin
function createAdminUser() {
  const saltRounds = 10;
  const adminPassword = 'admin123';
  
  return new Promise((resolve, reject) => {
    bcrypt.hash(adminPassword, saltRounds, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing admin password:', err.message);
        reject(err);
        return;
      }
      
      db.run(
        'INSERT INTO users (username, password, email, full_name, student_id, role, phone, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['admin', hashedPassword, 'admin@hcmut.edu.vn', 'System Administrator', 'ADMIN001', 'admin', '999999999', 'ADMIN'],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              console.log('Admin user already exists, skipping creation.');
              resolve();
            } else {
              console.error('Error creating admin user:', err.message);
              reject(err);
            }
          } else {
            console.log('Admin user created successfully.');
            console.log('  Username: admin');
            console.log('  Password: admin123');
            resolve();
          }
        }
      );
    });
  });
}

// Tạo tài khoản test (sinh viên)
function createTestUser() {
  const saltRounds = 10;
  const userPassword = 'user123';
  
  return new Promise((resolve, reject) => {
    bcrypt.hash(userPassword, saltRounds, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing user password:', err.message);
        resolve(); // Không chặn quá trình nếu lỗi khi tạo user
        return;
      }
      
      db.run(
        'INSERT INTO users (username, password, email, full_name, student_id, role, phone, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['user', hashedPassword, 'user@hcmut.edu.vn', 'Test User', '2023001', 'student', '0987654321', 'cse'],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              console.log('Test user already exists, skipping creation.');
            } else {
              console.error('Error creating test user:', err.message);
            }
          } else {
            console.log('Test user created successfully.');
            console.log('  Username: user');
            console.log('  Password: user123');
          }
          
          resolve();
        }
      );
    });
  });
}

// Tạo tài khoản staff
function createStaffUser() {
  const saltRounds = 10;
  const staffPassword = 'staff123';
  
  return new Promise((resolve, reject) => {
    bcrypt.hash(staffPassword, saltRounds, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing staff password:', err.message);
        resolve(); // Không chặn quá trình nếu lỗi khi tạo staff
        return;
      }
      
      db.run(
        'INSERT INTO users (username, password, email, full_name, student_id, role, phone, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['staff', hashedPassword, 'staff@hcmut.edu.vn', 'Staff User', 'STAFF001', 'staff', '0123456789', 'cse'],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              console.log('Staff user already exists, skipping creation.');
            } else {
              console.error('Error creating staff user:', err.message);
            }
          } else {
            console.log('Staff user created successfully.');
            console.log('  Username: staff');
            console.log('  Password: staff123');
          }
          
          resolve();
        }
      );
    });
  });
}

// Hỏi người dùng có muốn tạo thêm tài khoản không
function promptForUserCreation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\nDo you want to create a new user? (y/n)');
  rl.question('> ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      promptForUserDetails(rl);
    } else {
      rl.close();
      closeDbAndExit();
    }
  });
}

// Hỏi chi tiết thông tin người dùng mới
function promptForUserDetails(rl) {
  console.log('\nEnter user details:');
  
  const userData = {};
  
  rl.question('Username: ', (username) => {
    userData.username = username;
    
    rl.question('Password: ', (password) => {
      userData.password = password;
      
      rl.question('Email: ', (email) => {
        userData.email = email;
        
        rl.question('Full Name: ', (fullName) => {
          userData.fullName = fullName;
          
          rl.question('Student/Staff ID: ', (id) => {
            userData.id = id;
            
            rl.question('Phone: ', (phone) => {
              userData.phone = phone;
              
              rl.question('Department (cse, eee, me, mse, as, rm): ', (department) => {
                userData.department = department;
                
                rl.question('Role (admin/staff/student): ', (role) => {
                  userData.role = role.toLowerCase();
                  
                  if (!['admin', 'staff', 'student'].includes(userData.role)) {
                    console.log('Invalid role. Defaulting to "student".');
                    userData.role = 'student';
                  }
                  
                  createCustomUser(userData, () => {
                    rl.close();
                    closeDbAndExit();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

// Tạo tài khoản tùy chỉnh
function createCustomUser(userData, callback) {
  const saltRounds = 10;
  
  bcrypt.hash(userData.password, saltRounds, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err.message);
      if (callback) callback();
      return;
    }
    
    db.run(
      'INSERT INTO users (username, password, email, full_name, student_id, role, phone, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userData.username, hashedPassword, userData.email, userData.fullName, userData.id, userData.role, userData.phone, userData.department],
      function(err) {
        if (err) {
          console.error('Error creating user:', err.message);
        } else {
          console.log(`User ${userData.username} created successfully.`);
        }
        
        if (callback) callback();
      }
    );
  });
}

// Đóng kết nối database và thoát
function closeDbAndExit() {
  console.log('Closing database connection...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
      process.exit(1);
    }
    
    console.log('Database initialization completed successfully.');
  });
}

// Xử lý khi người dùng nhấn Ctrl+C
process.on('SIGINT', () => {
  console.log('\nInitialization interrupted.');
  closeDbAndExit();
});

// Khởi chạy script
init(); 