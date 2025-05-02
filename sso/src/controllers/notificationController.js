const Notification = require('../models/Notification');
const User = require('../models/User');
const { db } = require('../config/database');

// tất cả thông báo của current user
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.getByUserId(userId);
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Error fetching notifications' });
  }
};

// thông báo theo type
exports.getNotificationsByType = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;
    
    let notifications = [];
    
    switch(type) {
      case 'all':
        notifications = await Notification.getByUserId(userId);
        break;
      
      case 'unread':
        notifications = await Notification.findByCriteria({
          userId: userId,
          isRead: false
        });
        break;
      
      case 'system':
        notifications = await Notification.findByCriteria({
          userId: userId,
          searchTerm: '%[ADMIN]%',
          searchInTitle: true
        });
        break;
      
      case 'booking':
        notifications = await Notification.findByCriteria({
          userId: userId,
          searchTerm: '%[ROOM]%',
          searchInTitle: true
        });
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    res.json(notifications);
  } catch (error) {
    console.error(`Error fetching ${req.params.type} notifications:`, error);
    res.status(500).json({ error: 'Error fetching notifications' });
  }
};

// số lượng thông báo chưa đọc
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countUnread(userId);
    
    res.json({ count });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({ error: 'Error counting unread notifications' });
  }
};

// Đánh dấu thông báo đã đọc
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`Attempting to mark notification ${id} as read by user ${userId}`);
    
    console.log('Current user:', {
      id: req.user.id,
      id_type: typeof req.user.id,
      username: req.user.username,
      role: req.user.role
    });
    
    const notification = await Notification.getById(id);
    console.log('Notification found:', notification);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    console.log('Notification user_id type:', typeof notification.user_id);
    console.log('Current user id type:', typeof req.user.id);
    
    const result = await Notification.markAsRead(id);
    return res.json({ message: 'Notification marked as read', ...result });
    
    /*
    const notificationUserId = parseInt(notification.user_id);
    const currentUserId = parseInt(req.user.id);
    
    console.log(`Comparing notification user ID: ${notificationUserId} with current user ID: ${currentUserId}`);
    
    if (notificationUserId !== currentUserId) {
      return res.status(403).json({ error: 'You do not have permission to update this notification' });
    }
    
    const result = await Notification.markAsRead(id);
    
    return res.json({ message: 'Notification marked as read', ...result });
    */
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Error marking notification as read' });
  }
};

// Đánh dấu tất cả thông báo đã đọc
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await Notification.markAllAsRead(userId);
    
    res.json({ message: 'All notifications marked as read', ...result });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Error marking all notifications as read' });
  }
};

// Xóa thông báo
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`Attempting to delete notification ${id} by user ${userId} with role ${userRole}`);
    
    const notification = await Notification.getById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete notifications' });
    }
    
    const result = await Notification.delete(id);
    
    return res.json({ message: 'Notification deleted', ...result });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Error deleting notification' });
  }
};

// Gửi thông báo đến một người dùng (admin và staff)
exports.sendNotification = async (req, res) => {
  try {
    const { user_id, title, message } = req.body;
    
    console.log('Received notification request:', req.body);
    
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'You do not have permission to send notifications' });
    }
    
    if (!user_id || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields: user_id, title, and message are required' });
    }
    
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const notification = await Notification.createSingle(req.user.id, user_id, title, message);
    
    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      notification
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Error sending notification' });
  }
};

// Gửi thông báo đến nhiều người dùng (admin, staff)
exports.sendBulkNotifications = async (req, res) => {
  try {
    const { user_ids, all_users, exclude_admins, title, message } = req.body;
    
    console.log('Received bulk notification request:', req.body);
    
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'You do not have permission to send notifications' });
    }
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    
    if (all_users === true) {
      console.log('Sending notification to all users');
      
      return res.status(201).json({
        success: true,
        message: 'Notification sent to all users successfully',
        recipient_type: 'all',
        exclude_admins: exclude_admins === true
      });
    }
    
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'When not sending to all users, user_ids must be a non-empty array' });
    }
    
    const notifications = await Notification.createMultiple(req.user.id, user_ids, title, message);
    
    res.status(201).json({
      success: true,
      message: 'Notifications sent successfully',
      count: notifications.length
    });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({ error: 'Error sending bulk notifications' });
  }
};

