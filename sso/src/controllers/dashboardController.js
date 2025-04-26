const Room = require('../models/Room');
const Booking = require('../models/Booking');
const RoomActivity = require('../models/RoomActivity');
const User = require('../models/User');
const IoTDevice = require('../models/IoTDevice');
const Notification = require('../models/Notification');

// Lấy dữ liệu tổng quan cho dashboard
exports.getDashboardData = async (req, res) => {
  try {
    // Lấy tham số filter
    const { startDate, endDate } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || today;
    
    // Lấy thống kê hoạt động phòng
    const roomStats = await RoomActivity.getActivityStats(start, end);
    
    // Lấy danh sách các đặt chỗ trong ngày
    const bookings = await Booking.getAll({ date: today });
    
    // Đếm số bookings theo trạng thái
    const bookingStatusCount = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      in_use: bookings.filter(b => b.status === 'in_use').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };
    
    // Lấy tất cả phòng
    const rooms = await Room.getAll();
    const roomStatusCount = {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'available').length,
      unavailable: rooms.filter(r => r.status === 'unavailable').length,
      maintenance: rooms.filter(r => r.status === 'maintenance').length
    };
    
    // Tính trung bình thời gian sử dụng (giả lập)
    const avgUsageTime = calculateAverageUsageTime(bookings);
    
    // Trả về dữ liệu tổng hợp
    res.json({
      roomStats,
      bookingStatusCount,
      roomStatusCount,
      avgUsageTime,
      topRooms: roomStats.slice(0, 5), // Top 5 phòng được sử dụng nhiều nhất
      date: {
        start,
        end,
        today
      }
    });
  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({ error: 'Error fetching dashboard data' });
  }
};

// Lấy thống kê sử dụng phòng theo phân loại
exports.getRoomUsageStats = async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    
    // Mặc định lấy thống kê trong tháng hiện tại
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const start = startDate || firstDayOfMonth;
    const end = endDate || lastDayOfMonth;
    
    // Lấy tất cả bookings trong khoảng thời gian
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
    // Thống kê sử dụng theo phân loại
    let stats;
    
    switch (groupBy) {
      case 'room_type':
        stats = groupBookingsByRoomType(bookings);
        break;
      case 'location':
        stats = groupBookingsByLocation(bookings);
        break;
      case 'day_of_week':
        stats = groupBookingsByDayOfWeek(bookings);
        break;
      case 'time_of_day':
        stats = groupBookingsByTimeOfDay(bookings);
        break;
      default:
        stats = groupBookingsByDate(bookings);
    }
    
    res.json({
      period: { start, end },
      stats
    });
  } catch (error) {
    console.error('Get room usage stats error:', error);
    res.status(500).json({ error: 'Error fetching room usage statistics' });
  }
};

// Các hàm helper

// Tính thời gian sử dụng trung bình của các phòng
function calculateAverageUsageTime(bookings) {
  try {
    const completedBookings = bookings.filter(b => b.status === 'completed');
    
    if (completedBookings.length === 0) {
      return 0;
    }
    
    const totalMinutes = completedBookings.reduce((sum, booking) => {
      if (!booking.start_time || !booking.end_time) return sum;
      
      const startTime = parseTimeToMinutes(booking.start_time);
      const endTime = parseTimeToMinutes(booking.end_time);
      
      if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
        return sum;
      }
      
      return sum + (endTime - startTime);
    }, 0);
    
    return Math.round(totalMinutes / completedBookings.length);
  } catch (error) {
    console.error('Error calculating average usage time:', error);
    return 0;
  }
}

// Chuyển đổi thời gian sang phút
function parseTimeToMinutes(timeString) {
  try {
    if (!timeString || typeof timeString !== 'string') {
      return 0;
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      return 0;
    }
    return hours * 60 + minutes;
  } catch (error) {
    console.error('Error parsing time:', error, 'Input:', timeString);
    return 0;
  }
}

// Nhóm bookings theo loại phòng
function groupBookingsByRoomType(bookings) {
  const stats = {};
  
  bookings.forEach(booking => {
    const roomType = booking.room_type || 'unknown';
    
    if (!stats[roomType]) {
      stats[roomType] = {
        count: 0,
        completed: 0,
        cancelled: 0
      };
    }
    
    stats[roomType].count++;
    
    if (booking.status === 'completed') {
      stats[roomType].completed++;
    } else if (booking.status === 'cancelled') {
      stats[roomType].cancelled++;
    }
  });
  
  return Object.entries(stats).map(([type, data]) => ({
    room_type: type,
    ...data
  }));
}

