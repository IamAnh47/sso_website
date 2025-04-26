const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

console.log('Loading userController.js');

// Lấy thông tin profile của người dùng hiện tại
exports.getProfile = async (req, res) => {
  try {
    // User đã được đưa vào req bởi middleware authenticate
    const { user } = req;
    
    // Trả về thông tin người dùng (không bao gồm mật khẩu)
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      student_id: user.student_id,
      phone: user.phone,
      department_id: user.department_id,
      role: user.role,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
};

// Cập nhật thông tin profile của người dùng hiện tại
exports.updateProfile = async (req, res) => {
  try {
    const { email, full_name, phone, department_id } = req.body;
    const { id } = req.user;
    
    // Cập nhật thông tin người dùng
    const updatedUser = await User.update(id, {
      email,
      full_name,
      phone,
      department_id,
      role: req.user.role // Giữ nguyên role
    });
    
    // Trả về thông tin người dùng đã cập nhật
    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Error updating user profile' });
  }
};

// Đổi mật khẩu của người dùng hiện tại
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, username } = req.user;
    
    // Xác thực mật khẩu hiện tại
    const user = await User.authenticate(username, currentPassword);
    if (!user) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Cập nhật mật khẩu mới
    await User.updatePassword(id, newPassword);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error changing password' });
  }
};

// [CHỈ ADMIN] Lấy danh sách tất cả người dùng
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

// [CHỈ ADMIN] Thay đổi vai trò của người dùng
exports.changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Kiểm tra role hợp lệ
    if (!['student', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Lấy thông tin người dùng hiện tại
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Cập nhật vai trò
    const updatedUser = await User.update(userId, {
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      department_id: user.department_id,
      role
    });
    
    res.json({
      message: 'User role updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({ error: 'Error changing user role' });
  }
};

// Get user roles
exports.getUserRoles = async (req, res) => {
  try {
    console.log('Inside getUserRoles function');
    // Define available user roles
    const roles = [
      { id: 1, name: 'Sinh viên', code: 'student' },
      { id: 2, name: 'Nhân viên', code: 'staff' },
      { id: 3, name: 'Quản trị viên', code: 'admin' }
    ];
    
    res.json(roles);
  } catch (error) {
    console.error('Get user roles error:', error);
    res.status(500).json({ error: 'Error fetching user roles' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove sensitive information
    delete user.password;
    
    res.json(user);
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Error fetching user details' });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { username, password, email, full_name, student_id, phone, department_id, role } = req.body;
    
    // Check if username already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    if (email) {
      const userWithEmail = await User.findByEmail(email);
      if (userWithEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    // Check if student_id already exists
    if (student_id) {
      const userWithStudentId = await User.findByStudentId(student_id);
      if (userWithStudentId) {
        return res.status(400).json({ error: 'Student ID already exists' });
      }
    }
    
    // Create new user
    const newUser = await User.create({
      username,
      password,
      email,
      full_name,
      student_id,
      phone,
      department_id,
      role: role || 'student'
    });
    
    // Remove password from response
    delete newUser.password;
    
    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Error creating user' });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, student_id, phone, department_id, role } = req.body;
    
    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email already exists
    if (email && email !== user.email) {
      const userWithEmail = await User.findByEmail(email);
      if (userWithEmail && userWithEmail.id !== user.id) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    // Check if student_id already exists
    if (student_id && student_id !== user.student_id) {
      const userWithStudentId = await User.findByStudentId(student_id);
      if (userWithStudentId && userWithStudentId.id !== user.id) {
        return res.status(400).json({ error: 'Student ID already exists' });
      }
    }
    
    // Update user
    const updatedUser = await User.update(id, {
      email: email || user.email,
      full_name: full_name || user.full_name,
      student_id: student_id || user.student_id,
      phone: phone || user.phone,
      department_id: department_id || user.department_id,
      role: role || user.role
    });
    
    // Remove password from response
    delete updatedUser.password;
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Error updating user' });
  }
};

// Update user password
exports.updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;
    
    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    await User.updatePassword(id, new_password);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Error updating password' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Cannot delete self
    if (req.user && req.user.id === user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    // Delete user
    await User.delete(id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
}; 