const User = require('../models/User');
const Session = require('../models/Session');
const bcrypt = require('bcrypt');
const config = require('../config/config');

// Đăng ký người dùng mới
exports.register = async (req, res) => {
  try {
    const { username, password, email, full_name, student_id, phone, department_id } = req.body;
    
    // Kiểm tra xem username đã tồn tại chưa
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Kiểm tra xem student_id đã tồn tại chưa
    if (student_id) {
      const existingStudentId = await User.findByStudentId(student_id);
      if (existingStudentId) {
        return res.status(400).json({ error: 'Student ID already exists' });
      }
    }
    
    // Tạo người dùng mới
    const newUser = await User.create({
      username,
      password,
      email,
      full_name,
      student_id,
      phone,
      department_id
    });
    
    // Trả về thông tin người dùng (không bao gồm mật khẩu)
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

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Xác thực người dùng
    const user = await User.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Tạo session mới
    const session = await Session.create(user.id);
    
    console.log('Created new session with token:', session.token.substring(0, 10) + '...');
    
    // Lưu token vào HTTP-only cookie
    const cookieOptions = {
      ...config.cookie,
      path: '/'
    };
    
    console.log('Setting cookie with options:', JSON.stringify(cookieOptions));
    res.cookie('token', session.token, cookieOptions);
    
    // Trả về thông tin người dùng (không bao gồm token)
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

// Đăng xuất
exports.logout = async (req, res) => {
  try {
    // Lấy token từ cookie
    const token = req.cookies.token;
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }
    
    console.log('Logging out user with token:', token.substring(0, 10) + '...');
    
    // Xoá session
    await Session.delete(token);
    
    // Xoá cookie với đúng các options giống khi tạo cookie
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
    // Vẫn xóa cookie ngay cả khi có lỗi
    res.clearCookie('token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.status(500).json({ error: 'Error during logout', message: 'Logout processed' });
  }
};

// Kiểm tra token có hợp lệ không và trả về thông tin người dùng
exports.verify = async (req, res) => {
  try {
    // User đã được đưa vào req bởi middleware authenticate
    const { user } = req;
    
    // Trả về thông tin người dùng
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