// Nhóm bookings theo vị trí
function groupBookingsByLocation(bookings) {
  const stats = {};
  
  bookings.forEach(booking => {
    const location = booking.location || 'unknown';
    
    if (!stats[location]) {
      stats[location] = {
        count: 0,
        completed: 0,
        cancelled: 0
      };
    }
    
    stats[location].count++;
    
    if (booking.status === 'completed') {
      stats[location].completed++;
    } else if (booking.status === 'cancelled') {
      stats[location].cancelled++;
    }
  });
  
  return Object.entries(stats).map(([location, data]) => ({
    location,
    ...data
  }));
}

// Nhóm bookings theo ngày trong tuần
function groupBookingsByDayOfWeek(bookings) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const stats = {};
  
  // Khởi tạo tất cả các ngày trong tuần
  daysOfWeek.forEach(day => {
    stats[day] = {
      count: 0,
      completed: 0,
      cancelled: 0
    };
  });
  
  bookings.forEach(booking => {
    const date = new Date(booking.booking_date);
    const dayOfWeek = daysOfWeek[date.getDay()];
    
    stats[dayOfWeek].count++;
    
    if (booking.status === 'completed') {
      stats[dayOfWeek].completed++;
    } else if (booking.status === 'cancelled') {
      stats[dayOfWeek].cancelled++;
    }
  });
  
  return Object.entries(stats).map(([day, data]) => ({
    day,
    ...data
  }));
}

// Nhóm bookings theo thời gian trong ngày
function groupBookingsByTimeOfDay(bookings) {
  try {
    const timeSlots = {
      'Morning (6:00-12:00)': { start: 6, end: 12, count: 0, completed: 0, cancelled: 0 },
      'Afternoon (12:00-18:00)': { start: 12, end: 18, count: 0, completed: 0, cancelled: 0 },
      'Evening (18:00-24:00)': { start: 18, end: 24, count: 0, completed: 0, cancelled: 0 }
    };
    
    bookings.forEach(booking => {
      if (!booking.start_time) return;
      
      try {
        const startHour = parseInt(booking.start_time.split(':')[0]);
        if (isNaN(startHour)) return;
        
        for (const [slot, data] of Object.entries(timeSlots)) {
          if (startHour >= data.start && startHour < data.end) {
            data.count++;
            
            if (booking.status === 'completed') {
              data.completed++;
            } else if (booking.status === 'cancelled') {
              data.cancelled++;
            }
            
            break;
          }
        }
      } catch (e) {
        console.error('Error processing booking time:', e, booking);
      }
    });
    
    return Object.entries(timeSlots).map(([slot, data]) => ({
      time_slot: slot,
      count: data.count,
      completed: data.completed,
      cancelled: data.cancelled
    }));
  } catch (error) {
    console.error('Error grouping bookings by time of day:', error);
    return [
      { time_slot: 'Morning (6:00-12:00)', count: 0, completed: 0, cancelled: 0 },
      { time_slot: 'Afternoon (12:00-18:00)', count: 0, completed: 0, cancelled: 0 },
      { time_slot: 'Evening (18:00-24:00)', count: 0, completed: 0, cancelled: 0 }
    ];
  }
}

// Nhóm bookings theo ngày
function groupBookingsByDate(bookings) {
  const stats = {};
  
  bookings.forEach(booking => {
    const date = booking.booking_date;
    
    if (!stats[date]) {
      stats[date] = {
        count: 0,
        completed: 0,
        cancelled: 0
      };
    }
    
    stats[date].count++;
    
    if (booking.status === 'completed') {
      stats[date].completed++;
    } else if (booking.status === 'cancelled') {
      stats[date].cancelled++;
    }
  });
  
  return Object.entries(stats).map(([date, data]) => ({
    date,
    ...data
  })).sort((a, b) => a.date.localeCompare(b.date));
}

// Add new endpoints for admin statistics

