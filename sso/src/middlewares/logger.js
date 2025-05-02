const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

morgan.token('user', (req) => {
  return req.user ? `user:${req.user.id}` : 'anonymous';
});

morgan.token('body', (req) => {
  const body = { ...req.body };
  
  if (body.password) body.password = '******';
  if (body.token) body.token = '******';
  
  return JSON.stringify(body);
});

const developmentLogger = morgan((tokens, req, res) => {
  return [
    '\x1b[36m', 
    tokens.method(req, res),
    '\x1b[0m', 
    tokens.url(req, res),
    '\x1b[33m', 
    tokens.status(req, res),
    '\x1b[0m', 
    tokens['response-time'](req, res), 'ms',
    '\x1b[32m', 
    tokens.user(req, res),
    '\x1b[0m', 
    tokens.body(req, res)
  ].join(' ');
});

const productionLogger = morgan('combined', { stream: accessLogStream });

module.exports = process.env.NODE_ENV === 'production' ? productionLogger : developmentLogger; 