const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, isAdmin, isStaff } = require('../middlewares/auth');

// Get user roles
router.get('/roles', userController.getUserRoles);

// Get current user profile
router.get('/profile', authenticate, userController.getProfile);

// Update current user profile
router.put('/profile', authenticate, userController.updateProfile);

// Change password
router.put('/change-password', authenticate, userController.changePassword);

// [CHỈ ADMIN] Get all users
router.get('/', authenticate, isAdmin, userController.getAllUsers);

// [CHỈ ADMIN] Get user by ID
router.get('/:id', authenticate, isAdmin, userController.getUserById);

// [CHỈ ADMIN] Create new user
router.post('/', authenticate, isAdmin, userController.createUser);

// [CHỈ ADMIN] Update user
router.put('/:id', authenticate, isAdmin, userController.updateUser);

// [CHỈ ADMIN] Delete user
router.delete('/:id', authenticate, isAdmin, userController.deleteUser);

// [CHỈ ADMIN] Change user role
router.patch('/:id/role', authenticate, isAdmin, userController.changeUserRole);

// [CHỈ ADMIN] Update user password
router.put('/:id/password', authenticate, isAdmin, userController.updateUserPassword);

module.exports = router; 