// API endpoint for overall dashboard stats
exports.getAdminDashboardStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Get current date
    const today = new Date();
    
    // Set date range based on period
    let startDate, endDate, prevStartDate, prevEndDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        // Previous day
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate = new Date(prevStartDate);
        prevEndDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        // Previous week
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        prevEndDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); // Jan 1st of current year
        endDate = new Date(today);
        // Previous year
        prevStartDate = new Date(today.getFullYear() - 1, 0, 1);
        prevEndDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
        endDate = new Date(today);
        // Previous month
        prevStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        prevEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }
    
    // Format dates for database queries
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    const prevStart = prevStartDate.toISOString().split('T')[0];
    const prevEnd = prevEndDate.toISOString().split('T')[0];
    
    // Get current period bookings
    const currentBookings = await Booking.getAll({
      date: { start, end }
    });
    
    // Get previous period bookings for comparison
    const prevBookings = await Booking.getAll({
      date: { start: prevStart, end: prevEnd }
    });
    
    // Calculate statistics
    const totalBookings = currentBookings.length;
    const prevTotalBookings = prevBookings.length;
    
    // Calculate booking trend percentage
    let bookingTrendPercentage = 0;
    if (prevTotalBookings > 0) {
      bookingTrendPercentage = ((totalBookings - prevTotalBookings) / prevTotalBookings) * 100;
    }
    
    // Get all rooms
    const rooms = await Room.getAll();
    
    // Calculate room usage rate
    const bookingsByRoom = {};
    currentBookings.forEach(booking => {
      if (!bookingsByRoom[booking.room_id]) {
        bookingsByRoom[booking.room_id] = [];
      }
      bookingsByRoom[booking.room_id].push(booking);
    });
    
    // Calculate actual usage rate based on hours booked vs available hours
    const hoursInPeriod = getAvailableHours(startDate, endDate);
    let totalUsageHours = 0;
    let totalPossibleHours = rooms.length * hoursInPeriod;
    
    Object.values(bookingsByRoom).forEach(roomBookings => {
      roomBookings.forEach(booking => {
        try {
          if (!booking.start_time || !booking.end_time) return;
          
          const startHour = parseInt(booking.start_time.split(':')[0]);
          const endHour = parseInt(booking.end_time.split(':')[0]);
          
          if (isNaN(startHour) || isNaN(endHour) || startHour >= endHour) {
            return;
          }
          
          const duration = endHour - startHour;
          totalUsageHours += duration;
        } catch (error) {
          console.error('Error calculating booking duration:', error, booking);
        }
      });
    });
    
    const roomUsageRate = Math.round((totalUsageHours / totalPossibleHours) * 100);
    
    // Calculate previous usage rate for comparison
    const prevBookingsByRoom = {};
    prevBookings.forEach(booking => {
      if (!prevBookingsByRoom[booking.room_id]) {
        prevBookingsByRoom[booking.room_id] = [];
      }
      prevBookingsByRoom[booking.room_id].push(booking);
    });
    
    const prevHoursInPeriod = getAvailableHours(prevStartDate, prevEndDate);
    let prevTotalUsageHours = 0;
    let prevTotalPossibleHours = rooms.length * prevHoursInPeriod;
    
    Object.values(prevBookingsByRoom).forEach(roomBookings => {
      roomBookings.forEach(booking => {
        try {
          if (!booking.start_time || !booking.end_time) return;
          
          const startHour = parseInt(booking.start_time.split(':')[0]);
          const endHour = parseInt(booking.end_time.split(':')[0]);
          
          if (isNaN(startHour) || isNaN(endHour) || startHour >= endHour) {
            return;
          }
          
          const duration = endHour - startHour;
          prevTotalUsageHours += duration;
        } catch (error) {
          console.error('Error calculating previous booking duration:', error, booking);
        }
      });
    });
    
    const prevRoomUsageRate = Math.round((prevTotalUsageHours / prevTotalPossibleHours) * 100);
    
    // Calculate usage rate trend
    let usageRateTrendPercentage = 0;
    if (prevRoomUsageRate > 0) {
      usageRateTrendPercentage = roomUsageRate - prevRoomUsageRate;
    }
    
    // Calculate average usage time
    const completedBookings = currentBookings.filter(b => b.status === 'completed' || b.status === 'in_use');
    let totalBookingHours = 0;
    
    completedBookings.forEach(booking => {
      const startHour = parseInt(booking.start_time.split(':')[0]);
      const endHour = parseInt(booking.end_time.split(':')[0]);
      const duration = endHour - startHour;
      totalBookingHours += duration;
    });
    
    const avgUsageTime = completedBookings.length > 0 
      ? Math.round((totalBookingHours / completedBookings.length) * 10) / 10 
      : 0;
    
    // Calculate previous average usage time
    const prevCompletedBookings = prevBookings.filter(b => b.status === 'completed' || b.status === 'in_use');
    let prevTotalBookingHours = 0;
    
    prevCompletedBookings.forEach(booking => {
      const startHour = parseInt(booking.start_time.split(':')[0]);
      const endHour = parseInt(booking.end_time.split(':')[0]);
      const duration = endHour - startHour;
      prevTotalBookingHours += duration;
    });
    
    const prevAvgUsageTime = prevCompletedBookings.length > 0 
      ? Math.round((prevTotalBookingHours / prevCompletedBookings.length) * 10) / 10 
      : 0;
    
    // Calculate average time trend
    const avgTimeTrendHours = Math.round((avgUsageTime - prevAvgUsageTime) * 10) / 10;
    
    // Calculate cancellation rate
    const cancelledBookings = currentBookings.filter(b => b.status === 'cancelled');
    const cancellationRate = Math.round((cancelledBookings.length / Math.max(totalBookings, 1)) * 100);
    
    // Calculate previous cancellation rate
    const prevCancelledBookings = prevBookings.filter(b => b.status === 'cancelled');
    const prevCancellationRate = Math.round((prevCancelledBookings.length / Math.max(prevTotalBookings, 1)) * 100);
    
    // Calculate cancellation rate trend
    const cancellationTrendPercentage = cancellationRate - prevCancellationRate;
    
    res.json({
      period,
      dateRange: { start, end },
      totalBookings,
      bookingTrendPercentage: Math.round(bookingTrendPercentage * 10) / 10,
      roomUsageRate,
      usageRateTrendPercentage,
      avgUsageTime,
      avgTimeTrendHours,
      cancellationRate,
      cancellationTrendPercentage
    });
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    res.status(500).json({ error: 'Error fetching dashboard statistics' });
  }
};

