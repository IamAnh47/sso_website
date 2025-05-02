const Room = require('../models/Room');
const Booking = require('../models/Booking');
const RoomActivity = require('../models/RoomActivity');
const User = require('../models/User');
const IoTDevice = require('../models/IoTDevice');
const Notification = require('../models/Notification');

// Lấy dữ liệu tổng quan cho dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || today;
    const end = endDate || today;
    
    const roomStats = await RoomActivity.getActivityStats(start, end);
    
    const bookings = await Booking.getAll({ date: today });
    
    const bookingStatusCount = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      in_use: bookings.filter(b => b.status === 'in_use').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };
    
    const rooms = await Room.getAll();
    const roomStatusCount = {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'available').length,
      unavailable: rooms.filter(r => r.status === 'unavailable').length,
      maintenance: rooms.filter(r => r.status === 'maintenance').length
    };
    
    const avgUsageTime = calculateAverageUsageTime(bookings);
    
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
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const start = startDate || firstDayOfMonth;
    const end = endDate || lastDayOfMonth;
    
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
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

// Nhóm bookings theo type
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

// API endpoint for overall dashboard stats
exports.getAdminDashboardStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    const today = new Date();
    
    let startDate, endDate, prevStartDate, prevEndDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        prevEndDate = new Date(prevStartDate);
        prevEndDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        prevEndDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today);
        prevStartDate = new Date(today.getFullYear() - 1, 0, 1);
        prevEndDate = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today);
        prevStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        prevEndDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
    }
    
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    const prevStart = prevStartDate.toISOString().split('T')[0];
    const prevEnd = prevEndDate.toISOString().split('T')[0];
    
    const currentBookings = await Booking.getAll({
      date: { start, end }
    });
    
    const prevBookings = await Booking.getAll({
      date: { start: prevStart, end: prevEnd }
    });
    
    const totalBookings = currentBookings.length;
    const prevTotalBookings = prevBookings.length;
    
    let bookingTrendPercentage = 0;
    if (prevTotalBookings > 0) {
      bookingTrendPercentage = ((totalBookings - prevTotalBookings) / prevTotalBookings) * 100;
    }
    
    const rooms = await Room.getAll();
    
    const bookingsByRoom = {};
    currentBookings.forEach(booking => {
      if (!bookingsByRoom[booking.room_id]) {
        bookingsByRoom[booking.room_id] = [];
      }
      bookingsByRoom[booking.room_id].push(booking);
    });
    
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
    
    let usageRateTrendPercentage = 0;
    if (prevRoomUsageRate > 0) {
      usageRateTrendPercentage = roomUsageRate - prevRoomUsageRate;
    }
    
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
    
    const avgTimeTrendHours = Math.round((avgUsageTime - prevAvgUsageTime) * 10) / 10;
    
    const cancelledBookings = currentBookings.filter(b => b.status === 'cancelled');
    const cancellationRate = Math.round((cancelledBookings.length / Math.max(totalBookings, 1)) * 100);
    
    const prevCancelledBookings = prevBookings.filter(b => b.status === 'cancelled');
    const prevCancellationRate = Math.round((prevCancelledBookings.length / Math.max(prevTotalBookings, 1)) * 100);
    
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
    
    const today = new Date();
    
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
        startDate.setDate(today.getDate() - today.getDay()); 
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        interval = 'day';
        format = 'ddd';
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1); 
        endDate = new Date(today.getFullYear(), 11, 31); 
        interval = 'month';
        format = 'MMM';
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1); 
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); 
        interval = 'day';
        format = 'DD';
        break;
    }
    
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
    let labels = [];
    let data = [];
    
    if (interval === 'hour') {
      for (let hour = 8; hour <= 20; hour++) { // 8am-8pm
        const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
        labels.push(hourLabel);
        
        const hourlyBookings = bookings.filter(booking => {
          const bookingHour = parseInt(booking.start_time.split(':')[0]);
          return bookingHour === hour;
        });
        
        data.push(hourlyBookings.length);
      }
    } else if (interval === 'day' && period === 'week') {
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
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        labels.push(day.toString());
        
        const date = new Date(today.getFullYear(), today.getMonth(), day);
        const dateString = date.toISOString().split('T')[0];
        
        const dailyBookings = bookings.filter(booking => booking.booking_date === dateString);
        data.push(dailyBookings.length);
      }
    } else if (interval === 'month') {
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
    
    const today = new Date();
    
    let startDate, endDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); 
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
    }
    
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    const rooms = await Room.getAll();
    
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
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
    
    const today = new Date();
    
    let startDate, endDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
    }
    
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
    const purposeCounts = {};
    
    bookings.forEach(booking => {
      const purpose = booking.purpose || 'Other';
      
      if (!purposeCounts[purpose]) {
        purposeCounts[purpose] = 0;
      }
      
      purposeCounts[purpose]++;
    });
    
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
    
    const today = new Date();
    
    let startDate, endDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
    }
    
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    const bookings = await Booking.getAll({
      date: { start, end },
      includeUser: true
    });
    
    const departmentCounts = {};
    
    for (const booking of bookings) {
      if (!booking.user_id) continue;
      
      const user = await User.findById(booking.user_id);
      if (!user) continue;
      
      let department = 'Không xác định';
      
      if (user.department_id) {
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
      else if (user.student_id && user.student_id.length >= 2) {
        const deptCode = user.student_id.substring(0, 2);
        
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
    
    const today = new Date();
    
    let startDate, endDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
    }
    
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    const bookings = await Booking.getAll({
      date: { start, end }
    });
    
    const userBookings = {};
    
    for (const booking of bookings) {
      if (!booking.user_id) continue;
      
      const user = await User.findById(booking.user_id);
      if (!user) continue;
      
      let department = 'N/A';
      
      if (user.department_id) {
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
      else if (user.student_id && user.student_id.length >= 2) {
        const deptCode = user.student_id.substring(0, 2);
        
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
      
      const bookingDate = new Date(booking.booking_date);
      if (!userBookings[user.id].lastBookingDate || bookingDate > userBookings[user.id].lastBookingDate) {
        userBookings[user.id].lastBookingDate = bookingDate;
      }
    }
    
    const topUsers = Object.values(userBookings).map(user => {
      const bookingCount = user.bookings.length;
      
      let totalHours = 0;
      user.bookings.forEach(booking => {
        const startHour = parseInt(booking.start_time.split(':')[0]);
        const endHour = parseInt(booking.end_time.split(':')[0]);
        const duration = endHour - startHour;
        totalHours += duration;
      });
      
      const cancelledBookings = user.bookings.filter(b => b.status === 'cancelled');
      const cancellationRate = Math.round((cancelledBookings.length / bookingCount) * 100);
      
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
    
    topUsers.sort((a, b) => b.bookingCount - a.bookingCount);
    const limitedUsers = topUsers.slice(0, parseInt(limit));
    
    res.json(limitedUsers);
  } catch (error) {
    console.error('Get top users error:', error);
    res.status(500).json({ error: 'Error fetching top users data' });
  }
};

function getAvailableHours(startDate, endDate) {
  const operatingHoursPerDay = 12; 
  const operatingDays = 7;
  
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  return daysDiff * operatingHoursPerDay;
}

// Lấy thống kê chi tiết cho một phòng cụ thể
exports.getRoomDetailStats = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = 'month' } = req.query;
    
    const today = new Date();
    
    let startDate, endDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
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
        startDate = new Date(today.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
    }
    
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ error: 'Không tìm thấy phòng' });
    }
    
    const bookings = await Booking.getRoomBookings(id);
    const filteredBookings = bookings.filter(booking => {
      return booking.booking_date >= start && booking.booking_date <= end;
    });
    
    const bookingStatusCount = {
      total: filteredBookings.length,
      pending: filteredBookings.filter(b => b.status === 'pending').length,
      confirmed: filteredBookings.filter(b => b.status === 'confirmed').length,
      in_use: filteredBookings.filter(b => b.status === 'in_use').length,
      completed: filteredBookings.filter(b => b.status === 'completed').length,
      cancelled: filteredBookings.filter(b => b.status === 'cancelled').length
    };
    
    const completedBookings = filteredBookings.filter(b => b.status === 'completed' || b.status === 'in_use');
    const avgUsageTime = calculateAverageUsageTime(completedBookings);
    
    let totalUsageHours = 0;
    try {
      totalUsageHours = completedBookings.reduce((sum, booking) => {
        if (!booking.start_time || !booking.end_time) return sum;
        
        const startTime = parseTimeToMinutes(booking.start_time);
        const endTime = parseTimeToMinutes(booking.end_time);
        if (isNaN(startTime) || isNaN(endTime)) return sum;
        
        return sum + Math.max(0, (endTime - startTime) / 60);
      }, 0);
    } catch (error) {
      console.error('Error calculating total usage hours:', error);
    }
    
    let usageRate = 0;
    try {
      usageRate = calculateRoomUsageRate(filteredBookings, start, end);
    } catch (error) {
      console.error('Error calculating usage rate:', error);
    }
    
    let bookingsByDayOfWeek = [];
    try {
      bookingsByDayOfWeek = groupBookingsByDayOfWeek(filteredBookings);
    } catch (error) {
      console.error('Error grouping bookings by day of week:', error);
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
    
    let bookingsByTimeOfDay = [];
    try {
      bookingsByTimeOfDay = groupBookingsByTimeOfDay(filteredBookings);
    } catch (error) {
      console.error('Error grouping bookings by time of day:', error);
      bookingsByTimeOfDay = [
        { slot: "Morning (6:00-12:00)", count: 0 },
        { slot: "Afternoon (12:00-18:00)", count: 0 },
        { slot: "Evening (18:00-24:00)", count: 0 }
      ];
    }
    
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
    }
    
    let facilities = [];
    if (room.facilities) {
      try {
        if (typeof room.facilities === 'string') {
          if (room.facilities.trim().startsWith('{') || room.facilities.trim().startsWith('[')) {
            facilities = JSON.parse(room.facilities);
          } else {
            facilities = [room.facilities];
          }
        } else if (typeof room.facilities === 'object') {
          facilities = room.facilities;
        }
      } catch (e) {
        console.error('Error parsing room facilities:', e);
      }
    }
    
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
        avgUsageTime,
        totalUsageHours,
        usageRate,
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
    const usedBookings = bookings.filter(b => ['completed', 'in_use'].includes(b.status));
    
    if (usedBookings.length === 0) {
      return 0;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const availableHoursPerDay = 12;
    const totalAvailableHours = totalDays * availableHoursPerDay;
    
    const usedHours = usedBookings.reduce((sum, booking) => {
      if (!booking.start_time || !booking.end_time) return sum;
      
      const startTime = parseTimeToMinutes(booking.start_time);
      const endTime = parseTimeToMinutes(booking.end_time);
      
      if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
        return sum;
      }
      
      return sum + (endTime - startTime) / 60;
    }, 0);
    
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
    
    const upcomingBookings = await Booking.getUserBookings(userId, ['pending', 'confirmed']);
    
    const notifications = await Notification.getUserNotifications(userId, 5);
    
    const unreadNotificationsCount = await Notification.getUnreadCount(userId);
    
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