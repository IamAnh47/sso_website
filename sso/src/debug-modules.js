// Debug script to check module loading
const path = require('path');
const fs = require('fs');

// Path to controllers directory
const controllersDir = path.join(__dirname, 'controllers');

console.log('Controllers directory:', controllersDir);
console.log('Files in controllers directory:');

// List all files in the controllers directory
const files = fs.readdirSync(controllersDir);
files.forEach(file => {
  console.log(`- ${file}`);
});

// Try to load each controller
console.log('\nTrying to load each controller:');
files.filter(file => file.endsWith('.js')).forEach(file => {
  const controllerName = path.basename(file, '.js');
  try {
    const controller = require(path.join(controllersDir, file));
    console.log(`✅ Successfully loaded ${file}`);
    console.log(`   Exported functions: ${Object.keys(controller).join(', ')}`);
  } catch (error) {
    console.error(`❌ Failed to load ${file}: ${error.message}`);
  }
});

// Try imports with different cases
console.log('\nTrying imports with different casing:');
try {
  const userController = require('./controllers/userController');
  console.log('✅ userController loaded successfully');
  console.log(`   Exported functions: ${Object.keys(userController).join(', ')}`);
} catch (error) {
  console.error(`❌ Failed to load userController: ${error.message}`);
}

try {
  const UserController = require('./controllers/UserController');
  console.log('✅ UserController loaded successfully');
  console.log(`   Exported functions: ${Object.keys(UserController).join(', ')}`);
} catch (error) {
  console.error(`❌ Failed to load UserController: ${error.message}`);
}

try {
  const roomController = require('./controllers/roomController');
  console.log('✅ roomController loaded successfully');
  console.log(`   Exported functions: ${Object.keys(roomController).join(', ')}`);
} catch (error) {
  console.error(`❌ Failed to load roomController: ${error.message}`);
}

try {
  const RoomController = require('./controllers/RoomController');
  console.log('✅ RoomController loaded successfully');
  console.log(`   Exported functions: ${Object.keys(RoomController).join(', ')}`);
} catch (error) {
  console.error(`❌ Failed to load RoomController: ${error.message}`);
}

// Try to load specific functions that are causing issues
try {
  const { getUserRoles } = require('./controllers/userController');
  console.log('✅ getUserRoles function imported successfully');
} catch (error) {
  console.error(`❌ Failed to import getUserRoles: ${error.message}`);
}

try {
  const { getRoomTypes } = require('./controllers/roomController');
  console.log('✅ getRoomTypes function imported successfully');
} catch (error) {
  console.error(`❌ Failed to import getRoomTypes: ${error.message}`);
} 