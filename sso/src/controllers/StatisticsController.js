const Room = require('../models/Room');
const Booking = require('../models/Booking');
const RoomActivity = require('../models/RoomActivity');
const User = require('../models/User');

// Get overall statistics for different time periods (day, week, month, year)
exports.getOverallStatistics = async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, year
    console.log('Getting statistics for period:', period);
    
    // Get all bookings first to check if we have data
    const allBookings = await Booking.getAll();
    console.log('Total bookings in database:', allBookings.length);
    
    if (allBookings.length > 0) {
      console.log('Sample booking dates:', allBookings.slice(0, 3).map(b => b.booking_date));
    }
    
    // Generate date range based on period
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for filtering:', { startDate, endDate });
    
    // Filter bookings manually by date to ensure correct comparison
    let bookings = allBookings.filter(booking => {
      // Ensure booking_date is in YYYY-MM-DD format for proper string comparison
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for period:', bookings.length);
    
    // Get all rooms
    const rooms = await Room.getAll();
    console.log('Found rooms:', rooms.length);
    
    // Calculate key metrics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    
    // Calculate room usage rate
    const roomUsageRate = calculateRoomUsageRate(bookings, rooms.length, startDate, endDate);
    
    // Calculate average usage time in minutes
    const avgUsageTime = calculateAverageUsageTime(bookings);
    
    // Calculate cancellation rate
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
    
    // Booking trend data (bookings per day in the period)
    const bookingTrends = groupBookingsByDate(bookings, startDate, endDate);
    
    // Room usage data (top 10 most used rooms)
    const roomUsageData = calculateRoomUsageStats(bookings, rooms);
    
    // Room type statistics (thay thế cho booking purpose)
    const roomTypeStats = groupBookingsByRoomType(bookings, rooms);
    
    // Department statistics
    const departmentStats = await groupBookingsByDepartment(bookings);
    
    // Get top users with most bookings
    const topUsers = await getTopUsers(bookings);
    
    // Format response to match what frontend expects
    const response = {
      totalBookings,
      roomUsageRate: parseFloat(roomUsageRate.toFixed(2)),
      avgUsageTime,
      cancellationRate: parseFloat(cancellationRate.toFixed(2)),
      period: {
        name: period || 'month',
        start: startDate,
        end: endDate
      },
      charts: {
        bookingTrends: {
          labels: bookingTrends.map(item => item.date),
          values: bookingTrends.map(item => item.total)
        },
        roomUsage: {
          labels: roomUsageData.slice(0, 10).map(room => room.name),
          values: roomUsageData.slice(0, 10).map(room => room.usageHours)
        },
        roomTypeStats: {
          labels: roomTypeStats.map(item => item.roomType),
          values: roomTypeStats.map(item => item.count)
        },
        departmentStats: {
          labels: departmentStats.map(item => item.shortName),
          values: departmentStats.map(item => item.count),
          fullNames: departmentStats.map(item => item.department)
        }
      },
      topUsers
    };
    
    console.log('Sending statistics response:', JSON.stringify(response).substring(0, 200) + '...');
    res.json(response);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Error fetching statistics data' });
  }
};

// Alias for getOverallStatistics to fix the route issue
exports.getStatistics = exports.getOverallStatistics;