// API endpoint for booking trend chart data
exports.getBookingTrends = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Get current date
    const today = new Date();
    
    // Set date range and interval based on period
    let startDate, endDate, interval, format;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        interval = 'hour';
        format = 'HH:00';
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        interval = 'day';
        format = 'ddd';
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); // Jan 1st of current year
        endDate = new Date(today.getFullYear(), 11, 31); // Dec 31st
        interval = 'month';
        format = 'MMM';
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
        interval = 'day';
        format = 'DD';
        break;
    }
    
    // Format dates for database queries
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    // Get bookings for the period
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
    // Generate data points based on interval
    let labels = [];
    let data = [];
    
    if (interval === 'hour') {
      // Hourly data for a day
      for (let hour = 8; hour <= 20; hour++) { // Assuming operation hours 8am-8pm
        const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
        labels.push(hourLabel);
        
        const hourlyBookings = bookings.filter(booking => {
          const bookingHour = parseInt(booking.start_time.split(':')[0]);
          return bookingHour === hour;
        });
        
        data.push(hourlyBookings.length);
      }
    } else if (interval === 'day' && period === 'week') {
      // Daily data for a week (Sunday to Saturday)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      for (let i = 0; i < 7; i++) {
        labels.push(days[i]);
        
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        const dailyBookings = bookings.filter(booking => booking.booking_date === dateString);
        data.push(dailyBookings.length);
      }
    } else if (interval === 'day' && period === 'month') {
      // Daily data for a month
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        labels.push(day.toString());
        
        const date = new Date(today.getFullYear(), today.getMonth(), day);
        const dateString = date.toISOString().split('T')[0];
        
        const dailyBookings = bookings.filter(booking => booking.booking_date === dateString);
        data.push(dailyBookings.length);
      }
    } else if (interval === 'month') {
      // Monthly data for a year
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let month = 0; month < 12; month++) {
        labels.push(months[month]);
        
        const monthStart = new Date(today.getFullYear(), month, 1);
        const monthEnd = new Date(today.getFullYear(), month + 1, 0);
        
        const monthlyBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.booking_date);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        });
        
        data.push(monthlyBookings.length);
      }
    }
    
    res.json({
      period,
      interval,
      labels,
      data
    });
  } catch (error) {
    console.error('Get booking trends error:', error);
    res.status(500).json({ error: 'Error fetching booking trend data' });
  }
};

