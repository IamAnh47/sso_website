let allBookings = [];
let filteredBookings = [];
let currentPage = 1;
const bookingsPerPage = 10;

const API_BASE_URL = '/api';
const ENDPOINTS = {
    BOOKINGS: `${API_BASE_URL}/bookings`,
    USERS: `${API_BASE_URL}/users`,
    ROOMS: `${API_BASE_URL}/rooms`
};

document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    
    loadBookings();
    
    setupEventListeners();
});

function checkAdminAuth() {
    setupNavigation();
}

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
    
    document.getElementById('booking-management-menu-item').addEventListener('click', function() {
        window.location.href = 'admin-booking-management.html';
    });
    
    document.getElementById('notifications-menu-item').addEventListener('click', function() {
        window.location.href = 'admin-notifications.html';
    });
    
    document.getElementById('statistics-menu-item').addEventListener('click', function() {
        window.location.href = 'admin-statistics.html';
    });
    
    document.getElementById('logout-btn').addEventListener('click', function() {
        logout();
    });
}

function setupEventListeners() {
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('date-filter').addEventListener('change', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('room-type-filter').addEventListener('change', applyFilters);
    
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
    
    document.querySelector('.modal-close').addEventListener('click', function() {
        document.getElementById('booking-details-modal').style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('booking-details-modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

async function loadBookings() {
    try {
        document.getElementById('bookings-loading').style.display = 'flex';
        document.getElementById('bookings-table-container').style.display = 'none';
        document.getElementById('no-bookings').style.display = 'none';
        
        const response = await fetch(ENDPOINTS.BOOKINGS, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch bookings');
        }
        
        allBookings = await response.json();
        
        allBookings.sort((a, b) => {
            const dateA = new Date(a.booking_date + 'T' + a.start_time);
            const dateB = new Date(b.booking_date + 'T' + b.start_time);
            return dateB - dateA;
        });
        
        filteredBookings = [...allBookings];
        displayBookings();
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        document.getElementById('bookings-loading').style.display = 'none';
        document.getElementById('no-bookings').style.display = 'block';
        document.getElementById('no-bookings').innerHTML = `
            <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
            <p>Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Thử lại</button>
        `;
    }
}

function applyFilters() {
    const searchValue = document.getElementById('search-input').value.toLowerCase();
    const dateValue = document.getElementById('date-filter').value;
    const statusValue = document.getElementById('status-filter').value;
    const roomTypeValue = document.getElementById('room-type-filter').value;
    
    filteredBookings = allBookings.filter(booking => {
        const matchesSearch = searchValue === '' || 
            (booking.id && booking.id.toString().includes(searchValue)) ||
            (booking.user_name && booking.user_name.toLowerCase().includes(searchValue)) ||
            (booking.room_name && booking.room_name.toLowerCase().includes(searchValue));
        
        const matchesDate = dateValue === '' || booking.booking_date === dateValue;
        
        const matchesStatus = statusValue === '' || booking.status === statusValue;
        
        const matchesRoomType = roomTypeValue === '' || booking.room_type === roomTypeValue;
        
        return matchesSearch && matchesDate && matchesStatus && matchesRoomType;
    });
    
    currentPage = 1;
    
    displayBookings();
}

function displayBookings() {
    const tableContainer = document.getElementById('bookings-table-container');
    const noBookings = document.getElementById('no-bookings');
    const bookingsList = document.getElementById('bookings-list');
    const loading = document.getElementById('bookings-loading');
    
    loading.style.display = 'none';
    
    bookingsList.innerHTML = '';
    
    if (filteredBookings.length === 0) {
        tableContainer.style.display = 'none';
        noBookings.style.display = 'block';
        return;
    }
    
    tableContainer.style.display = 'block';
    noBookings.style.display = 'none';
    
    const startIndex = (currentPage - 1) * bookingsPerPage;
    const endIndex = Math.min(startIndex + bookingsPerPage, filteredBookings.length);
    const pageBookings = filteredBookings.slice(startIndex, endIndex);
    
    pageBookings.forEach(booking => {
        const row = document.createElement('tr');
        
        const idCell = document.createElement('td');
        idCell.textContent = booking.id || '';
        row.appendChild(idCell);
        
        const userCell = document.createElement('td');
        userCell.textContent = booking.user_name || '';
        row.appendChild(userCell);
        
        const roomCell = document.createElement('td');
        roomCell.textContent = booking.room_name || '';
        row.appendChild(roomCell);
        
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(booking.booking_date) || '';
        row.appendChild(dateCell);
        
        const timeCell = document.createElement('td');
        timeCell.textContent = `${booking.start_time || ''} - ${booking.end_time || ''}`;
        row.appendChild(timeCell);
        
        const statusCell = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = `status status-${booking.status || 'pending'}`;
        statusSpan.textContent = getStatusText(booking.status);
        statusCell.appendChild(statusSpan);
        row.appendChild(statusCell);
        
        const purposeCell = document.createElement('td');
        purposeCell.textContent = booking.purpose || 'N/A';
        row.appendChild(purposeCell);
        
        const actionsCell = document.createElement('td');
        
        if (booking.status === 'pending') {
            const approveBtn = document.createElement('button');
            approveBtn.className = 'btn btn-success';
            approveBtn.innerHTML = '<i class="fas fa-check"></i>';
            approveBtn.title = 'Xác nhận đặt phòng';
            approveBtn.addEventListener('click', () => approveBooking(booking.id));
            actionsCell.appendChild(approveBtn);
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-danger';
            cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
            cancelBtn.title = 'Hủy đặt phòng';
            cancelBtn.addEventListener('click', () => cancelBooking(booking.id));
            actionsCell.appendChild(cancelBtn);
        } else if (booking.status === 'confirmed') {
            const checkinBtn = document.createElement('button');
            checkinBtn.className = 'btn btn-primary';
            checkinBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
            checkinBtn.title = 'Check-in';
            checkinBtn.addEventListener('click', () => checkInBooking(booking.id));
            actionsCell.appendChild(checkinBtn);
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-danger';
            cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
            cancelBtn.title = 'Hủy đặt phòng';
            cancelBtn.addEventListener('click', () => cancelBooking(booking.id));
            actionsCell.appendChild(cancelBtn);
        } else if (booking.status === 'in_use') {
            const checkoutBtn = document.createElement('button');
            checkoutBtn.className = 'btn btn-warning';
            checkoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            checkoutBtn.title = 'Check-out';
            checkoutBtn.addEventListener('click', () => checkOutBooking(booking.id));
            actionsCell.appendChild(checkoutBtn);
        }
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-info';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        viewBtn.title = 'Xem chi tiết';
        viewBtn.addEventListener('click', () => viewBookingDetails(booking.id));
        actionsCell.appendChild(viewBtn);
        
        row.appendChild(actionsCell);
        
        bookingsList.appendChild(row);
    });
    
    renderPagination();
}

function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    
    const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
    
    if (totalPages <= 1) {
        return;
    }
    
    const prevButton = document.createElement('div');
    prevButton.className = 'page-item';
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayBookings();
        }
    });
    paginationContainer.appendChild(prevButton);
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('div');
        pageButton.className = 'page-item';
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            displayBookings();
        });
        paginationContainer.appendChild(pageButton);
    }
    
    const nextButton = document.createElement('div');
    nextButton.className = 'page-item';
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayBookings();
        }
    });
    paginationContainer.appendChild(nextButton);
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'Chờ xác nhận';
        case 'confirmed': return 'Đã xác nhận';
        case 'in_use': return 'Đang sử dụng';
        case 'completed': return 'Đã hoàn thành';
        case 'cancelled': return 'Đã hủy';
        default: return status || 'Không xác định';
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    
    const dateParts = dateString.split('-');
    if (dateParts.length !== 3) return dateString;
    
    return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
}

