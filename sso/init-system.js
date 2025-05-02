/**
 * Smart Study Space - System Initialization Tool
 * 1. Xóa database hiện tại và tạo database mới
 * 2. Tạo tài khoản mặc định 
 * 3. Chuẩn bị chạy
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'smart_study_space.db');

console.log(`${colors.bright}${colors.blue}=== SMART STUDY SPACE - KHỞI TẠO HỆ THỐNG ===${colors.reset}\n`);

function askForDatabaseReset() {
  if (fs.existsSync(dbPath)) {
    console.log(`${colors.yellow}Đã phát hiện database hiện tại.${colors.reset}`);
    rl.question(`Bạn có muốn xóa và tạo lại database không? (y/n): `, (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        resetDatabase();
      } else {
        console.log(`${colors.yellow}Giữ nguyên database hiện tại.${colors.reset}`);
        finishSetup();
      }
    });
  } else {
    console.log(`${colors.yellow}Chưa có database. Hệ thống sẽ tạo database mới.${colors.reset}`);
    ensureDbDirectory();
    initializeDatabase();
  }
}

function resetDatabase() {
  console.log(`${colors.cyan}Đang xóa database hiện tại...${colors.reset}`);
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`${colors.green}Đã xóa database thành công.${colors.reset}`);
    }
    ensureDbDirectory();
    initializeDatabase();
  } catch (error) {
    console.error(`${colors.red}Lỗi khi xóa database: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

function ensureDbDirectory() {
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir);
      console.log(`${colors.green}Đã tạo thư mục data.${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Lỗi khi tạo thư mục data: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

function initializeDatabase() {
  console.log(`${colors.cyan}Đang khởi tạo database...${colors.reset}`);
  
  const initDb = spawn('node', ['src/config/initialize-db.js']);
  
  initDb.stdout.on('data', (data) => {
    console.log(`${data}`);
  });
  
  initDb.stderr.on('data', (data) => {
    console.error(`${colors.red}${data}${colors.reset}`);
  });
  
  initDb.on('close', (code) => {
    if (code !== 0) {
      console.error(`${colors.red}Khởi tạo database thất bại với mã lỗi ${code}${colors.reset}`);
      process.exit(1);
    }
    
    console.log(`${colors.green}Khởi tạo database thành công.${colors.reset}`);
    finishSetup();
  });
}

function finishSetup() {
  console.log(`\n${colors.bright}${colors.green}=== KHỞI TẠO HỆ THỐNG HOÀN TẤT ===${colors.reset}`);
  console.log(`\n${colors.cyan}Thông tin đăng nhập mặc định:${colors.reset}`);
  console.log(`Admin:   username: ${colors.bright}admin${colors.reset},  password: ${colors.bright}admin123${colors.reset}`);
  console.log(`Staff:   username: ${colors.bright}staff${colors.reset},  password: ${colors.bright}staff123${colors.reset}`);
  console.log(`Student: username: ${colors.bright}user${colors.reset},   password: ${colors.bright}user123${colors.reset}`);
  
  console.log(`\n${colors.cyan}Để chạy hệ thống, sử dụng lệnh:${colors.reset}`);
  console.log(`${colors.bright}npm start${colors.reset}`);
  console.log(`${colors.bright}npm run dev:skip-auth${colors.reset}  (Chế độ phát triển bỏ qua xác thực)\n`);
  
  rl.close();
}

askForDatabaseReset(); 