// Get detailed room usage statistics
exports.getRoomUsageStatistics = async (req, res) => {
  try {
    const { period, roomId } = req.query;
    
    // Generate date range based on period
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for room usage:', { startDate, endDate });
    
    // Get all bookings first
    const allBookings = await Booking.getAll();
    console.log('Total bookings for room usage:', allBookings.length);
    
    let bookings;
    let room;
    
    if (roomId) {
      // Get bookings for a specific room
      room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      // Get room bookings and filter by date
      const roomBookings = await Booking.getRoomBookings(roomId);
      bookings = roomBookings.filter(b => {
        const bookingDate = b.booking_date;
        return bookingDate >= startDate && bookingDate <= endDate;
      });
      console.log(`Filtered bookings for room ${roomId}:`, bookings.length);
    } else {
      // Filter all bookings by date
      bookings = allBookings.filter(b => {
        const bookingDate = b.booking_date;
        return bookingDate >= startDate && bookingDate <= endDate;
      });
      console.log('Filtered bookings for all rooms:', bookings.length);
    }
    
    // Get all rooms
    const rooms = await Room.getAll();
    
    // Room usage statistics
    const roomUsageData = calculateRoomUsageStats(bookings, rooms);
    
    // Usage by day of week
    const usageByDayOfWeek = groupBookingsByDayOfWeek(bookings);
    
    // Usage by time of day
    const usageByTimeOfDay = groupBookingsByTimeOfDay(bookings);
    
    // For a specific room, get detailed booking data
    let roomDetailData = null;
    if (roomId && room) {
      const roomBookings = bookings.filter(b => b.room_id === parseInt(roomId));
      
      roomDetailData = {
        room: room,
        totalBookings: roomBookings.length,
        completedBookings: roomBookings.filter(b => b.status === 'completed').length,
        cancelledBookings: roomBookings.filter(b => b.status === 'cancelled').length,
        bookingsByDate: groupBookingsByDate(roomBookings, startDate, endDate),
        avgUsageTime: calculateAverageUsageTime(roomBookings)
      };
    }
    
    res.json({
      period: {
        name: period || 'month',
        start: startDate,
        end: endDate
      },
      roomUsage: roomUsageData,
      usageByDayOfWeek,
      usageByTimeOfDay,
      roomDetail: roomDetailData
    });
  } catch (error) {
    console.error('Get room usage statistics error:', error);
    res.status(500).json({ error: 'Error fetching room usage statistics' });
  }
};

// Get user booking statistics
exports.getUserStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const period = req.query.period || 'week'; // Default to week
    
    // Calculate date range based on period
    const { startDate, endDate } = calculateDateRange(period);
    
    // Get user's booking history
    const bookings = await Booking.getUserBookings(userId);
    
    // Filter bookings by date if needed
    const filteredBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.booking_date);
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    // Calculate statistics
    const stats = calculateUserStatistics(filteredBookings);
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({ error: 'Error retrieving user statistics' });
  }
};

// Get statistics for all users (for admin)
exports.getUsersStatistics = async (req, res) => {
  try {
    const { period } = req.query;
    
    // Generate date range based on period
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for user statistics:', { startDate, endDate });
    
    // Get all bookings
    const allBookings = await Booking.getAll();
    console.log('Total bookings for user statistics:', allBookings.length);
    
    // Filter bookings manually by date
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for user statistics:', bookings.length);
    
    // Get all users
    const users = await User.getAll();
    
    // Calculate user statistics
    const userStats = [];
    
    for (const user of users) {
      const userBookings = bookings.filter(b => b.user_id === user.id);
      
      if (userBookings.length > 0) {
        // Find the most recent booking date
        let lastBookingDate = null;
        userBookings.forEach(booking => {
          const bookingDate = booking.booking_date;
          if (!lastBookingDate || bookingDate > lastBookingDate) {
            lastBookingDate = bookingDate;
          }
        });
        
        userStats.push({
          user: {
            id: user.id,
            name: user.full_name,
            studentId: user.student_id || 'N/A',
            role: user.role,
            department: extractDepartment(user)
          },
          totalBookings: userBookings.length,
          completedBookings: userBookings.filter(b => b.status === 'completed').length,
          cancelledBookings: userBookings.filter(b => b.status === 'cancelled').length,
          avgUsageTime: calculateAverageUsageTime(userBookings),
          mostUsedRoom: getMostUsedRoom(userBookings),
          lastBooking: lastBookingDate
        });
      }
    }
    
    // Sort by total bookings
    userStats.sort((a, b) => b.totalBookings - a.totalBookings);
    
    console.log(`Found ${userStats.length} users with bookings`);
    
    res.json({
      period: {
        name: period || 'month',
        start: startDate,
        end: endDate
      },
      userStats: userStats.slice(0, 20) // Limit to 20 users
    });
  } catch (error) {
    console.error('Get users statistics error:', error);
    res.status(500).json({ error: 'Error fetching users statistics' });
  }
};

