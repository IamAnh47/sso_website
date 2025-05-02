const app = require('./app');
const config = require('./config/config');

// Start the server
const port = process.env.PORT || config.port || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 