// API endpoint for room usage chart data
exports.getRoomUsage = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Get current date
    const today = new Date();
    
    // Set date range based on period
    let startDate, endDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); // Jan 1st of current year
        endDate = new Date(today.getFullYear(), 11, 31); // Dec 31st
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
        break;
    }
    
    // Format dates for database queries
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    // Get all rooms
    const rooms = await Room.getAll();
    
    // Get bookings for the period
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
    // Calculate usage rate per room
    const hoursInPeriod = getAvailableHours(startDate, endDate);
    const roomUsage = [];
    const roomNames = [];
    const roomIds = [];
    
    for (const room of rooms) {
      const roomBookings = bookings.filter(booking => booking.room_id === room.id);
      let totalUsageHours = 0;
      
      roomBookings.forEach(booking => {
        const startHour = parseInt(booking.start_time.split(':')[0]);
        const endHour = parseInt(booking.end_time.split(':')[0]);
        const duration = endHour - startHour;
        totalUsageHours += duration;
      });
      
      const usageRate = Math.round((totalUsageHours / hoursInPeriod) * 100);
      
      roomUsage.push(usageRate);
      roomNames.push(room.room_name || `Room ${room.id}`);
      roomIds.push(room.id);
    }
    
    res.json({
      period,
      rooms: roomNames,
      roomIds,
      data: roomUsage
    });
  } catch (error) {
    console.error('Get room usage error:', error);
    res.status(500).json({ error: 'Error fetching room usage data' });
  }
};

// API endpoint for booking purpose chart data
exports.getBookingPurpose = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Get current date
    const today = new Date();
    
    // Set date range based on period
    let startDate, endDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); // Jan 1st of current year
        endDate = new Date(today.getFullYear(), 11, 31); // Dec 31st
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
        break;
    }
    
    // Format dates for database queries
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    // Get bookings for the period
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
    // Group bookings by purpose
    const purposeCounts = {};
    
    bookings.forEach(booking => {
      const purpose = booking.purpose || 'Other';
      
      if (!purposeCounts[purpose]) {
        purposeCounts[purpose] = 0;
      }
      
      purposeCounts[purpose]++;
    });
    
    // Convert to arrays for Chart.js
    const purposes = Object.keys(purposeCounts);
    const data = purposes.map(purpose => purposeCounts[purpose]);
    
    res.json({
      period,
      purposes,
      data
    });
  } catch (error) {
    console.error('Get booking purpose error:', error);
    res.status(500).json({ error: 'Error fetching booking purpose data' });
  }
};

// API endpoint for department statistics
exports.getDepartmentStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Get current date
    const today = new Date();
    
    // Set date range based on period
    let startDate, endDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); // Jan 1st of current year
        endDate = new Date(today.getFullYear(), 11, 31); // Dec 31st
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
        break;
    }
    
    // Format dates for database queries
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    // Get bookings for the period with users
    const bookings = await Booking.getAll({
      date: { start, end },
      includeUser: true
    });
    
    // Group bookings by department
    const departmentCounts = {};
    
    for (const booking of bookings) {
      if (!booking.user_id) continue;
      
      const user = await User.findById(booking.user_id);
      if (!user) continue;
      
      let department = 'Không xác định';
      
      // First try to use the department_id field
      if (user.department_id) {
        // Map department codes to names
        const deptNames = {
          'cse': 'Khoa Khoa học và Kỹ thuật Máy tính',
          'eee': 'Khoa Điện – Điện tử',
          'me': 'Khoa Cơ khí',
          'mse': 'Khoa Công nghệ Vật liệu',
          'as': 'Khoa Khoa học Ứng dụng',
          'rm': 'Phòng quản lí phòng học'
        };
        
        department = deptNames[user.department_id] || `Khoa ${user.department_id}`;
      }
      // Fallback to extracting from student_id if department_id is not available
      else if (user.student_id && user.student_id.length >= 2) {
        // Extract department code based on HCMUT student ID format
        const deptCode = user.student_id.substring(0, 2);
        
        // Map department codes to names (example mapping for HCMUT)
        const deptNames = {
          '10': 'Khoa Điện - Điện tử',
          '20': 'Khoa Cơ khí',
          '30': 'Khoa Xây dựng',
          '40': 'Khoa CNTT',
          '50': 'Khoa Hoá',
          '60': 'Khoa Quản lý Công nghiệp'
        };
        
        department = deptNames[deptCode] || `Khoa ${deptCode}`;
      }
      
      if (!departmentCounts[department]) {
        departmentCounts[department] = 0;
      }
      
      departmentCounts[department]++;
    }
    
    // Convert to arrays for Chart.js
    const departments = Object.keys(departmentCounts);
    const data = departments.map(dept => departmentCounts[dept]);
    
    res.json({
      period,
      departments,
      data
    });
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({ error: 'Error fetching department statistics' });
  }
};

