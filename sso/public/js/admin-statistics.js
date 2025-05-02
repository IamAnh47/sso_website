const API_BASE_URL = '/api';
const ENDPOINTS = {
    DASHBOARD_STATS: `${API_BASE_URL}/dashboard/stats`,
    BOOKING_TRENDS: `${API_BASE_URL}/dashboard/bookings/trend`,
    ROOM_USAGE: `${API_BASE_URL}/dashboard/rooms/usage`,
    BOOKING_PURPOSE: `${API_BASE_URL}/dashboard/bookings/purpose`,
    DEPARTMENT_STATS: `${API_BASE_URL}/dashboard/departments`,
    TOP_USERS: `${API_BASE_URL}/dashboard/users/top`
};

let statsData = {
    bookingsTrend: [],
    roomUsage: [],
    bookingPurpose: [],
    departmentStats: [],
    topUsers: []
};

let bookingTrendChart, roomUsageChart, bookingPurposeChart, departmentChart;

document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    
    initializeCharts();
    
    loadAllStatistics();

    document.getElementById('time-filter').addEventListener('change', function() {
        const timeFilter = this.value;
        loadAllStatistics(timeFilter);
    });

    document.getElementById('refresh-btn').addEventListener('click', function() {
        loadAllStatistics(document.getElementById('time-filter').value);
    });
});

function setupNavigation() {
    document.getElementById('overview-menu-item').addEventListener('click', function() {
        window.location.href = 'admin-overview.html';
    });
    
    document.getElementById('room-management-menu-item').addEventListener('click', function() {
        window.location.href = 'admin-room-management.html';
    });
    
    document.getElementById('user-management-menu-item').addEventListener('click', function() {
        window.location.href = 'admin-user-management.html';
    });
    
    document.getElementById('statistics-menu-item').addEventListener('click', function() {
        window.location.href = 'admin-statistics.html';
    });
    
    document.getElementById('logout-btn').addEventListener('click', function() {
        fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        })
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('Logout error:', error);
            window.location.href = 'index.html';
        });
    });
}

