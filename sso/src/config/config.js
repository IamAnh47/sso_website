require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'hcmut_smart_study_space_secret_key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  cookieSecret: process.env.COOKIE_SECRET || 'hcmut_smart_cookie_secret',
  environment: process.env.NODE_ENV || 'development',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 86400000, // 24 giờ
    sameSite: 'strict'
  }
}; 