// API endpoint for top users
exports.getTopUsers = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Get current date
    const today = new Date();
    
    // Set date range based on period
    let startDate, endDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); // Jan 1st of current year
        endDate = new Date(today.getFullYear(), 11, 31); // Dec 31st
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
        break;
    }
    
    // Format dates for database queries
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    // Get bookings for the period
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
    // Group bookings by user
    const userBookings = {};
    
    for (const booking of bookings) {
      if (!booking.user_id) continue;
      
      const user = await User.findById(booking.user_id);
      if (!user) continue;
      
      let department = 'N/A';
      
      // First try to use the department_id field
      if (user.department_id) {
        // Map department codes to names
        const deptNames = {
          'cse': 'CNTT',
          'eee': 'Điện - Điện tử',
          'me': 'Cơ khí',
          'mse': 'Công nghệ Vật liệu',
          'as': 'Khoa học Ứng dụng',
          'rm': 'Quản lí phòng học'
        };
        
        department = deptNames[user.department_id] || user.department_id;
      }
      // Fallback to extracting from student_id if department_id is not available
      else if (user.student_id && user.student_id.length >= 2) {
        // Extract department code based on HCMUT student ID format
        const deptCode = user.student_id.substring(0, 2);
        
        // Map department codes to names
        const deptNames = {
          '10': 'Điện - Điện tử',
          '20': 'Cơ khí',
          '30': 'Xây dựng',
          '40': 'CNTT',
          '50': 'Hoá',
          '60': 'QLCN'
        };
        
        department = deptNames[deptCode] || `Khoa ${deptCode}`;
      }
      
      if (!userBookings[user.id]) {
        userBookings[user.id] = {
          id: user.id,
          fullName: user.full_name,
          department: department,
          bookings: [],
          lastBookingDate: null
        };
      }
      
      userBookings[user.id].bookings.push(booking);
      
      // Update last booking date if newer
      const bookingDate = new Date(booking.booking_date);
      if (!userBookings[user.id].lastBookingDate || bookingDate > userBookings[user.id].lastBookingDate) {
        userBookings[user.id].lastBookingDate = bookingDate;
      }
    }
    
    // Calculate statistics for each user
    const topUsers = Object.values(userBookings).map(user => {
      // Count total bookings
      const bookingCount = user.bookings.length;
      
      // Calculate total hours
      let totalHours = 0;
      user.bookings.forEach(booking => {
        const startHour = parseInt(booking.start_time.split(':')[0]);
        const endHour = parseInt(booking.end_time.split(':')[0]);
        const duration = endHour - startHour;
        totalHours += duration;
      });
      
      // Calculate cancellation rate
      const cancelledBookings = user.bookings.filter(b => b.status === 'cancelled');
      const cancellationRate = Math.round((cancelledBookings.length / bookingCount) * 100);
      
      // Format last booking date
      const lastBookingDate = user.lastBookingDate 
        ? `${user.lastBookingDate.getDate().toString().padStart(2, '0')}/${(user.lastBookingDate.getMonth() + 1).toString().padStart(2, '0')}/${user.lastBookingDate.getFullYear()}`
        : 'N/A';
      
      return {
        id: user.id,
        fullName: user.fullName,
        department: user.department,
        bookingCount,
        totalHours,
        cancellationRate,
        lastBookingDate
      };
    });
    
    // Sort by booking count (descending) and limit results
    topUsers.sort((a, b) => b.bookingCount - a.bookingCount);
    const limitedUsers = topUsers.slice(0, parseInt(limit));
    
    res.json(limitedUsers);
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({ error: 'Error fetching top users data' });
  }
};

