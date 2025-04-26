/**
 * Setup script for Smart Study Space
 * This script will:
 * 1. Initialize the database
 * 2. Generate test data (if specified)
 * 3. Start the server
 * 
 * Usage: node setup-and-run.js [--with-test-data]
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const withTestData = args.includes('--with-test-data');
const clearData = args.includes('--clear-data');
const skipAuth = args.includes('--skip-auth') || args.includes('--dev');
const devMode = args.includes('--dev');

// Ensure data directory exists
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  console.log(`${colors.cyan}Creating data directory...${colors.reset}`);
  fs.mkdirSync(dbDir);
}

// Step 1: Initialize database
console.log(`\n${colors.bright}${colors.blue}=== Step 1: Initializing database ===${colors.reset}`);

if (clearData) {
  console.log(`${colors.yellow}Clearing existing data...${colors.reset}`);
  const dbPath = path.join(dbDir, 'smart_study_space.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`${colors.green}Database cleared.${colors.reset}`);
  }
}

const initDb = spawn('node', ['src/config/initialize-db.js']);

initDb.stdout.on('data', (data) => {
  console.log(`${data}`);
});

initDb.stderr.on('data', (data) => {
  console.error(`${colors.red}${data}${colors.reset}`);
});

initDb.on('close', (code) => {
  if (code !== 0) {
    console.error(`${colors.red}Database initialization failed with code ${code}${colors.reset}`);
    process.exit(1);
  }
  
  console.log(`${colors.green}Database initialized successfully.${colors.reset}`);
  
  // Step 2: Generate test data (if specified)
  if (withTestData) {
    console.log(`\n${colors.bright}${colors.blue}=== Step 2: Generating test data ===${colors.reset}`);
    
    const genData = spawn('node', ['scripts/generate-test-data.js']);
    
    genData.stdout.on('data', (data) => {
      console.log(`${data}`);
    });
    
    genData.stderr.on('data', (data) => {
      console.error(`${colors.red}${data}${colors.reset}`);
    });
    
    genData.on('close', (code) => {
      if (code !== 0) {
        console.error(`${colors.red}Test data generation failed with code ${code}${colors.reset}`);
        process.exit(1);
      }
      
      console.log(`${colors.green}Test data generated successfully.${colors.reset}`);
      startServer();
    });
  } else {
    console.log(`${colors.yellow}Skipping test data generation.${colors.reset}`);
    startServer();
  }
});

function startServer() {
  // Step 3: Start the server
  console.log(`\n${colors.bright}${colors.blue}=== Step 3: Starting server ===${colors.reset}`);
  console.log(`${colors.cyan}Server starting...${colors.reset}`);
  
  try {
    // Set environment variables
    const env = Object.create(process.env);
    if (skipAuth) {
      env.SKIP_AUTH = 'true';
      console.log(colors.yellow('  • Authentication will be bypassed (development mode)'));
    }
    if (devMode) {
      env.NODE_ENV = 'development';
      console.log(colors.yellow('  • Running in development mode'));
    }

    const serverProcess = spawn('node', ['src/server.js'], { 
      stdio: 'inherit',
      env: env
    });
    
    serverProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`${colors.red}Server exited with code ${code}${colors.reset}`);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error(`${colors.red}Error starting server: ${error.message}${colors.reset}`);
    process.exit(1);
  }
  
  // Print access information
  console.log(`\n${colors.bright}${colors.green}=== Server started successfully! ===${colors.reset}`);
  console.log(`\n${colors.cyan}Access the application:${colors.reset}`);
  console.log(`${colors.bright}http://localhost:3000${colors.reset}`);
  console.log(`\n${colors.cyan}Admin credentials:${colors.reset}`);
  console.log(`Username: ${colors.bright}admin${colors.reset}`);
  console.log(`Password: ${colors.bright}admin123${colors.reset}`);
} 