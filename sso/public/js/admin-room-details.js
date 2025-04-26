// API endpoints
const API_BASE_URL = '/api';
const roomId = new URLSearchParams(window.location.search).get('id') || '1';

const ENDPOINTS = {
    ROOM: `${API_BASE_URL}/rooms/${roomId}`,
    ROOM_STATS: `${API_BASE_URL}/dashboard/room/${roomId}`,
    BOOKINGS: `${API_BASE_URL}/bookings`
};

// State management for room data
let roomData = {
    details: {},
    stats: {},
    bookingHistory: []
};

// Charts
let dayChart, timeChart;

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Setup navigation
    setupNavigation();
    
    // Initialize Charts
    initializeCharts();
    
    try {
        // Load room data
        await Promise.all([
            fetchRoomDetails(),
            fetchRoomStats()
        ]);
        
        // Update UI with fetched data
        updateRoomDetails();
        updateRoomStats();
        renderBookingHistory();
    } catch (error) {
        console.error("Error loading data from APIs:", error);
        // Display an error message instead of using demo data
        displayErrorMessage("Không thể tải dữ liệu phòng. Vui lòng thử lại sau.");
    }
    
    // Event listeners for period selection
    document.getElementById('period-select').addEventListener('change', async function() {
        try {
            await fetchRoomStats();
            updateRoomStats();
        } catch (error) {
            console.error("Error refreshing stats:", error);
            alert("Không thể cập nhật dữ liệu. Vui lòng thử lại sau.");
        }
    });
    
    document.getElementById('refresh-stats').addEventListener('click', async function() {
        try {
            await fetchRoomStats();
            updateRoomStats();
        } catch (error) {
            console.error("Error refreshing stats:", error);
            alert("Không thể cập nhật dữ liệu. Vui lòng thử lại sau.");
        }
    });
    
    // Set up modal functionality
    setupModalFunctionality();
    
    // Set up file upload
    setupFileUpload();
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
        // Call logout API
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

function setupModalFunctionality() {
    const editRoomModal = document.getElementById('edit-room-modal');
    const uploadImageModal = document.getElementById('upload-image-modal');
    
    document.getElementById('edit-room-btn').addEventListener('click', function() {
        editRoomModal.style.display = 'flex';
    });
    
    document.getElementById('upload-image-btn').addEventListener('click', function() {
        uploadImageModal.style.display = 'flex';
    });
    
    document.querySelectorAll('.modal-close, #cancel-edit-btn, #cancel-upload-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            editRoomModal.style.display = 'none';
            uploadImageModal.style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === editRoomModal) {
            editRoomModal.style.display = 'none';
        }
        if (event.target === uploadImageModal) {
            uploadImageModal.style.display = 'none';
        }
    });
    
    // Save room changes
    document.getElementById('save-room-btn').addEventListener('click', async function() {
        await saveRoomChanges();
    });
    
    // Upload images
    document.getElementById('upload-btn').addEventListener('click', function() {
        uploadImages();
    });
    
    // Delete room
    document.getElementById('delete-room-btn').addEventListener('click', async function() {
        await deleteRoom();
    });
    
    // Change room status
    document.getElementById('change-status-btn').addEventListener('click', async function() {
        await changeRoomStatus();
    });
    
    // Export booking history
    document.getElementById('export-history-btn').addEventListener('click', function() {
        exportBookingHistory();
    });
}

