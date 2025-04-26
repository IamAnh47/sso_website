# Smart Study Space (SSO)

A comprehensive web application for managing and booking study spaces and classrooms at universities. This system allows students to book rooms, staff to manage bookings and rooms, and administrators to view statistics and manage the system.

## Features

- User authentication and authorization (students, staff, admin)
- Room management (add, edit, delete rooms)
- Room booking with various statuses (pending, confirmed, in-use, completed, cancelled)
- Interactive dashboard for admins and staff
- Statistics and analytics
- Responsive design for all devices

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation Steps

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/smart-study-space.git
   cd smart-study-space
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up and run the application (choose one of the following options):

   a. Basic setup (without test data):
   ```
   npm run setup
   ```

   b. Setup with test data (recommended for first-time use):
   ```
   npm run setup:test
   ```

   c. Fresh setup (clears existing data and generates new test data):
   ```
   npm run setup:fresh
   ```

4. Access the application:
   ```
   http://localhost:3000
   ```

### Manual Setup

If you prefer to set up each component separately:

1. Create the database directory:
   ```
   mkdir -p data
   ```

2. Initialize the database:
   ```
   node src/config/initialize-db.js
   ```

3. Generate test data (optional):
   ```
   node scripts/generate-test-data.js
   ```

4. Start the server:
   ```
   npm start
   ```

## Admin User

An admin user is created automatically when initializing the database:
- Username: admin
- Password: admin123

## Pages

### Main Pages

- `/` - Homepage and login
- `/dashboard` - User dashboard
- `/admin` - Admin dashboard

### Admin Pages

- `/admin-user-management.html` - User management
- `/admin-room-management.html` - Room management
- `/admin-room-details.html` - Room details
- `/admin-statistics.html` - Statistics and analytics

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

### Rooms

- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get room by ID
- `POST /api/rooms` - Create a new room
- `PUT /api/rooms/:id` - Update room by ID
- `DELETE /api/rooms/:id` - Delete room by ID

### Bookings

- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create a new booking
- `PUT /api/bookings/:id` - Update booking by ID
- `DELETE /api/bookings/:id` - Delete booking by ID

### Statistics

- `GET /api/statistics` - Get overall statistics
- `GET /api/statistics/rooms` - Get room usage statistics
- `GET /api/statistics/users` - Get user booking statistics

## Technologies

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: SQLite
- Authentication: JWT
- Charts: Chart.js

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- HCMUT for the inspiration and requirements
- Icons from Font Awesome
- Charts from Chart.js

## Hướng dẫn khởi tạo hệ thống

### Khởi tạo database và tài khoản
```
npm run init
```

Script này sẽ:
- Kiểm tra database hiện tại và cho phép xóa để tạo mới nếu cần
- Tạo tất cả các bảng cần thiết
- Tạo sẵn 3 tài khoản mặc định (admin, staff, user)
- Hỏi bạn có muốn tạo thêm tài khoản tùy chỉnh không

### Cập nhật cấu trúc bảng thông báo
```
node scripts/update-notifications-table.js
```

Lệnh này sẽ tạo hoặc cập nhật bảng thông báo để hỗ trợ tính năng gửi thông báo từ admin.

### Chạy ứng dụng ở chế độ phát triển (bỏ qua xác thực)
```
npm run dev:skip-auth
```

### Chạy ứng dụng bình thường
```
npm start
```

## Thông tin tài khoản mặc định

- **Admin**: 
  - Username: admin
  - Password: admin123

- **Staff**:
  - Username: staff
  - Password: staff123

- **Student**:
  - Username: user
  - Password: user123

## Tính năng mới: Gửi thông báo từ admin

Hệ thống đã bổ sung tính năng gửi thông báo từ admin đến người dùng:

1. **Truy cập tính năng**: Admin và staff có thể truy cập trang quản lý thông báo tại `/admin-notifications.html`

2. **Các chức năng chính**:
   - Gửi thông báo đến một người dùng cụ thể
   - Gửi thông báo đến nhiều người dùng được chọn
   - Gửi thông báo đến tất cả người dùng trong hệ thống
   - Xem lịch sử thông báo đã gửi

3. **API endpoints**:
   - `GET /api/notifications/` - Lấy thông báo của người dùng hiện tại
   - `GET /api/notifications/unread/count` - Lấy số lượng thông báo chưa đọc
   - `GET /api/notifications/history` - Lấy lịch sử thông báo (admin/staff)
   - `POST /api/notifications/send` - Gửi thông báo đến một người dùng
   - `POST /api/notifications/send-bulk` - Gửi thông báo đến nhiều người dùng
   - `PUT /api/notifications/:id/read` - Đánh dấu thông báo đã đọc
   - `POST /api/notifications/mark-all-read` - Đánh dấu tất cả thông báo đã đọc
   - `DELETE /api/notifications/:id` - Xóa thông báo 