// Helper function to calculate available hours in a period
function getAvailableHours(startDate, endDate) {
  const operatingHoursPerDay = 12; // Assuming 8am-8pm operation hours
  const operatingDays = 7; // All days of the week
  
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  return daysDiff * operatingHoursPerDay;
}

// Lấy thống kê chi tiết cho một phòng cụ thể
exports.getRoomDetailStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'month' } = req.query;
    
    // Get current date
    const today = new Date();
    
    // Set date range based on period
    let startDate, endDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'quarter':
        startDate = new Date(today);
        startDate.setMonth(Math.floor(today.getMonth() / 3) * 3);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 3);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); // Jan 1st of current year
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), 11, 31); // Dec 31st
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); // 1st of current month
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);
        break;
    }
    
    // Format dates for database queries
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    // Lấy thông tin phòng
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Không tìm thấy phòng' });
    }
    
    // Lấy các booking của phòng trong khoảng thời gian
    const bookings = await Booking.getRoomBookings(id);
    const filteredBookings = bookings.filter(booking => {
      return booking.booking_date >= start && booking.booking_date <= end;
    });
    
    // Các trạng thái booking
    const bookingStatusCount = {
      total: filteredBookings.length,
      pending: filteredBookings.filter(b => b.status === 'pending').length,
      confirmed: filteredBookings.filter(b => b.status === 'confirmed').length,
      in_use: filteredBookings.filter(b => b.status === 'in_use').length,
      completed: filteredBookings.filter(b => b.status === 'completed').length,
      cancelled: filteredBookings.filter(b => b.status === 'cancelled').length
    };
    
    // Tính thời gian sử dụng
    const completedBookings = filteredBookings.filter(b => b.status === 'completed' || b.status === 'in_use');
    const avgUsageTime = calculateAverageUsageTime(completedBookings);
    
    // Tổng thời gian sử dụng (giờ)
    let totalUsageHours = 0;
    try {
      totalUsageHours = completedBookings.reduce((sum, booking) => {
        if (!booking.start_time || !booking.end_time) return sum;
        
        const startTime = parseTimeToMinutes(booking.start_time);
        const endTime = parseTimeToMinutes(booking.end_time);
        if (isNaN(startTime) || isNaN(endTime)) return sum;
        
        return sum + Math.max(0, (endTime - startTime) / 60); // Chuyển từ phút sang giờ, đảm bảo không âm
      }, 0);
    } catch (error) {
      console.error('Error calculating total usage hours:', error);
      // Continue with default value 0
    }
    
    // Tính tỉ lệ sử dụng
    let usageRate = 0;
    try {
      usageRate = calculateRoomUsageRate(filteredBookings, start, end);
    } catch (error) {
      console.error('Error calculating usage rate:', error);
      // Continue with default value 0
    }
    
    // Thống kê theo ngày trong tuần
    let bookingsByDayOfWeek = [];
    try {
      bookingsByDayOfWeek = groupBookingsByDayOfWeek(filteredBookings);
    } catch (error) {
      console.error('Error grouping bookings by day of week:', error);
      // Use default empty array
      bookingsByDayOfWeek = [
        { day: "Sunday", count: 0 },
        { day: "Monday", count: 0 },
        { day: "Tuesday", count: 0 },
        { day: "Wednesday", count: 0 },
        { day: "Thursday", count: 0 },
        { day: "Friday", count: 0 },
        { day: "Saturday", count: 0 }
      ];
    }
    
    // Thống kê theo thời gian trong ngày
    let bookingsByTimeOfDay = [];
    try {
      bookingsByTimeOfDay = groupBookingsByTimeOfDay(filteredBookings);
    } catch (error) {
      console.error('Error grouping bookings by time of day:', error);
      // Use default empty array
      bookingsByTimeOfDay = [
        { slot: "Morning (6:00-12:00)", count: 0 },
        { slot: "Afternoon (12:00-18:00)", count: 0 },
        { slot: "Evening (18:00-24:00)", count: 0 }
      ];
    }
    
    // Lấy các lịch sử đặt phòng (tối đa 10 booking gần nhất)
    let recentBookings = [];
    try {
      recentBookings = filteredBookings
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 10)
        .map(booking => ({
          id: booking.id,
          user: booking.full_name || 'Unknown User',
          student_id: booking.student_id || 'N/A',
          date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          purpose: booking.purpose || 'N/A',
          status: booking.status || 'unknown',
          created_at: booking.created_at
        }));
    } catch (error) {
      console.error('Error processing recent bookings:', error);
      // Continue with empty array
    }
    
    // Parse room facilities safely
    let facilities = [];
    if (room.facilities) {
      try {
        if (typeof room.facilities === 'string') {
          // Only try to parse if it's a string and looks like JSON
          if (room.facilities.trim().startsWith('{') || room.facilities.trim().startsWith('[')) {
            facilities = JSON.parse(room.facilities);
          } else {
            // Handle the case where it's a string but not JSON
            facilities = [room.facilities];
          }
        } else if (typeof room.facilities === 'object') {
          // If it's already an object, use it directly
          facilities = room.facilities;
        }
      } catch (e) {
        console.error('Error parsing room facilities:', e);
        // Keep facilities as empty array
      }
    }
    
    // Trả về dữ liệu tổng hợp
    res.json({
      room: {
        id: room.id,
        name: room.room_name || `Room ${room.id}`,
        location: room.location || 'Unknown',
        capacity: room.capacity || 0,
        room_type: room.room_type || 'Unknown',
        status: room.status || 'unknown',
        facilities: facilities
      },
      period: { 
        start, 
        end,
        name: period 
      },
      bookingStats: {
        totalBookings: bookingStatusCount.total,
        statusCount: bookingStatusCount,
        avgUsageTime, // phút
        totalUsageHours, // giờ
        usageRate, // phần trăm
        bookingsByDayOfWeek,
        bookingsByTimeOfDay
      },
      recentBookings
    });
  } catch (error) {
    console.error('Get room detail stats error:', error);
    res.status(500).json({ 
      error: 'Error fetching room detail statistics',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Tính tỉ lệ sử dụng phòng
function calculateRoomUsageRate(bookings, startDate, endDate) {
  try {
    // Lấy các booking đã hoàn thành hoặc đang sử dụng
    const usedBookings = bookings.filter(b => ['completed', 'in_use'].includes(b.status));
    
    if (usedBookings.length === 0) {
      return 0;
    }
    
    // Tính tổng số giờ mà phòng có thể được sử dụng
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Giả sử phòng có thể được sử dụng 12 giờ mỗi ngày (từ 7:00 đến 19:00)
    const availableHoursPerDay = 12;
    const totalAvailableHours = totalDays * availableHoursPerDay;
    
    // Tính tổng thời gian sử dụng thực tế (giờ)
    const usedHours = usedBookings.reduce((sum, booking) => {
      if (!booking.start_time || !booking.end_time) return sum;
      
      const startTime = parseTimeToMinutes(booking.start_time);
      const endTime = parseTimeToMinutes(booking.end_time);
      
      if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
        return sum;
      }
      
      return sum + (endTime - startTime) / 60; // Chuyển từ phút sang giờ
    }, 0);
    
    // Tính tỉ lệ
    return Math.min(100, Math.round((usedHours / totalAvailableHours) * 100));
  } catch (error) {
    console.error('Error calculating room usage rate:', error);
    return 0;
  }
}

/**
 * Get dashboard data for student users
 */
exports.getStudentDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's upcoming bookings (pending and confirmed)
    const upcomingBookings = await Booking.getUserBookings(userId, ['pending', 'confirmed']);
    
    // Get recent notifications
    const notifications = await Notification.getUserNotifications(userId, 5);
    
    // Get unread notifications count
    const unreadNotificationsCount = await Notification.getUnreadCount(userId);
    
    // Return dashboard data
    res.json({
      upcomingBookings,
      notifications,
      unreadNotificationsCount
    });
  } catch (error) {
    console.error('Error getting student dashboard data:', error);
    res.status(500).json({ error: 'Error retrieving dashboard data' });
  }
}; 