// Initialize charts with empty data
function initializeCharts() {
    const dayCtx = document.getElementById('day-chart').getContext('2d');
    dayChart = new Chart(dayCtx, {
        type: 'bar',
        data: {
            labels: ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
            datasets: [{
                label: 'Số lượt đặt phòng',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(78, 115, 223, 0.8)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
    
    const timeCtx = document.getElementById('time-chart').getContext('2d');
    timeChart = new Chart(timeCtx, {
        type: 'pie',
        data: {
            labels: ['Buổi sáng (6h-12h)', 'Buổi chiều (12h-18h)', 'Buổi tối (18h-24h)'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(78, 115, 223, 0.8)',
                    'rgba(28, 200, 138, 0.8)',
                    'rgba(246, 194, 62, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Fetch room details from API
async function fetchRoomDetails() {
    const response = await fetch(ENDPOINTS.ROOM, {
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch room details');
    }
    
    roomData.details = await response.json();
    return roomData.details;
}

// Fetch room statistics from API
async function fetchRoomStats() {
    const period = document.getElementById('period-select').value;
    const response = await fetch(`${ENDPOINTS.ROOM_STATS}?period=${period}`, {
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error('Failed to fetch room stats');
    }
    
    roomData.stats = await response.json();
    
    // Update booking history from the stats data
    if (roomData.stats.recentBookings) {
        roomData.bookingHistory = roomData.stats.recentBookings;
    }
    
    return roomData.stats;
}

// Update room details in the UI
function updateRoomDetails() {
    const room = roomData.details;
    if (!room || !room.id) return;
    
    // Update room title and info
    document.getElementById('room-title').textContent = room.room_name;
    document.getElementById('room-id-display').textContent = `ID: ${room.id}`;
    
    // Update room status
    const statusElement = document.getElementById('room-status');
    let statusClass = '';
    let statusText = '';
    
    switch (room.status) {
        case 'available':
            statusClass = 'status-available';
            statusText = 'Còn trống';
            break;
        case 'occupied':
        case 'in_use':
            statusClass = 'status-occupied';
            statusText = 'Đang sử dụng';
            break;
        case 'maintenance':
            statusClass = 'status-maintenance';
            statusText = 'Bảo trì';
            break;
        default:
            statusClass = 'status-maintenance';
            statusText = room.status;
    }
    
    statusElement.className = `room-status ${statusClass}`;
    statusElement.textContent = statusText;
    
    // Update room details
    document.getElementById('room-capacity').textContent = `${room.capacity} người`;
    document.getElementById('room-location').textContent = room.location;
    document.getElementById('room-type').textContent = room.room_type;
    
    // Update room image if available
    if (room.image_url) {
        document.getElementById('main-room-image').src = room.image_url;
    }
    
    // Update equipment list
    if (room.facilities) {
        const facilitiesArray = typeof room.facilities === 'string' ? 
            JSON.parse(room.facilities) : room.facilities;
            
        const equipmentList = document.getElementById('equipment-list');
        equipmentList.innerHTML = '';
        
        if (Array.isArray(facilitiesArray)) {
            facilitiesArray.forEach(item => {
                const equipmentItem = document.createElement('span');
                equipmentItem.className = 'equipment-item';
                equipmentItem.textContent = item;
                equipmentList.appendChild(equipmentItem);
            });
        } else if (typeof facilitiesArray === 'string') {
            const items = facilitiesArray.split(',').map(item => item.trim());
            items.forEach(item => {
                const equipmentItem = document.createElement('span');
                equipmentItem.className = 'equipment-item';
                equipmentItem.textContent = item;
                equipmentList.appendChild(equipmentItem);
            });
        }
    }
    
    // Fill edit form with room data
    document.getElementById('room-name').value = room.room_name || '';
    document.getElementById('room-id').value = room.id || '';
    document.getElementById('room-type').value = room.room_type || '';
    document.getElementById('room-capacity').value = room.capacity || '';
    document.getElementById('room-status').value = room.status || 'available';
    document.getElementById('room-location').value = room.location || '';
    document.getElementById('room-equipment').value = room.facilities || '';
    document.getElementById('room-description').value = room.description || '';
}

// Update statistics in the UI
function updateRoomStats() {
    if (!roomData.stats || !roomData.stats.bookingStats) return;
    
    const stats = roomData.stats.bookingStats;
    
    // Update stat cards
    document.getElementById('total-bookings').textContent = stats.totalBookings || '0';
    document.getElementById('usage-rate').textContent = `${stats.usageRate || '0'}%`;
    document.getElementById('avg-time').textContent = `${Math.round((stats.avgUsageTime || 0) / 60)}h`;
    
    const cancelRate = stats.statusCount && stats.statusCount.total > 0 ? 
        Math.round((stats.statusCount.cancelled / stats.statusCount.total) * 100) : 0;
    document.getElementById('cancel-rate').textContent = `${cancelRate}%`;
    
    // Update charts
    if (stats.bookingsByDayOfWeek) {
        const dayData = stats.bookingsByDayOfWeek.map(day => day.count);
        dayChart.data.datasets[0].data = dayData;
        dayChart.update();
    }
    
    if (stats.bookingsByTimeOfDay) {
        const timeData = stats.bookingsByTimeOfDay.map(slot => slot.count);
        timeChart.data.datasets[0].data = timeData;
        timeChart.update();
    }
}

// Render booking history
function renderBookingHistory() {
    const tableBody = document.getElementById('booking-history');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const bookings = roomData.bookingHistory || [];
    
    if (bookings.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 7;
        emptyCell.textContent = 'Không có lịch sử đặt phòng';
        emptyCell.style.textAlign = 'center';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }
    
    bookings.forEach(booking => {
        const row = document.createElement('tr');
        
        const idCell = document.createElement('td');
        idCell.textContent = booking.id;
        
        const userCell = document.createElement('td');
        userCell.textContent = booking.user;
        
        const startTimeCell = document.createElement('td');
        startTimeCell.textContent = `${booking.date} ${booking.start_time}`;
        
        const endTimeCell = document.createElement('td');
        endTimeCell.textContent = `${booking.date} ${booking.end_time}`;
        
        const statusCell = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = 'status';
        
        if (booking.status === 'completed') {
            statusSpan.classList.add('status-available');
            statusSpan.textContent = 'Đã hoàn thành';
        } else if (booking.status === 'cancelled') {
            statusSpan.classList.add('status-occupied');
            statusSpan.textContent = 'Đã hủy';
        } else if (booking.status === 'in_use') {
            statusSpan.classList.add('status-maintenance');
            statusSpan.textContent = 'Đang sử dụng';
        } else if (booking.status === 'confirmed') {
            statusSpan.classList.add('status-maintenance');
            statusSpan.textContent = 'Đã xác nhận';
        } else {
            statusSpan.classList.add('status-maintenance');
            statusSpan.textContent = 'Chờ xác nhận';
        }
        
        statusCell.appendChild(statusSpan);
        
        const purposeCell = document.createElement('td');
        purposeCell.textContent = booking.purpose;
        
        const actionsCell = document.createElement('td');
        
        if (['pending', 'confirmed'].includes(booking.status)) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-danger';
            cancelBtn.innerHTML = '<i class="fas fa-times"></i> Hủy';
            cancelBtn.style.marginRight = '5px';
            cancelBtn.addEventListener('click', function() {
                if (confirm(`Bạn có chắc chắn muốn hủy đặt phòng ${booking.id}?`)) {
                    cancelBooking(booking.id);
                }
            });
            
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-outline';
            editBtn.innerHTML = '<i class="fas fa-edit"></i> Sửa';
            editBtn.addEventListener('click', function() {
                alert(`Chỉnh sửa đặt phòng ${booking.id}`);
            });
            
            actionsCell.appendChild(cancelBtn);
            actionsCell.appendChild(editBtn);
        } else {
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-outline';
            viewBtn.innerHTML = '<i class="fas fa-eye"></i> Xem';
            viewBtn.addEventListener('click', function() {
                alert(`Xem chi tiết đặt phòng ${booking.id}`);
            });
            
            actionsCell.appendChild(viewBtn);
        }
        
        row.appendChild(idCell);
        row.appendChild(userCell);
        row.appendChild(startTimeCell);
        row.appendChild(endTimeCell);
        row.appendChild(statusCell);
        row.appendChild(purposeCell);
        row.appendChild(actionsCell);
        
        tableBody.appendChild(row);
    });
}

// Save room changes
async function saveRoomChanges() {
    const roomData = {
        room_name: document.getElementById('room-name').value,
        location: document.getElementById('room-location').value,
        capacity: parseInt(document.getElementById('room-capacity').value) || 0,
        room_type: document.getElementById('room-type').value,
        facilities: document.getElementById('room-equipment').value,
        status: document.getElementById('room-status').value,
        description: document.getElementById('room-description').value
    };
    
    // Validate form data
    if (!roomData.room_name || !roomData.location || !roomData.room_type) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc: Tên phòng, vị trí và loại phòng!');
        return;
    }
    
    try {
        const response = await fetch(ENDPOINTS.ROOM, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(roomData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update room');
        }
        
        // Update local data
        await fetchRoomDetails();
        updateRoomDetails();
        
        // Close modal
        document.getElementById('edit-room-modal').style.display = 'none';
        
        alert('Thông tin phòng đã được cập nhật thành công!');
    } catch (error) {
        console.error('Error updating room:', error);
        alert(`Lỗi khi cập nhật phòng: ${error.message}`);
    }
}

// Delete room
async function deleteRoom() {
    if (confirm(`Bạn có chắc chắn muốn xóa phòng ${roomId}?`)) {
        try {
            const response = await fetch(ENDPOINTS.ROOM, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete room');
            }
            
            alert('Phòng đã được xóa thành công!');
            
            // Redirect to room management page
            window.location.href = 'admin-room-management.html';
        } catch (error) {
            console.error('Error deleting room:', error);
            alert(`Lỗi khi xóa phòng: ${error.message}`);
        }
    }
}

// Change room status
async function changeRoomStatus() {
    let newStatus;
    
    switch (roomData.details.status) {
        case 'available':
            newStatus = 'maintenance';
            break;
        case 'maintenance':
            newStatus = 'available';
            break;
        case 'occupied':
        case 'in_use':
            newStatus = 'maintenance';
            break;
        default:
            newStatus = 'available';
    }
    
    try {
        const response = await fetch(`${ENDPOINTS.ROOM}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error('Failed to change room status');
        }
        
        // Update local data
        await fetchRoomDetails();
        updateRoomDetails();
        
        alert(`Trạng thái phòng đã được chuyển sang "${newStatus === 'available' ? 'Còn trống' : 'Bảo trì'}"`);
    } catch (error) {
        console.error('Error changing room status:', error);
        alert(`Lỗi khi thay đổi trạng thái phòng: ${error.message}`);
    }
}

// Cancel booking
async function cancelBooking(bookingId) {
    try {
        const response = await fetch(`${ENDPOINTS.BOOKINGS}/${bookingId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to cancel booking');
        }
        
        // Refresh booking history
        await fetchRoomStats();
        renderBookingHistory();
        
        alert('Đã hủy đặt phòng thành công!');
    } catch (error) {
        console.error('Error cancelling booking:', error);
        alert(`Lỗi khi hủy đặt phòng: ${error.message}`);
    }
}

// Export booking history
function exportBookingHistory() {
    const bookings = roomData.bookingHistory || [];
    if (bookings.length === 0) {
        alert('Không có dữ liệu lịch sử đặt phòng để xuất!');
        return;
    }
    
    // Generate CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Headers
    csvContent += "ID,Người đặt,Ngày đặt,Giờ bắt đầu,Giờ kết thúc,Trạng thái,Mục đích\n";
    
    // Data rows
    bookings.forEach(booking => {
        let statusText = '';
        
        switch(booking.status) {
            case 'completed': statusText = 'Đã hoàn thành'; break;
            case 'cancelled': statusText = 'Đã hủy'; break;
            case 'in_use': statusText = 'Đang sử dụng'; break;
            case 'confirmed': statusText = 'Đã xác nhận'; break;
            case 'pending': statusText = 'Chờ xác nhận'; break;
            default: statusText = booking.status;
        }
        
        csvContent += `${booking.id},"${booking.user}","${booking.date}","${booking.start_time}","${booking.end_time}","${statusText}","${booking.purpose || ''}"\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lich-su-dat-phong-${roomId}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
    
    alert('Đã xuất báo cáo lịch sử đặt phòng!');
}

// Setup file upload
function setupFileUpload() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileSelectBtn = document.getElementById('file-select-btn');
    const previewContainer = document.getElementById('preview-container');
    const uploadBtn = document.getElementById('upload-btn');
    
    if (!dropArea || !fileInput || !fileSelectBtn) return;
    
    fileSelectBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Add highlight on drag over
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = 'var(--primary-color)';
    });
    
    // Remove highlight when drag leave
    dropArea.addEventListener('dragleave', () => {
        dropArea.style.borderColor = '#ccc';
    });
    
    // Handle dropped files
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.style.borderColor = '#ccc';
        
        if (e.dataTransfer.files.length) {
            handleFiles(e.dataTransfer.files);
        }
    });
    
    // Handle selected files
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFiles(fileInput.files);
        }
    });
    
    // Process files and generate previews
    function handleFiles(files) {
        previewContainer.innerHTML = '';
        
        for (const file of files) {
            if (!file.type.match('image.*')) continue;
            
            const reader = new FileReader();
            const preview = document.createElement('div');
            preview.className = 'image-preview';
            preview.style.position = 'relative';
            
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100%';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '4px';
                
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '&times;';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '2px';
                removeBtn.style.right = '2px';
                removeBtn.style.background = 'rgba(255, 255, 255, 0.7)';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '20px';
                removeBtn.style.height = '20px';
                removeBtn.style.cursor = 'pointer';
                
                removeBtn.addEventListener('click', () => {
                    preview.remove();
                });
                
                preview.appendChild(img);
                preview.appendChild(removeBtn);
                previewContainer.appendChild(preview);
            };
            
            reader.readAsDataURL(file);
        }
    }
    
    // Upload images
    uploadBtn.addEventListener('click', async function() {
        if (previewContainer.children.length === 0) {
            alert('Vui lòng chọn ít nhất một ảnh để tải lên!');
            return;
        }
        
        const formData = new FormData();
        
        // Get all files from file input
        for (const file of fileInput.files) {
            if (file.type.match('image.*')) {
                formData.append('images', file);
            }
        }
        
        try {
            const response = await fetch(`${ENDPOINTS.ROOM}/images`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to upload images');
            }
            
            // Refresh room details
            await fetchRoomDetails();
            updateRoomDetails();
            
            // Close modal
            document.getElementById('upload-image-modal').style.display = 'none';
            
            // Clear preview container
            previewContainer.innerHTML = '';
            
            alert('Ảnh đã được tải lên thành công!');
        } catch (error) {
            console.error('Error uploading images:', error);
            alert(`Lỗi khi tải ảnh lên: ${error.message}`);
        }
    });
}

// Change main room image
function changeMainImage(src, thumbElement) {
    document.getElementById('main-room-image').src = src;
    
    // Update active thumbnail
    document.querySelectorAll('.detail-thumbnail').forEach(thumb => {
        thumb.classList.remove('active');
    });
    thumbElement.classList.add('active');
}

// Helper function to display error messages
function displayErrorMessage(message) {
    const mainContent = document.querySelector('.content-wrapper');
    if (mainContent) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.padding = '20px';
        errorDiv.style.margin = '20px 0';
        errorDiv.style.backgroundColor = '#f8d7da';
        errorDiv.style.color = '#721c24';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.textAlign = 'center';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>${message}</p>
            <button id="retry-btn" class="btn" style="background-color: #4e73df; color: white; margin-top: 10px;">
                <i class="fas fa-sync"></i> Thử lại
            </button>
        `;
        mainContent.innerHTML = '';
        mainContent.appendChild(errorDiv);
        
        document.getElementById('retry-btn').addEventListener('click', function() {
            window.location.reload();
        });
    }
} 