// Get booking trends data
exports.getBookingTrends = async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, year
    console.log('Getting booking trends for period:', period);
    
    // Generate date range based on period
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for booking trends:', { startDate, endDate });
    
    // Get all bookings first
    const allBookings = await Booking.getAll();
    console.log('Total bookings for trends:', allBookings.length);
    
    // Filter bookings by date
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for trends:', bookings.length);
    
    // Group bookings by date for the trend chart
    const bookingTrendsData = groupBookingsByDate(bookings, startDate, endDate);
    
    // Format data for Chart.js
    const labels = bookingTrendsData.map(item => item.date);
    const values = bookingTrendsData.map(item => item.total);
    
    const response = {
      labels: labels,
      values: values,
      period: period || 'month'
    };
    
    console.log('Sending booking trends response:', JSON.stringify(response).substring(0, 200) + '...');
    res.json(response);
  } catch (error) {
    console.error('Error fetching booking trends:', error);
    res.status(500).json({ error: 'Error fetching booking trends data' });
  }
};

// Get room usage data
exports.getRoomUsage = async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, year
    
    // Generate date range based on period
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for room usage chart:', { startDate, endDate });
    
    // Get all bookings first
    const allBookings = await Booking.getAll();
    
    // Filter bookings by date
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for room usage chart:', bookings.length);
    
    // Get all rooms
    const rooms = await Room.getAll();
    
    // Calculate room usage statistics
    const roomUsageData = calculateRoomUsageStats(bookings, rooms);
    
    // Limit to top 10 rooms and format for Chart.js
    const topRooms = roomUsageData
      .sort((a, b) => b.usageHours - a.usageHours)
      .slice(0, 10);
    
    const labels = topRooms.map(room => room.name);
    const values = topRooms.map(room => room.usageHours);
    
    res.json({
      labels: labels,
      values: values,
      period: period || 'month'
    });
  } catch (error) {
    console.error('Error fetching room usage:', error);
    res.status(500).json({ error: 'Error fetching room usage data' });
  }
};

// Group bookings by room type
function groupBookingsByRoomType(bookings, rooms) {
  const roomTypeMap = {};
  const roomMap = {};
  
  // Tạo map từ room_id tới room_type để tra cứu nhanh
  rooms.forEach(room => {
    roomMap[room.id] = {
      type: room.room_type || 'Không xác định',
      name: room.room_name
    };
  });
  
  // Thống kê theo loại phòng
  bookings.forEach(booking => {
    const roomInfo = roomMap[booking.room_id];
    const roomType = roomInfo ? roomInfo.type : 'Không xác định';
    
    if (!roomTypeMap[roomType]) {
      roomTypeMap[roomType] = {
        roomType,
        count: 0,
        totalHours: 0
      };
    }
    
    roomTypeMap[roomType].count++;
    
    // Tính thêm thời gian sử dụng (nếu là booking đã hoàn thành)
    if (booking.status === 'completed' && booking.start_time && booking.end_time) {
      const startTime = parseTimeToMinutes(booking.start_time);
      const endTime = parseTimeToMinutes(booking.end_time);
      
      if (!isNaN(startTime) && !isNaN(endTime) && startTime < endTime) {
        roomTypeMap[roomType].totalHours += (endTime - startTime) / 60;
      }
    }
  });
  
  // Ánh xạ tên loại phòng từ tiếng Anh sang tiếng Việt
  const roomTypeNames = {
    'classroom': 'Phòng học',
    'meeting_room': 'Phòng họp',
    'lab': 'Phòng thí nghiệm',
    'study_room': 'Phòng tự học',
    'auditorium': 'Hội trường',
    'conference_room': 'Phòng hội nghị'
  };
  
  // Chuyển đổi sang mảng và sắp xếp theo số lượng booking
  return Object.values(roomTypeMap)
    .map(item => ({
      ...item,
      // Chuyển tên loại phòng sang tiếng Việt nếu có, nếu không giữ nguyên
      roomType: roomTypeNames[item.roomType] || item.roomType
    }))
    .sort((a, b) => b.count - a.count);
}

