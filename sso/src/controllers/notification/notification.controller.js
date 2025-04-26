const User = require('../../models/user.model');

/**
 * Tạo thông báo cho một người dùng
 */
exports.createNotification = async (req, res) => {
    try {
        const { user_id, title, message } = req.body;

        if (!user_id || !title || !message) {
            return res.status(400).json({ error: 'Thiếu thông tin: user_id, title, và message là bắt buộc' });
        }

        // Kiểm tra người dùng tồn tại
        const userExists = await User.findById(user_id).exec();
        if (!userExists) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        }

        // TODO: Lưu thông báo vào database - tạm thời trả về thành công
        // Trong phần hoàn chỉnh, bạn sẽ tạo một notification model và lưu vào đó

        return res.status(201).json({
            success: true,
            notification: {
                id: Date.now().toString(),
                user_id,
                title,
                message,
                created_at: new Date().toISOString(),
                type: 'info',
                recipient_type: 'single',
                recipient_name: userExists.full_name || userExists.username
            }
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        return res.status(500).json({ error: 'Lỗi server khi tạo thông báo' });
    }
};

/**
 * Tạo thông báo cho nhiều người dùng hoặc tất cả người dùng
 */
exports.createBulkNotifications = async (req, res) => {
    try {
        const { user_ids, all_users, exclude_admins, title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Thiếu thông tin: title và message là bắt buộc' });
        }

        // Kiểm tra nếu không có user_ids và không phải gửi cho tất cả
        if (!user_ids && !all_users) {
            return res.status(400).json({ error: 'Phải cung cấp user_ids hoặc all_users=true' });
        }

        // TODO: Lưu thông báo vào database - tạm thời trả về thành công
        let recipientType = 'multiple';
        let recipientCount = 0;

        if (all_users) {
            recipientType = 'all';
            // TODO: Trong phần hoàn chỉnh, đếm số người dùng trong hệ thống
            recipientCount = 100; // Giả sử có 100 người dùng
        } else if (user_ids && Array.isArray(user_ids)) {
            recipientCount = user_ids.length;
        }

        return res.status(201).json({
            success: true,
            notification: {
                id: Date.now().toString(),
                title,
                message,
                created_at: new Date().toISOString(),
                type: 'info',
                recipient_type: recipientType,
                recipient_count: recipientCount
            }
        });
    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        return res.status(500).json({ error: 'Lỗi server khi tạo thông báo hàng loạt' });
    }
};

/**
 * Lấy lịch sử thông báo
 */
exports.getNotificationHistory = async (req, res) => {
    try {
        // TODO: Lấy lịch sử thông báo từ database
        
        // Tạm thời trả về dữ liệu mẫu
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

        return res.json(mockNotifications);
    } catch (error) {
        console.error('Error getting notification history:', error);
        return res.status(500).json({ error: 'Lỗi server khi lấy lịch sử thông báo' });
    }
}; 