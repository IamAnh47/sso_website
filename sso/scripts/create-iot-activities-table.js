const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Check which database file exists
const dbDir = path.join(__dirname, '../data');
const smartStudySpaceDbPath = path.join(dbDir, 'smart_study_space.db');
const ssoDbPath = path.join(dbDir, 'sso.db');

let dbPath;
if (fs.existsSync(smartStudySpaceDbPath)) {
  dbPath = smartStudySpaceDbPath;
  console.log('Using smart_study_space.db');
} else if (fs.existsSync(ssoDbPath)) {
  dbPath = ssoDbPath;
  console.log('Using sso.db');
} else {
  console.error('No database file found!');
  process.exit(1);
}

// Open database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log(`Connected to the database at ${dbPath}`);
});

// Create IoT device activities table
const createIoTActivitiesTable = `
CREATE TABLE IF NOT EXISTS iot_device_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'success',
  details TEXT,
  user_id INTEGER,
  FOREIGN KEY (device_id) REFERENCES iot_devices(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);`;

// Run the query to create the table
db.run(createIoTActivitiesTable, (err) => {
  if (err) {
    console.error('Error creating IoT device activities table:', err.message);
  } else {
    console.log('IoT device activities table created successfully.');
    
    // Add a few sample records if the table was just created
    const insertSampleActivities = `
    INSERT INTO iot_device_activities (device_id, action, timestamp, status, details, user_id)
    SELECT 
      d.id,
      CASE (abs(random()) % 4)
        WHEN 0 THEN 'turned on'
        WHEN 1 THEN 'turned off'
        WHEN 2 THEN 'status changed'
        WHEN 3 THEN 'setting adjusted'
      END,
      datetime('now', '-' || (abs(random()) % 100) || ' minutes'),
      CASE (abs(random()) % 5)
        WHEN 0 THEN 'warning'
        ELSE 'success'
      END,
      'Automated activity for demo purposes',
      (SELECT id FROM users ORDER BY random() LIMIT 1)
    FROM iot_devices d
    LIMIT 10;
    `;
    
    db.get('SELECT COUNT(*) as count FROM iot_device_activities', (err, row) => {
      if (!err && (!row || row.count === 0)) {
        db.run(insertSampleActivities, function(err) {
          if (err) {
            console.error('Error inserting sample activities:', err.message);
          } else {
            console.log(`Added ${this.changes} sample IoT device activities.`);
          }
          
          // Close the database connection
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err.message);
            } else {
              console.log('Database connection closed.');
            }
          });
        });
      } else {
        console.log('Table already has data, skipping sample data insertion.');
        // Close the database connection
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('Database connection closed.');
          }
        });
      }
    });
  }
}); 