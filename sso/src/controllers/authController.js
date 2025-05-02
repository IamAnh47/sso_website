const User = require('../models/User');
const Session = require('../models/Session');
const bcrypt = require('bcrypt');
const config = require('../config/config');

// Register
exports.register = async (req, res) => {
  try {
    const { username, password, email, full_name, student_id, phone, department_id } = req.body;
    
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    if (student_id) {
      const existingStudentId = await User.findByStudentId(student_id);
      if (existingStudentId) {
        return res.status(400).json({ error: 'Student ID already exists' });
      }
    }
    
    const newUser = await User.create({
      username,
      password,
      email,
      full_name,
      student_id,
      phone,
      department_id
    });
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        student_id: newUser.student_id,
        phone: newUser.phone,
        department_id: newUser.department_id,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const session = await Session.create(user.id);
    
    console.log('Created new session with token:', session.token.substring(0, 10) + '...');
    
    const cookieOptions = {
      ...config.cookie,
      path: '/'
    };
    
    console.log('Setting cookie with options:', JSON.stringify(cookieOptions));
    res.cookie('token', session.token, cookieOptions);
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        student_id: user.student_id,
        phone: user.phone,
        department_id: user.department_id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error during login' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }
    
    console.log('Logging out user with token:', token.substring(0, 10) + '...');
    
    await Session.delete(token);
    
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    console.log('Clearing cookie with options:', JSON.stringify(cookieOptions));
    res.clearCookie('token', cookieOptions);
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.clearCookie('token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.status(500).json({ error: 'Error during logout', message: 'Logout processed' });
  }
};

// Check if token is valid and return user inf
exports.verify = async (req, res) => {
  try {
    const { user } = req;
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        student_id: user.student_id,
        phone: user.phone,
        department_id: user.department_id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Error verifying token' });
  }
}; 