function initializeCharts() {
    const bookingTrendCtx = document.getElementById('bookingTrendChart').getContext('2d');
    bookingTrendChart = new Chart(bookingTrendCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Số lượt đặt phòng',
                data: [],
                borderColor: '#4e73df',
                backgroundColor: 'rgba(78, 115, 223, 0.05)',
                borderWidth: 2,
                pointBackgroundColor: '#4e73df',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    const roomUsageCtx = document.getElementById('roomUsageChart').getContext('2d');
    roomUsageChart = new Chart(roomUsageCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Tỉ lệ sử dụng (%)',
                data: [],
                backgroundColor: [],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    const bookingPurposeCtx = document.getElementById('bookingPurposeChart').getContext('2d');
    bookingPurposeChart = new Chart(bookingPurposeCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });

    const departmentCtx = document.getElementById('departmentChart').getContext('2d');
    departmentChart = new Chart(departmentCtx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

async function loadAllStatistics(timeFilter = 'month') {
    try {
        document.querySelectorAll('.stat-value').forEach(el => {
            el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        });
        
        await Promise.all([
            fetchDashboardStats(timeFilter),
            fetchBookingTrends(timeFilter),
            fetchRoomUsage(timeFilter),
            fetchBookingPurpose(timeFilter),
            fetchDepartmentStats(timeFilter),
            fetchTopUsers(timeFilter)
        ]);

        updateStatCards();
        updateCharts();
        updateTopUsersTable();
    } catch (error) {
        console.error('Error loading statistics:', error);
        alert('Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.');
    }
}

async function fetchDashboardStats(timeFilter) {
    const response = await fetch(`${ENDPOINTS.DASHBOARD_STATS}?period=${timeFilter}`, {
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
    }
    
    statsData.dashboardStats = await response.json();
    return statsData.dashboardStats;
}

async function fetchBookingTrends(timeFilter) {
    const response = await fetch(`${ENDPOINTS.BOOKING_TRENDS}?period=${timeFilter}`, {
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch booking trends');
    }
    
    statsData.bookingsTrend = await response.json();
    return statsData.bookingsTrend;
}

async function fetchRoomUsage(timeFilter) {
    const response = await fetch(`${ENDPOINTS.ROOM_USAGE}?period=${timeFilter}`, {
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch room usage');
    }
    
    statsData.roomUsage = await response.json();
    return statsData.roomUsage;
}

async function fetchBookingPurpose(timeFilter) {
    const response = await fetch(`${ENDPOINTS.BOOKING_PURPOSE}?period=${timeFilter}`, {
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch booking purpose');
    }
    
    statsData.bookingPurpose = await response.json();
    return statsData.bookingPurpose;
}

async function fetchDepartmentStats(timeFilter) {
    const response = await fetch(`${ENDPOINTS.DEPARTMENT_STATS}?period=${timeFilter}`, {
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch department stats');
    }
    
    statsData.departmentStats = await response.json();
    return statsData.departmentStats;
}

async function fetchTopUsers(timeFilter) {
    const response = await fetch(`${ENDPOINTS.TOP_USERS}?period=${timeFilter}`, {
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch top users');
    }
    
    statsData.topUsers = await response.json();
    return statsData.topUsers;
}

function updateStatCards() {
    const stats = statsData.dashboardStats;
    if (!stats) return;

    document.querySelector('.stat-card-primary .stat-value').textContent = stats.totalBookings || 0;
    const bookingTrend = document.querySelector('.stat-card-primary .stat-trend');
    if (stats.bookingTrendPercentage > 0) {
        bookingTrend.innerHTML = `<i class="fas fa-arrow-up mr-1"></i> ${stats.bookingTrendPercentage}% so với kỳ trước`;
        bookingTrend.className = 'stat-trend trend-up';
    } else {
        bookingTrend.innerHTML = `<i class="fas fa-arrow-down mr-1"></i> ${Math.abs(stats.bookingTrendPercentage)}% so với kỳ trước`;
        bookingTrend.className = 'stat-trend trend-down';
    }

    document.querySelector('.stat-card-success .stat-value').textContent = `${stats.roomUsageRate || 0}%`;
    const usageTrend = document.querySelector('.stat-card-success .stat-trend');
    if (stats.usageRateTrendPercentage > 0) {
        usageTrend.innerHTML = `<i class="fas fa-arrow-up mr-1"></i> ${stats.usageRateTrendPercentage}% so với kỳ trước`;
        usageTrend.className = 'stat-trend trend-up';
    } else {
        usageTrend.innerHTML = `<i class="fas fa-arrow-down mr-1"></i> ${Math.abs(stats.usageRateTrendPercentage)}% so với kỳ trước`;
        usageTrend.className = 'stat-trend trend-down';
    }

    document.querySelector('.stat-card-warning .stat-value').textContent = `${stats.avgUsageTime || 0}h`;
    const timeTrend = document.querySelector('.stat-card-warning .stat-trend');
    if (stats.avgTimeTrendHours > 0) {
        timeTrend.innerHTML = `<i class="fas fa-arrow-up mr-1"></i> ${stats.avgTimeTrendHours}h so với kỳ trước`;
        timeTrend.className = 'stat-trend trend-up';
    } else {
        timeTrend.innerHTML = `<i class="fas fa-arrow-down mr-1"></i> ${Math.abs(stats.avgTimeTrendHours)}h so với kỳ trước`;
        timeTrend.className = 'stat-trend trend-down';
    }

    document.querySelector('.stat-card-danger .stat-value').textContent = `${stats.cancellationRate || 0}%`;
    const cancelTrend = document.querySelector('.stat-card-danger .stat-trend');
    if (stats.cancellationTrendPercentage > 0) {
        cancelTrend.innerHTML = `<i class="fas fa-arrow-up mr-1"></i> ${stats.cancellationTrendPercentage}% so với kỳ trước`;
        cancelTrend.className = 'stat-trend trend-down'; 
    } else {
        cancelTrend.innerHTML = `<i class="fas fa-arrow-down mr-1"></i> ${Math.abs(stats.cancellationTrendPercentage)}% so với kỳ trước`;
        cancelTrend.className = 'stat-trend trend-up';
    }
}

function updateCharts() {
    if (statsData.bookingsTrend && statsData.bookingsTrend.data) {
        bookingTrendChart.data.labels = statsData.bookingsTrend.labels || [];
        bookingTrendChart.data.datasets[0].data = statsData.bookingsTrend.data || [];
        bookingTrendChart.update();
    }

    if (statsData.roomUsage && statsData.roomUsage.data) {
        roomUsageChart.data.labels = statsData.roomUsage.rooms || [];
        roomUsageChart.data.datasets[0].data = statsData.roomUsage.data || [];
        const colors = generateColors(statsData.roomUsage.data.length);
        roomUsageChart.data.datasets[0].backgroundColor = colors;
        roomUsageChart.update();
    }

    if (statsData.bookingPurpose && statsData.bookingPurpose.data) {
        bookingPurposeChart.data.labels = statsData.bookingPurpose.purposes || [];
        bookingPurposeChart.data.datasets[0].data = statsData.bookingPurpose.data || [];
        bookingPurposeChart.update();
    }

    if (statsData.departmentStats && statsData.departmentStats.data) {
        departmentChart.data.labels = statsData.departmentStats.departments || [];
        departmentChart.data.datasets[0].data = statsData.departmentStats.data || [];
        departmentChart.update();
    }
}

function updateTopUsersTable() {
    const tableBody = document.querySelector('.table tbody');
    if (!statsData.topUsers || !statsData.topUsers.length) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Không có dữ liệu</td></tr>';
        return;
    }

    let html = '';
    statsData.topUsers.forEach(user => {
        html += `
            <tr>
                <td>${user.fullName || 'N/A'}</td>
                <td>${user.department || 'N/A'}</td>
                <td>${user.bookingCount || 0}</td>
                <td>${user.totalHours || 0}h</td>
                <td>${user.cancellationRate || 0}%</td>
                <td>${user.lastBookingDate || 'N/A'}</td>
            </tr>
        `;
    });
    tableBody.innerHTML = html;
}

function generateColors(count) {
    const defaultColors = [
        'rgba(78, 115, 223, 0.8)',
        'rgba(28, 200, 138, 0.8)',
        'rgba(246, 194, 62, 0.8)',
        'rgba(231, 74, 59, 0.8)',
        'rgba(54, 185, 204, 0.8)',
        'rgba(133, 135, 150, 0.8)'
    ];

    if (count <= defaultColors.length) {
        return defaultColors.slice(0, count);
    }

    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(defaultColors[i % defaultColors.length]);
    }
    return colors;
} 