// Get room type statistics instead of booking purpose
exports.getRoomTypeStats = async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, year
    
    // Generate date range based on period
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for room type stats:', { startDate, endDate });
    
    // Get all bookings first
    const allBookings = await Booking.getAll();
    
    // Filter bookings by date
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for room type stats:', bookings.length);
    
    // Get all rooms for mapping room types
    const rooms = await Room.getAll();
    
    // Group bookings by room type
    const roomTypeData = groupBookingsByRoomType(bookings, rooms);
    
    // Format for Chart.js
    const labels = roomTypeData.map(item => item.roomType);
    const values = roomTypeData.map(item => item.count);
    
    res.json({
      labels: labels,
      values: values,
      period: period || 'month'
    });
  } catch (error) {
    console.error('Error fetching room type statistics:', error);
    res.status(500).json({ error: 'Error fetching room type statistics' });
  }
};

// Get department statistics
exports.getDepartmentStats = async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, year
    
    // Generate date range based on period
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for department stats:', { startDate, endDate });
    
    // Get all bookings first
    const allBookings = await Booking.getAll();
    
    // Filter bookings by date
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for department stats:', bookings.length);
    
    // Group bookings by department
    const departmentData = await groupBookingsByDepartment(bookings);
    
    // Format for Chart.js
    const labels = departmentData.map(item => item.shortName);
    const values = departmentData.map(item => item.count);
    const fullNames = departmentData.map(item => item.department);
    
    res.json({
      labels: labels,
      values: values,
      fullNames: fullNames,
      period: period || 'month'
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({ error: 'Error fetching department statistics' });
  }
};

// Get top users data
exports.getTopUsers = async (req, res) => {
  try {
    const { period } = req.query; // day, week, month, year
    
    // Generate date range based on period
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    
    // Get all bookings
    const allBookings = await Booking.getAll();
    
    // Filter bookings manually by date
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    // Get top users with most bookings
    const topUsers = await getTopUsers(bookings);
    
    // Limit to top 5 users
    res.json(topUsers.slice(0, 5));
  } catch (error) {
    console.error('Error fetching top users:', error);
    res.status(500).json({ error: 'Error fetching top users data' });
  }
};

// Helper functions

