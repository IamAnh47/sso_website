const Room = require('../models/Room');
const Booking = require('../models/Booking');
const RoomActivity = require('../models/RoomActivity');
const User = require('../models/User');

exports.getOverallStatistics = async (req, res) => {
  try {
    const { period } = req.query;
    console.log('Getting statistics for period:', period);
    
    const allBookings = await Booking.getAll();
    console.log('Total bookings in database:', allBookings.length);
    
    if (allBookings.length > 0) {
      console.log('Sample booking dates:', allBookings.slice(0, 3).map(b => b.booking_date));
    }
    
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for filtering:', { startDate, endDate });
    
    let bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for period:', bookings.length);
    
    const rooms = await Room.getAll();
    console.log('Found rooms:', rooms.length);
    
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
    
    const roomUsageRate = calculateRoomUsageRate(bookings, rooms.length, startDate, endDate);
    
    const avgUsageTime = calculateAverageUsageTime(bookings);
    
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
    
    const bookingTrends = groupBookingsByDate(bookings, startDate, endDate);
    
    const roomUsageData = calculateRoomUsageStats(bookings, rooms);
    
    const roomTypeStats = groupBookingsByRoomType(bookings, rooms);
    
    const departmentStats = await groupBookingsByDepartment(bookings);
    
    const topUsers = await getTopUsers(bookings);
    
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

exports.getStatistics = exports.getOverallStatistics;

// Get detailed room usage statistics
exports.getRoomUsageStatistics = async (req, res) => {
  try {
    const { period, roomId } = req.query;
    
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for room usage:', { startDate, endDate });
    
    const allBookings = await Booking.getAll();
    console.log('Total bookings for room usage:', allBookings.length);
    
    let bookings;
    let room;
    
    if (roomId) {
      room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
      
      const roomBookings = await Booking.getRoomBookings(roomId);
      bookings = roomBookings.filter(b => {
        const bookingDate = b.booking_date;
        return bookingDate >= startDate && bookingDate <= endDate;
      });
      console.log(`Filtered bookings for room ${roomId}:`, bookings.length);
    } else {
      bookings = allBookings.filter(b => {
        const bookingDate = b.booking_date;
        return bookingDate >= startDate && bookingDate <= endDate;
      });
      console.log('Filtered bookings for all rooms:', bookings.length);
    }
    
    const rooms = await Room.getAll();
    
    const roomUsageData = calculateRoomUsageStats(bookings, rooms);
    
    const usageByDayOfWeek = groupBookingsByDayOfWeek(bookings);
    
    const usageByTimeOfDay = groupBookingsByTimeOfDay(bookings);
    
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
    const period = req.query.period || 'week';
    
    const { startDate, endDate } = calculateDateRange(period);
    
    const bookings = await Booking.getUserBookings(userId);
    
    const filteredBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.booking_date);
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
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
    
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for user statistics:', { startDate, endDate });
    
    const allBookings = await Booking.getAll();
    console.log('Total bookings for user statistics:', allBookings.length);
    
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for user statistics:', bookings.length);
    
    const users = await User.getAll();
    
    const userStats = [];
    
    for (const user of users) {
      const userBookings = bookings.filter(b => b.user_id === user.id);
      
      if (userBookings.length > 0) {
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
    
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for booking trends:', { startDate, endDate });
    
    const allBookings = await Booking.getAll();
    console.log('Total bookings for trends:', allBookings.length);
    
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for trends:', bookings.length);
    
    const bookingTrendsData = groupBookingsByDate(bookings, startDate, endDate);
    
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
    const { period } = req.query;
    
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for room usage chart:', { startDate, endDate });
    
    const allBookings = await Booking.getAll();
    
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for room usage chart:', bookings.length);
    
    const rooms = await Room.getAll();
    
    const roomUsageData = calculateRoomUsageStats(bookings, rooms);
    
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
  
  rooms.forEach(room => {
    roomMap[room.id] = {
      type: room.room_type || 'Không xác định',
      name: room.room_name
    };
  });
  
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
    
    if (booking.status === 'completed' && booking.start_time && booking.end_time) {
      const startTime = parseTimeToMinutes(booking.start_time);
      const endTime = parseTimeToMinutes(booking.end_time);
      
      if (!isNaN(startTime) && !isNaN(endTime) && startTime < endTime) {
        roomTypeMap[roomType].totalHours += (endTime - startTime) / 60;
      }
    }
  });
  
  const roomTypeNames = {
    'classroom': 'Phòng học',
    'meeting_room': 'Phòng họp',
    'lab': 'Phòng thí nghiệm',
    'study_room': 'Phòng tự học',
    'auditorium': 'Hội trường',
    'conference_room': 'Phòng hội nghị'
  };
  
  return Object.values(roomTypeMap)
    .map(item => ({
      ...item,
      roomType: roomTypeNames[item.roomType] || item.roomType
    }))
    .sort((a, b) => b.count - a.count);
}

// Get room type statistics instead of booking purpose
exports.getRoomTypeStats = async (req, res) => {
  try {
    const { period } = req.query; 
    
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for room type stats:', { startDate, endDate });
    
    const allBookings = await Booking.getAll();
    
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for room type stats:', bookings.length);
    
    const rooms = await Room.getAll();
    
    const roomTypeData = groupBookingsByRoomType(bookings, rooms);
    
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
    
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    console.log('Date range for department stats:', { startDate, endDate });
    
    const allBookings = await Booking.getAll();
    
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    console.log('Filtered bookings for department stats:', bookings.length);
    
    const departmentData = await groupBookingsByDepartment(bookings);
    
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
    const { period } = req.query; 
    
    const { startDate, endDate } = getDateRangeFromPeriod(period || 'month');
    
    const allBookings = await Booking.getAll();
    
    const bookings = allBookings.filter(booking => {
      const bookingDate = booking.booking_date;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    const topUsers = await getTopUsers(bookings);
    
    res.json(topUsers.slice(0, 5));
  } catch (error) {
    console.error('Error fetching top users:', error);
    res.status(500).json({ error: 'Error fetching top users data' });
  }
};


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
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startDate = startOfWeek.toISOString().split('T')[0];
      
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
      startDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
      
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      endDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${lastDayOfMonth}`;
      
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount = (end - start) / (1000 * 60 * 60 * 24) + 1;
    
    const hoursPerDay = 14;
    
    const totalRoomHours = totalRooms * dayCount * hoursPerDay;
    
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
    
    return (totalRoomHours > 0) ? (totalBookedHours / totalRoomHours) * 100 : 0;
  } catch (error) {
    console.error('Error calculating room usage rate:', error);
    return 0;
  }
}

// Group bookings by date
function groupBookingsByDate(bookings, startDate, endDate) {
  const dateMap = {};
  
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
  
  return Object.values(dateMap);
}

// Calculate room usage statistics
function calculateRoomUsageStats(bookings, rooms) {
  try {
    const roomStats = {};
    
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
    
    bookings.forEach(booking => {
      if (roomStats[booking.room_id]) {
        roomStats[booking.room_id].totalBookings++;
        
        if (booking.status === 'completed') {
          roomStats[booking.room_id].completedBookings++;
          
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
  
  return Object.values(purposeMap)
    .sort((a, b) => b.count - a.count);
}

// Group bookings by department
async function groupBookingsByDepartment(bookings) {
  const departmentMap = {};
  const userIdSet = new Set(bookings.map(b => b.user_id));
  
  const userPromises = Array.from(userIdSet).map(userId => User.findById(userId));
  const users = await Promise.all(userPromises);
  
  const userMap = {};
  users.forEach(user => {
    if (user) {
      userMap[user.id] = {
        department_id: user.department_id || '',
        student_id: user.student_id || ''
      };
    }
  });
  
      const deptNames = {
        'cse': 'Khoa Khoa học và Kỹ thuật Máy tính',
        'eee': 'Khoa Điện – Điện tử',
        'me': 'Khoa Cơ khí',
        'mse': 'Khoa Công nghệ Vật liệu',
        'as': 'Khoa Khoa học Ứng dụng',
        'rm': 'Phòng quản lí phòng học'
      };
      
  const studentIdDeptMap = {
        '10': 'Khoa Điện - Điện tử',
        '20': 'Khoa Cơ khí',
        '30': 'Khoa Xây dựng',
        '40': 'Khoa CNTT',
        '50': 'Khoa Hoá',
    '60': 'Khoa Quản lý Công nghiệp'
  };
  
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
    
    if (userData.department_id) {
      const deptId = userData.department_id.toLowerCase();
      department = deptNames[deptId] || `Khoa ${deptId}`;
      shortName = deptId.toUpperCase();
    }
    else if (userData.student_id && userData.student_id.length >= 2) {
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
  
  return Object.values(departmentMap)
    .sort((a, b) => b.count - a.count);
}

// Group bookings by day of week
function groupBookingsByDayOfWeek(bookings) {
  const daysOfWeek = [
    'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'
  ];
  
  const dayStats = {};
  
  daysOfWeek.forEach((day, index) => {
    dayStats[index] = {
      day,
      count: 0,
      completed: 0,
      cancelled: 0
    };
  });
  
  bookings.forEach(booking => {
    const date = new Date(booking.booking_date);
    const dayIndex = date.getDay();
    
    dayStats[dayIndex].count++;
    
    if (booking.status === 'completed') {
      dayStats[dayIndex].completed++;
    } else if (booking.status === 'cancelled') {
      dayStats[dayIndex].cancelled++;
    }
  });
  
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
      
      if (!userBookings[booking.user_id].lastBookingDate || 
          booking.booking_date > userBookings[booking.user_id].lastBookingDate) {
        userBookings[booking.user_id].lastBookingDate = booking.booking_date;
      }
    });
    
    const topUserIds = Object.values(userBookings)
      .sort((a, b) => b.totalBookings - a.totalBookings)
      .slice(0, 10) 
      .map(user => user.userId);
    
    const userPromises = topUserIds.map(userId => User.findById(userId));
    const users = await Promise.all(userPromises);
    
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
  
  if (user.department_id) {
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
  
  const studentId = user.student_id;
  if (!studentId || studentId.length < 2) {
    return 'N/A';
  }
  
  const deptCode = studentId.substring(0, 2);
  
  const deptNames = {
    '10': 'Điện - Điện tử',
    '20': 'Cơ khí',
    '30': 'Xây dựng',
    '40': 'CNTT',
    '50': 'Hoá',
    '60': 'QLCN',
  };
  
  return deptNames[deptCode] || `Khoa ${deptCode}`;
}

// Helper function to calculate date range based on period
function calculateDateRange(period) {
  const today = new Date();
  today.setHours(23, 59, 59, 999); 
  
  let startDate = new Date(today);
  
  switch(period) {
    case 'week':
      startDate.setDate(today.getDate() - 6);
      break;
    case 'month':
      startDate.setDate(today.getDate() - 29);
      break;
    case 'semester':
      startDate.setMonth(today.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(today.getFullYear() - 1);
      break;
    default:
      startDate.setDate(today.getDate() - 6);
  }
  
  startDate.setHours(0, 0, 0, 0); 
  
  return { startDate, endDate: today };
}

// Helper function to calculate user statistics
function calculateUserStatistics(bookings) {
  const totalBookings = bookings.length;
  
  const statusCounts = {
    pending: 0,
    confirmed: 0,
    in_use: 0,
    completed: 0,
    cancelled: 0
  };
  
  const roomTypeCounts = {
    classroom: 0,
    study_room: 0,
    meeting_room: 0,
    lab: 0,
    other: 0
  };
  
  const roomStats = {};
  
  let totalHours = 0;
  
  bookings.forEach(booking => {
    if (statusCounts.hasOwnProperty(booking.status)) {
      statusCounts[booking.status]++;
    }
    
    if (booking.status === 'completed' || booking.status === 'in_use') {
      const roomType = booking.room_type || 'other';
      if (roomTypeCounts.hasOwnProperty(roomType)) {
        roomTypeCounts[roomType]++;
      } else {
        roomTypeCounts.other++;
      }
      
      if (booking.start_time && booking.end_time) {
        const startTime = parseTimeToMinutes(booking.start_time);
        const endTime = parseTimeToMinutes(booking.end_time);
        
        if (!isNaN(startTime) && !isNaN(endTime) && startTime < endTime) {
          const durationHours = (endTime - startTime) / 60;
          totalHours += durationHours;
          
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
  
  const completionRate = totalBookings > 0 ? 
    Math.round((statusCounts.completed / totalBookings) * 100) : 0;
  
  const roomStatsArray = Object.values(roomStats).sort((a, b) => b.usageHours - a.usageHours);
  
  return {
    totalBookings,
    totalHours: Math.round(totalHours * 10) / 10,
    completionRate,
    uniqueRoomsCount: Object.keys(roomStats).length,
    statusCounts,
    roomTypeCounts,
    mostUsedRooms: roomStatsArray.slice(0, 5),
    recentBookings: bookings.slice(0, 5) 
  };
}

// Diagnostic endpoint to check data
exports.diagnosticDataCheck = async (req, res) => {
  try {
    const bookings = await Booking.getAll();
    
    const rooms = await Room.getAll();
    
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