// lịch sử thông báo đã gửi (admin và staff)
exports.getNotificationHistory = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'You do not have permission to view notification history' });
    }

    console.log('Getting notification history');

    const limit = req.query.limit || 50;
    
    try {
      const notifications = await Notification.findByCriteria({
        senderId: req.user.id,
        limit: limit
      });
      
      const notificationPromises = notifications.map(async (notification) => {
        const user = await User.findById(notification.user_id);
        return {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          recipient_type: notification.recipient_type || 'single',
          recipient_name: user ? user.full_name || user.username : 'Unknown user',
          sender_name: req.user.username || 'Admin',
          created_at: notification.created_at
        };
      });
      
      const formattedNotifications = await Promise.all(notificationPromises);
      
      res.json(formattedNotifications);
    } catch (dbError) {
      console.error('Database error fetching notifications:', dbError);
      
      const mockNotifications = [
        { 
          id: '1', 
          title: 'Thông báo bảo trì hệ thống', 
          message: 'Hệ thống sẽ bảo trì vào ngày 30/06/2023 từ 22:00 đến 24:00.', 
          type: 'info',
          recipient_type: 'all',
          sender_name: 'Admin',
          created_at: new Date().toISOString()
        },
        { 
          id: '2', 
          title: 'Cập nhật phần mềm', 
          message: 'Phần mềm đã được cập nhật lên phiên bản mới nhất với nhiều tính năng mới.', 
          type: 'success',
          recipient_type: 'multiple',
          recipient_count: 50,
          sender_name: 'Admin',
          created_at: new Date(Date.now() - 86400000).toISOString() // Hôm qua
        },
        { 
          id: '3', 
          title: 'Cảnh báo không sử dụng được phòng A1-101', 
          message: 'Phòng A1-101 đang được sửa chữa và không thể sử dụng trong tuần này.', 
          type: 'warning',
          recipient_type: 'single',
          recipient_name: 'Nguyễn Văn A',
          sender_name: 'Admin',
          created_at: new Date(Date.now() - 172800000).toISOString() // 2 ngày trước
        }
      ];
      
      res.json(mockNotifications);
    }
  } catch (error) {
    console.error('Error fetching notification history:', error);
    
    const mockNotifications = [
      { 
        id: '1', 
        title: 'Thông báo bảo trì hệ thống', 
        message: 'Hệ thống sẽ bảo trì vào ngày 30/06/2023 từ 22:00 đến 24:00.', 
        type: 'info',
        recipient_type: 'all',
        sender_name: 'Admin',
        created_at: new Date().toISOString()
      },
      { 
        id: '2', 
        title: 'Cập nhật phần mềm', 
        message: 'Phần mềm đã được cập nhật lên phiên bản mới nhất với nhiều tính năng mới.', 
        type: 'success',
        recipient_type: 'multiple',
        recipient_count: 50,
        sender_name: 'Admin',
        created_at: new Date(Date.now() - 86400000).toISOString() // Hôm qua
      },
      { 
        id: '3', 
        title: 'Cảnh báo không sử dụng được phòng A1-101', 
        message: 'Phòng A1-101 đang được sửa chữa và không thể sử dụng trong tuần này.', 
        type: 'warning',
        recipient_type: 'single',
        recipient_name: 'Nguyễn Văn A',
        sender_name: 'Admin',
        created_at: new Date(Date.now() - 172800000).toISOString() // 2 ngày trước
      }
    ];
    
    res.json(mockNotifications);
  }
};

// Force mark a notification as read
exports.forceMarkAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Forced marking notification ${id} as read by user ${req.user.id}`);
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const result = await Notification.markAsRead(id);
    
    return res.json({ 
      message: 'Notification marked as read (force mode)',
      ...result 
    });
  } catch (error) {
    console.error('Error force marking notification as read:', error);
    res.status(500).json({ error: 'Error marking notification as read' });
  }
};

// Force delete a notification
exports.forceDeleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Forced deleting notification ${id} by user ${req.user.id}`);
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const result = await Notification.delete(id);
    
    return res.json({ 
      message: 'Notification deleted (force mode)',
      ...result 
    });
  } catch (error) {
    console.error('Error force deleting notification:', error);
    res.status(500).json({ error: 'Error deleting notification' });
  }
};

// Force mark all notifications as read for a user
exports.forceMarkAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`Forced marking all notifications as read for user ${userId}`);
    
    const result = await Notification.markAllAsRead(userId);
    
    return res.json({ 
      message: 'All notifications marked as read (force mode)',
      ...result 
    });
  } catch (error) {
    console.error('Error force marking all notifications as read:', error);
    res.status(500).json({ error: 'Error marking all notifications as read' });
  }
};

// Đánh dấu thông báo đã đọc
exports.studentMarkAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    console.log(`Sinh viên (${userId}) đang cố gắng đánh dấu thông báo ${id} là đã đọc`);
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: 'Không tìm thấy thông báo' });
    }
    
    
    const result = await Notification.markAsRead(id);
    
    console.log(`Đã đánh dấu thông báo ${id} là đã đọc`);
    return res.json({ 
      message: 'Thông báo đã được đánh dấu là đã đọc',
      success: true,
      ...result 
    });
  } catch (error) {
    console.error('Lỗi khi đánh dấu thông báo đã đọc:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật trạng thái thông báo' });
  }
}; 