async function viewBookingDetails(bookingId) {
    try {
        const response = await fetch(`${ENDPOINTS.BOOKINGS}/${bookingId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch booking details');
        }
        
        const booking = await response.json();
        console.log('Booking details:', booking);
        
        const bookingDetailsContent = document.getElementById('booking-details-content');
        bookingDetailsContent.innerHTML = `
            <div style="margin-bottom: 20px;">
                <p><strong>ID:</strong> ${booking.id}</p>
                <p><strong>Người dùng:</strong> ${booking.full_name || booking.user_name || 'N/A'}</p>
                <p><strong>Mã sinh viên:</strong> ${booking.student_id || 'N/A'}</p>
                <p><strong>Phòng:</strong> ${booking.room_name || 'N/A'}</p>
                <p><strong>Vị trí:</strong> ${booking.location || 'N/A'}</p>
                <p><strong>Ngày:</strong> ${formatDate(booking.booking_date)}</p>
                <p><strong>Thời gian:</strong> ${booking.start_time || ''} - ${booking.end_time || ''}</p>
                <p><strong>Trạng thái:</strong> <span class="status status-${booking.status}">${getStatusText(booking.status)}</span></p>
                <p><strong>Mục đích:</strong> ${booking.purpose || 'N/A'}</p>
                <p><strong>Số người tham gia:</strong> ${booking.participants || 'N/A'}</p>
                <p><strong>Ngày tạo:</strong> ${formatDate(booking.created_at)}</p>
            </div>
            <div style="text-align: right;">
                <button class="btn btn-outline modal-close">Đóng</button>
            </div>
        `;
        
        document.getElementById('booking-details-modal').style.display = 'flex';
        
        document.querySelector('.modal-close').addEventListener('click', function() {
            document.getElementById('booking-details-modal').style.display = 'none';
        });
        
    } catch (error) {
        console.error('Error fetching booking details:', error);
        alert('Đã xảy ra lỗi khi tải chi tiết đặt phòng');
    }
}

async function approveBooking(bookingId) {
    if (!confirm('Bạn có chắc chắn muốn xác nhận đặt phòng này?')) {
        return;
    }
    
    try {
        const response = await fetch(`${ENDPOINTS.BOOKINGS}/${bookingId}/confirm`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to confirm booking');
        }
        
        await loadBookings();
        
        alert('Đã xác nhận đặt phòng thành công');
        
    } catch (error) {
        console.error('Error confirming booking:', error);
        alert('Đã xảy ra lỗi khi xác nhận đặt phòng');
    }
}

// Cancel a booking
async function cancelBooking(bookingId) {
    if (!confirm('Bạn có chắc chắn muốn hủy đặt phòng này?')) {
        return;
    }
    
    try {
        const response = await fetch(`${ENDPOINTS.BOOKINGS}/${bookingId}/cancel`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to cancel booking');
        }
        
        await loadBookings();
        
        alert('Đã hủy đặt phòng thành công');
        
    } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('Đã xảy ra lỗi khi hủy đặt phòng');
    }
}

// Check in a booking
async function checkInBooking(bookingId) {
    if (!confirm('Bạn có chắc chắn muốn check-in đặt phòng này?')) {
        return;
    }
    
    try {
        const response = await fetch(`${ENDPOINTS.BOOKINGS}/${bookingId}/checkin`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to check in booking');
        }
        
        await loadBookings();
        
        alert('Đã check-in đặt phòng thành công');
        
    } catch (error) {
        console.error('Error checking in booking:', error);
        alert('Đã xảy ra lỗi khi check-in đặt phòng');
    }
}

// Check out a booking
async function checkOutBooking(bookingId) {
    if (!confirm('Bạn có chắc chắn muốn check-out đặt phòng này?')) {
        return;
    }
    
    try {
        const response = await fetch(`${ENDPOINTS.BOOKINGS}/${bookingId}/checkout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to check out booking');
        }
        
        await loadBookings();
        
        alert('Đã check-out đặt phòng thành công');
        
    } catch (error) {
        console.error('Error checking out booking:', error);
        alert('Đã xảy ra lỗi khi check-out đặt phòng');
    }
}

function exportToCSV() {
    if (filteredBookings.length === 0) {
        alert('Không có dữ liệu để xuất');
        return;
    }
    
    let csvContent = 'ID,Người dùng,Phòng,Ngày,Giờ bắt đầu,Giờ kết thúc,Trạng thái,Mục đích,Số người\n';
    
    filteredBookings.forEach(booking => {
        const row = [
            booking.id || '',
            booking.user_name || '',
            booking.room_name || '',
            booking.booking_date || '',
            booking.start_time || '',
            booking.end_time || '',
            getStatusText(booking.status),
            (booking.purpose || '').replace(/,/g, ';'),
            booking.num_attendees || ''
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bookings_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    
    link.click();
    
    document.body.removeChild(link);
} 