// Generate date range based on period
function getDateRangeFromPeriod(period) {
  const now = new Date();
  let startDate, endDate;
  
  switch (period) {
    case 'day':
      startDate = now.toISOString().split('T')[0];
      endDate = startDate;
      break;
    case 'week':
      // Start of current week (Sunday)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startDate = startOfWeek.toISOString().split('T')[0];
      
      // End of current week (Saturday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endDate = endOfWeek.toISOString().split('T')[0];
      break;
    case 'year':
      startDate = `${now.getFullYear()}-01-01`;
      endDate = `${now.getFullYear()}-12-31`;
      break;
    case 'month':
    default:
      // Start of current month
      startDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
      
      // End of current month
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      endDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${lastDayOfMonth}`;
      
      // Optionally, widen the range to include past 3 months for testing
      // Uncomment if you want to include more data
      /*
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      startDate = `${threeMonthsAgo.getFullYear()}-${(threeMonthsAgo.getMonth() + 1).toString().padStart(2, '0')}-01`;
      */
      break;
  }
  
  return { startDate, endDate };
}

// Calculate average usage time in minutes
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

// Parse time string to minutes
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

// Calculate room usage rate
function calculateRoomUsageRate(bookings, totalRooms, startDate, endDate) {
  try {
    // Count the number of unique days in the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount = (end - start) / (1000 * 60 * 60 * 24) + 1;
    
    // Consider operating hours (e.g., 8:00-22:00 = 14 hours per day)
    const hoursPerDay = 14;
    
    // Total available room-hours in the period
    const totalRoomHours = totalRooms * dayCount * hoursPerDay;
    
    // Calculate total booked hours
    let totalBookedMinutes = 0;
    
    bookings.forEach(booking => {
      if (['confirmed', 'in_use', 'completed'].includes(booking.status)) {
        if (!booking.start_time || !booking.end_time) return;
        
        const startTime = parseTimeToMinutes(booking.start_time);
        const endTime = parseTimeToMinutes(booking.end_time);
        
        if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
          return;
        }
        
        totalBookedMinutes += (endTime - startTime);
      }
    });
    
    const totalBookedHours = totalBookedMinutes / 60;
    
    // Calculate usage rate
    return (totalRoomHours > 0) ? (totalBookedHours / totalRoomHours) * 100 : 0;
  } catch (error) {
    console.error('Error calculating room usage rate:', error);
    return 0;
  }
}

// Group bookings by date
function groupBookingsByDate(bookings, startDate, endDate) {
  const dateMap = {};
  
  // Initialize all dates in the range
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const dateStr = day.toISOString().split('T')[0];
    dateMap[dateStr] = {
      date: dateStr,
      total: 0,
      completed: 0,
      cancelled: 0
    };
  }
  
  // Count bookings for each date
  bookings.forEach(booking => {
    if (dateMap[booking.booking_date]) {
      dateMap[booking.booking_date].total++;
      
      if (booking.status === 'completed') {
        dateMap[booking.booking_date].completed++;
      } else if (booking.status === 'cancelled') {
        dateMap[booking.booking_date].cancelled++;
      }
    }
  });
  
  // Convert to array
  return Object.values(dateMap);
}

// Calculate room usage statistics
function calculateRoomUsageStats(bookings, rooms) {
  try {
    const roomStats = {};
    
    // Initialize stats for all rooms
    rooms.forEach(room => {
      roomStats[room.id] = {
        id: room.id,
        name: room.room_name,
        location: room.location,
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        usageHours: 0
      };
    });
    
    // Calculate stats for each room
    bookings.forEach(booking => {
      if (roomStats[booking.room_id]) {
        roomStats[booking.room_id].totalBookings++;
        
        if (booking.status === 'completed') {
          roomStats[booking.room_id].completedBookings++;
          
          // Add usage hours
          if (!booking.start_time || !booking.end_time) return;
          
          const startTime = parseTimeToMinutes(booking.start_time);
          const endTime = parseTimeToMinutes(booking.end_time);
          
          if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
            return;
          }
          
          roomStats[booking.room_id].usageHours += (endTime - startTime) / 60;
        } else if (booking.status === 'cancelled') {
          roomStats[booking.room_id].cancelledBookings++;
        }
      }
    });
    
    // Convert to array and sort by usage
    return Object.values(roomStats)
      .sort((a, b) => b.usageHours - a.usageHours);
  } catch (error) {
    console.error('Error calculating room usage stats:', error);
    return [];
  }
}

// Group bookings by purpose
function groupBookingsByPurpose(bookings) {
  const purposeMap = {};
  
  bookings.forEach(booking => {
    const purpose = booking.purpose || 'Không xác định';
    
    if (!purposeMap[purpose]) {
      purposeMap[purpose] = {
        purpose,
        count: 0
      };
    }
    
    purposeMap[purpose].count++;
  });
  
  // Convert to array and sort by count
  return Object.values(purposeMap)
    .sort((a, b) => b.count - a.count);
}

// Group bookings by department (extracted from student ID)
async function groupBookingsByDepartment(bookings) {
  const departmentMap = {};
  const userIdSet = new Set(bookings.map(b => b.user_id));
  
  // Get all users who have made bookings
  const userPromises = Array.from(userIdSet).map(userId => User.findById(userId));
  const users = await Promise.all(userPromises);
  
  // Map user IDs to department_id for quick lookup
  const userMap = {};
  users.forEach(user => {
    if (user) {
      userMap[user.id] = {
        department_id: user.department_id || '',
        student_id: user.student_id || ''
      };
    }
  });
  
  // Định nghĩa mã và tên đầy đủ của các khoa/phòng ban
      const deptNames = {
        'cse': 'Khoa Khoa học và Kỹ thuật Máy tính',
        'eee': 'Khoa Điện – Điện tử',
        'me': 'Khoa Cơ khí',
        'mse': 'Khoa Công nghệ Vật liệu',
        'as': 'Khoa Khoa học Ứng dụng',
        'rm': 'Phòng quản lí phòng học'
      };
      
  // Định nghĩa mapping cho mã sinh viên
  const studentIdDeptMap = {
        '10': 'Khoa Điện - Điện tử',
        '20': 'Khoa Cơ khí',
        '30': 'Khoa Xây dựng',
        '40': 'Khoa CNTT',
        '50': 'Khoa Hoá',
    '60': 'Khoa Quản lý Công nghiệp'
  };
  
  // Mã viết tắt cho sinh viên
  const studentIdShortNames = {
    '10': 'EEE',
    '20': 'ME',
    '30': 'CE',
    '40': 'CSE',
    '50': 'CT',
    '60': 'IM'
  };
  
  bookings.forEach(booking => {
    const userData = userMap[booking.user_id] || {};
    let department = 'Không xác định';
    let shortName = 'N/A';
    
    // First try to use the department_id field
    if (userData.department_id) {
      const deptId = userData.department_id.toLowerCase();
      department = deptNames[deptId] || `Khoa ${deptId}`;
      shortName = deptId.toUpperCase();
    }
    // Fallback to extracting from student_id if department_id is not available
    else if (userData.student_id && userData.student_id.length >= 2) {
      // Extract department code based on HCMUT student ID format
      const deptCode = userData.student_id.substring(0, 2);
      department = studentIdDeptMap[deptCode] || `Khoa ${deptCode}`;
      shortName = studentIdShortNames[deptCode] || deptCode;
    }
    
    const deptKey = shortName;
    
    if (!departmentMap[deptKey]) {
      departmentMap[deptKey] = {
        shortName: shortName,
        department: department,
        count: 0
      };
    }
    
    departmentMap[deptKey].count++;
  });
  
  // Convert to array and sort by count
  return Object.values(departmentMap)
    .sort((a, b) => b.count - a.count);
}

// Group bookings by day of week
function groupBookingsByDayOfWeek(bookings) {
  const daysOfWeek = [
    'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'
  ];
  
  const dayStats = {};
  
  // Initialize all days
  daysOfWeek.forEach((day, index) => {
    dayStats[index] = {
      day,
      count: 0,
      completed: 0,
      cancelled: 0
    };
  });
  
  // Count bookings for each day
  bookings.forEach(booking => {
    const date = new Date(booking.booking_date);
    const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    dayStats[dayIndex].count++;
    
    if (booking.status === 'completed') {
      dayStats[dayIndex].completed++;
    } else if (booking.status === 'cancelled') {
      dayStats[dayIndex].cancelled++;
    }
  });
  
  // Convert to array
  return Object.values(dayStats);
}

// Group bookings by time of day
function groupBookingsByTimeOfDay(bookings) {
  const timeSlots = {
    'Sáng (6:00-12:00)': { start: 6, end: 12, count: 0 },
    'Chiều (12:00-18:00)': { start: 12, end: 18, count: 0 },
    'Tối (18:00-24:00)': { start: 18, end: 24, count: 0 }
  };
  
  bookings.forEach(booking => {
    const startHour = parseInt(booking.start_time.split(':')[0]);
    
    for (const [slot, data] of Object.entries(timeSlots)) {
      if (startHour >= data.start && startHour < data.end) {
        data.count++;
        break;
      }
    }
  });
  
  // Convert to array
  return Object.entries(timeSlots).map(([slot, data]) => ({
    timeSlot: slot,
    count: data.count
  }));
}

// Get most used room by a user
function getMostUsedRoom(bookings) {
  if (bookings.length === 0) {
    return null;
  }
  
  const roomCount = {};
  
  bookings.forEach(booking => {
    if (!roomCount[booking.room_id]) {
      roomCount[booking.room_id] = {
        id: booking.room_id,
        name: booking.room_name,
        location: booking.location,
        count: 0
      };
    }
    
    roomCount[booking.room_id].count++;
  });
  
  // Find the room with the highest count
  return Object.values(roomCount)
    .sort((a, b) => b.count - a.count)[0];
}

// Get top users with most bookings
async function getTopUsers(bookings) {
  try {
    const userBookings = {};
    
    bookings.forEach(booking => {
      if (!userBookings[booking.user_id]) {
        userBookings[booking.user_id] = {
          userId: booking.user_id,
          totalBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          totalTime: 0,
          lastBookingDate: null
        };
      }
      
      userBookings[booking.user_id].totalBookings++;
      
      if (booking.status === 'completed') {
        userBookings[booking.user_id].completedBookings++;
        
        // Add usage time
        if (!booking.start_time || !booking.end_time) return;
        
        const startTime = parseTimeToMinutes(booking.start_time);
        const endTime = parseTimeToMinutes(booking.end_time);
        
        if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
          return;
        }
        
        userBookings[booking.user_id].totalTime += (endTime - startTime);
      } else if (booking.status === 'cancelled') {
        userBookings[booking.user_id].cancelledBookings++;
      }
      
      // Track the latest booking date
      if (!userBookings[booking.user_id].lastBookingDate || 
          booking.booking_date > userBookings[booking.user_id].lastBookingDate) {
        userBookings[booking.user_id].lastBookingDate = booking.booking_date;
      }
    });
    
    // Convert to array and sort by total bookings
    const topUserIds = Object.values(userBookings)
      .sort((a, b) => b.totalBookings - a.totalBookings)
      .slice(0, 10) // Top 10 users
      .map(user => user.userId);
    
    // Get user details for top users
    const userPromises = topUserIds.map(userId => User.findById(userId));
    const users = await Promise.all(userPromises);
    
    // Combine user details with booking stats
    return topUserIds.map((userId, index) => {
      const user = users[index];
      const stats = userBookings[userId];
      
      return {
        id: userId,
        name: user ? user.full_name : 'Unknown User',
        studentId: user ? user.student_id || 'N/A' : 'N/A',
        department: extractDepartment(user),
        totalBookings: stats.totalBookings,
        totalHours: Math.round(stats.totalTime / 60 * 10) / 10, // Round to 1 decimal place
        cancellationRate: stats.totalBookings > 0 
          ? Math.round((stats.cancelledBookings / stats.totalBookings) * 100) 
          : 0,
        lastBooking: stats.lastBookingDate
      };
    });
  } catch (error) {
    console.error('Error getting top users:', error);
    return [];
  }
}

// Extract department from user info
function extractDepartment(user) {
  if (!user) return 'N/A';
  
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
    
    return deptNames[user.department_id] || user.department_id;
  }
  
  // Fallback to extracting from student ID
  const studentId = user.student_id;
  if (!studentId || studentId.length < 2) {
    return 'N/A';
  }
  
  // Extract department code based on HCMUT student ID format
  const deptCode = studentId.substring(0, 2);
  
  // Map department codes to names (example mapping for HCMUT)
  const deptNames = {
    '10': 'Điện - Điện tử',
    '20': 'Cơ khí',
    '30': 'Xây dựng',
    '40': 'CNTT',
    '50': 'Hoá',
    '60': 'QLCN',
    // Add more departments as needed
  };
  
  return deptNames[deptCode] || `Khoa ${deptCode}`;
}

// Helper function to calculate date range based on period
function calculateDateRange(period) {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  let startDate = new Date(today);
  
  switch(period) {
    case 'week':
      // Past 7 days
      startDate.setDate(today.getDate() - 6);
      break;
    case 'month':
      // Past 30 days
      startDate.setDate(today.getDate() - 29);
      break;
    case 'semester':
      // Current semester (simplified - just use past 4 months)
      startDate.setMonth(today.getMonth() - 3);
      break;
    case 'year':
      // Past year
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    default:
      startDate.setDate(today.getDate() - 6);
  }
  
  startDate.setHours(0, 0, 0, 0); // Start of the day
  
  return { startDate, endDate: today };
}

// Helper function to calculate user statistics
function calculateUserStatistics(bookings) {
  // Total bookings
  const totalBookings = bookings.length;
  
  // Count bookings by status
  const statusCounts = {
    pending: 0,
    confirmed: 0,
    in_use: 0,
    completed: 0,
    cancelled: 0
  };
  
  // Count bookings by room type
  const roomTypeCounts = {
    classroom: 0,
    study_room: 0,
    meeting_room: 0,
    lab: 0,
    other: 0
  };
  
  // Room usage stats
  const roomStats = {};
  
  // Total usage hours
  let totalHours = 0;
  
  // Process each booking
  bookings.forEach(booking => {
    // Count by status
    if (statusCounts.hasOwnProperty(booking.status)) {
      statusCounts[booking.status]++;
    }
    
    // Calculate hours for completed and in-use bookings
    if (booking.status === 'completed' || booking.status === 'in_use') {
      // Get room type
      const roomType = booking.room_type || 'other';
      if (roomTypeCounts.hasOwnProperty(roomType)) {
        roomTypeCounts[roomType]++;
      } else {
        roomTypeCounts.other++;
      }
      
      // Calculate hours
      if (booking.start_time && booking.end_time) {
        const startTime = parseTimeToMinutes(booking.start_time);
        const endTime = parseTimeToMinutes(booking.end_time);
        
        if (!isNaN(startTime) && !isNaN(endTime) && startTime < endTime) {
          const durationHours = (endTime - startTime) / 60;
          totalHours += durationHours;
          
          // Track room usage
          if (!roomStats[booking.room_id]) {
            roomStats[booking.room_id] = {
              id: booking.room_id,
              name: booking.room_name,
              location: booking.location,
              type: roomType,
              usageCount: 0,
              usageHours: 0
            };
          }
          
          roomStats[booking.room_id].usageCount++;
          roomStats[booking.room_id].usageHours += durationHours;
        }
      }
    }
  });
  
  // Calculate completion rate
  const completionRate = totalBookings > 0 ? 
    Math.round((statusCounts.completed / totalBookings) * 100) : 0;
  
  // Convert room stats to array and sort by usage
  const roomStatsArray = Object.values(roomStats).sort((a, b) => b.usageHours - a.usageHours);
  
  return {
    totalBookings,
    totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
    completionRate,
    uniqueRoomsCount: Object.keys(roomStats).length,
    statusCounts,
    roomTypeCounts,
    mostUsedRooms: roomStatsArray.slice(0, 5), // Top 5 most used rooms
    recentBookings: bookings.slice(0, 5) // 5 most recent bookings
  };
}

// Diagnostic endpoint to check data
exports.diagnosticDataCheck = async (req, res) => {
  try {
    // Check for bookings
    const bookings = await Booking.getAll();
    
    // Check for rooms
    const rooms = await Room.getAll();
    
    // Check for users
    const users = await User.getAll();
    
    res.json({
      success: true,
      counts: {
        bookings: bookings.length,
        rooms: rooms.length,
        users: users.length
      },
      sampleData: {
        booking: bookings.length > 0 ? bookings[0] : null,
        room: rooms.length > 0 ? rooms[0] : null,
        user: users.length > 0 ? users[0] : null
      }
    });
  } catch (error) {
    console.error('Diagnostic check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error performing diagnostic data check',
      message: error.message
    });
  }
}; 