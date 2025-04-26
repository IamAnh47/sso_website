// API endpoints
const API_BASE_URL = '/api';
const ENDPOINTS = {
    ROOMS: `${API_BASE_URL}/rooms`,
    ROOM_TYPES: `${API_BASE_URL}/room-types`
};

// State management for rooms data
let roomsData = [];
let roomTypes = [];
let currentFilters = {
    status: 'all',
    type: 'all',
    search: ''
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Setup navigation
    setupNavigation();
    
    // Initialize rooms page
    initializeRoomsPage();
    
    // Add event listeners for modals
    setupModalListeners();
    
    // Add event listeners for filters
    setupFilterListeners();
    
    // Add event listener for export button
    document.getElementById('export-btn').addEventListener('click', exportRoomsToCSV);
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

async function initializeRoomsPage() {
    try {
        // Load room types and rooms data
        await Promise.all([
            loadRoomTypes(),
            loadRoomsData()
        ]);
        
        // Populate room type filter
        populateRoomTypeFilter();
        
        // Generate room cards
        generateRoomCards(roomsData);
    } catch (error) {
        console.error('Error initializing rooms page:', error);
        alert('Không thể tải dữ liệu phòng. Vui lòng làm mới trang.');
    }
}

function setupModalListeners() {
    const addRoomModal = document.getElementById('add-room-modal');
    const editRoomModal = document.getElementById('edit-room-modal');
    
    // Add room button
    document.getElementById('add-room-btn').addEventListener('click', function() {
        // Reset form
        document.getElementById('add-room-form').reset();
        
        // Populate room type select
        populateRoomTypeSelect('add-room-type');
        
        // Show modal
        addRoomModal.style.display = 'flex';
    });
    
    // Close modals
    document.querySelectorAll('.modal-close, #cancel-add-btn, #cancel-edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            addRoomModal.style.display = 'none';
            editRoomModal.style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === addRoomModal) {
            addRoomModal.style.display = 'none';
        }
        if (event.target === editRoomModal) {
            editRoomModal.style.display = 'none';
        }
    });
    
    // Submit add room form
    document.getElementById('add-room-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        await addRoom();
    });
    
    // Submit edit room form
    document.getElementById('edit-room-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        await updateRoom();
    });
}

function setupFilterListeners() {
    // Status filter
    document.getElementById('status-filter').addEventListener('change', function() {
        currentFilters.status = this.value;
        applyFilters();
    });
    
    // Type filter
    document.getElementById('type-filter').addEventListener('change', function() {
        currentFilters.type = this.value;
        applyFilters();
    });
    
    // Search input
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = this.value.toLowerCase();
            applyFilters();
        }, 300);
    });
    
    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', function() {
        document.getElementById('status-filter').value = 'all';
        document.getElementById('type-filter').value = 'all';
        document.getElementById('search-input').value = '';
        
        currentFilters = {
            status: 'all',
            type: 'all',
            search: ''
        };
        
        applyFilters();
    });
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', async function() {
        try {
            await loadRoomsData();
            applyFilters();
            alert('Đã làm mới dữ liệu phòng!');
        } catch (error) {
            console.error('Error refreshing rooms data:', error);
            alert('Không thể làm mới dữ liệu phòng.');
        }
    });
}

async function loadRoomTypes() {
    try {
        const response = await fetch(ENDPOINTS.ROOM_TYPES, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch room types');
        }
        
        roomTypes = await response.json();
        return roomTypes;
    } catch (error) {
        console.error('Error loading room types:', error);
        // Fallback data if API fails
        roomTypes = [
            { id: 1, name: 'Phòng học', code: 'classroom' },
            { id: 2, name: 'Phòng họp', code: 'meeting' },
            { id: 3, name: 'Phòng thí nghiệm', code: 'lab' },
            { id: 4, name: 'Phòng máy tính', code: 'computer' }
        ];
        return roomTypes;
    }
}

async function loadRoomsData() {
    try {
        const response = await fetch(ENDPOINTS.ROOMS, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch rooms data');
        }
        
        roomsData = await response.json();
        return roomsData;
    } catch (error) {
        console.error('Error loading rooms data:', error);
        // Fallback data if API fails
        roomsData = [
            {
                id: 1,
                room_name: 'Phòng H6.101',
                room_type: 'classroom',
                room_type_name: 'Phòng học',
                capacity: 40,
                location: 'Tòa H6, Tầng 1',
                status: 'available',
                image_url: 'https://via.placeholder.com/300x200?text=H6.101',
                facilities: ['Máy chiếu', 'Bảng trắng', 'Máy lạnh', 'Bàn ghế']
            },
            {
                id: 2,
                room_name: 'Phòng H6.201',
                room_type: 'meeting',
                room_type_name: 'Phòng họp',
                capacity: 20,
                location: 'Tòa H6, Tầng 2',
                status: 'occupied',
                image_url: 'https://via.placeholder.com/300x200?text=H6.201',
                facilities: ['Máy chiếu', 'Bảng trắng', 'Máy lạnh', 'Bàn ghế']
            },
            {
                id: 3,
                room_name: 'Phòng H6.301',
                room_type: 'lab',
                room_type_name: 'Phòng thí nghiệm',
                capacity: 30,
                location: 'Tòa H6, Tầng 3',
                status: 'maintenance',
                image_url: 'https://via.placeholder.com/300x200?text=H6.301',
                facilities: ['Máy chiếu', 'Bảng trắng', 'Máy lạnh', 'Thiết bị thí nghiệm']
            }
        ];
        return roomsData;
    }
}

function populateRoomTypeFilter() {
    const typeFilter = document.getElementById('type-filter');
    
    // Clear existing options except first one
    while (typeFilter.options.length > 1) {
        typeFilter.remove(1);
    }
    
    // Add room types from data
    roomTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.code;
        option.textContent = type.name;
        typeFilter.appendChild(option);
    });
}

function populateRoomTypeSelect(elementId) {
    const typeSelect = document.getElementById(elementId);
    
    // Clear existing options
    typeSelect.innerHTML = '';
    
    // Add room types from data
    roomTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.code;
        option.textContent = type.name;
        typeSelect.appendChild(option);
    });
}

function applyFilters() {
    let filteredRooms = [...roomsData];
    
    // Apply status filter
    if (currentFilters.status !== 'all') {
        filteredRooms = filteredRooms.filter(room => room.status === currentFilters.status);
    }
    
    // Apply type filter
    if (currentFilters.type !== 'all') {
        filteredRooms = filteredRooms.filter(room => room.room_type === currentFilters.type);
    }
    
    // Apply search filter
    if (currentFilters.search) {
        filteredRooms = filteredRooms.filter(room => 
            room.room_name.toLowerCase().includes(currentFilters.search) ||
            room.location.toLowerCase().includes(currentFilters.search)
        );
    }
    
    // Update filtered count
    const countElement = document.getElementById('filtered-count');
    countElement.textContent = `${filteredRooms.length} / ${roomsData.length}`;
    
    // Generate room cards with filtered data
    generateRoomCards(filteredRooms);
}

function generateRoomCards(rooms) {
    const roomsContainer = document.getElementById('rooms-container');
    roomsContainer.innerHTML = '';
    
    if (rooms.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'Không tìm thấy phòng nào phù hợp với bộ lọc.';
        roomsContainer.appendChild(emptyMessage);
        return;
    }
    
    rooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'room-card';
        
        // Status class
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
        
        // Get room type name
        const roomTypeName = roomTypes.find(type => type.code === room.room_type)?.name || room.room_type;
        
        roomCard.innerHTML = `
            <div class="room-image">
                <img src="${room.image_url || 'img/room-placeholder.jpg'}" alt="${room.room_name}">
                <div class="room-status ${statusClass}">${statusText}</div>
            </div>
            <div class="room-info">
                <h3>${room.room_name}</h3>
                <p><i class="fas fa-map-marker-alt"></i> ${room.location}</p>
                <p><i class="fas fa-users"></i> ${room.capacity} người</p>
                <p><i class="fas fa-building"></i> ${roomTypeName}</p>
                <div class="room-actions">
                    <button class="btn btn-outline view-btn" data-id="${room.id}">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                    <button class="btn btn-outline edit-btn" data-id="${room.id}">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="btn btn-danger delete-btn" data-id="${room.id}">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        const viewBtn = roomCard.querySelector('.view-btn');
        const editBtn = roomCard.querySelector('.edit-btn');
        const deleteBtn = roomCard.querySelector('.delete-btn');
        
        viewBtn.addEventListener('click', () => {
            window.location.href = `admin-room-details.html?id=${room.id}`;
        });
        
        editBtn.addEventListener('click', () => openEditRoomModal(room));
        
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Bạn có chắc chắn muốn xóa phòng ${room.room_name}?`)) {
                deleteRoom(room.id);
            }
        });
        
        roomsContainer.appendChild(roomCard);
    });
}

function openEditRoomModal(room) {
    // Populate form with room data
    document.getElementById('edit-room-id').value = room.id;
    document.getElementById('edit-room-name').value = room.room_name;
    
    // Populate room type select
    populateRoomTypeSelect('edit-room-type');
    document.getElementById('edit-room-type').value = room.room_type;
    
    document.getElementById('edit-room-capacity').value = room.capacity;
    document.getElementById('edit-room-location').value = room.location;
    document.getElementById('edit-room-status').value = room.status;
    
    // Handle facilities
    let facilitiesStr = '';
    if (room.facilities) {
        if (typeof room.facilities === 'string') {
            facilitiesStr = room.facilities;
        } else if (Array.isArray(room.facilities)) {
            facilitiesStr = room.facilities.join(', ');
        }
    }
    document.getElementById('edit-room-facilities').value = facilitiesStr;
    
    // Set description if available - ensure it works with null, undefined, or empty string
    const description = room.description;
    document.getElementById('edit-room-description').value = description !== null && description !== undefined ? description : '';
    
    // Show modal
    document.getElementById('edit-room-modal').style.display = 'flex';
}

async function addRoom() {
    const roomData = {
        room_name: document.getElementById('add-room-name').value,
        room_type: document.getElementById('add-room-type').value,
        capacity: parseInt(document.getElementById('add-room-capacity').value) || 0,
        location: document.getElementById('add-room-location').value,
        status: document.getElementById('add-room-status').value,
        facilities: document.getElementById('add-room-facilities').value,
        description: document.getElementById('add-room-description').value
    };
    
    // Validate form data
    if (!roomData.room_name || !roomData.room_type || !roomData.location) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc: Tên phòng, loại phòng và vị trí!');
        return;
    }
    
    try {
        const response = await fetch(ENDPOINTS.ROOMS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(roomData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to add room');
        }
        
        // Refresh rooms data
        await loadRoomsData();
        applyFilters();
        
        // Close modal
        document.getElementById('add-room-modal').style.display = 'none';
        
        alert('Phòng đã được thêm thành công!');
    } catch (error) {
        console.error('Error adding room:', error);
        alert(`Lỗi khi thêm phòng: ${error.message}`);
    }
}

async function updateRoom() {
    const roomId = document.getElementById('edit-room-id').value;
    
    const roomData = {
        room_name: document.getElementById('edit-room-name').value,
        room_type: document.getElementById('edit-room-type').value,
        capacity: parseInt(document.getElementById('edit-room-capacity').value) || 0,
        location: document.getElementById('edit-room-location').value,
        status: document.getElementById('edit-room-status').value,
        facilities: document.getElementById('edit-room-facilities').value,
        description: document.getElementById('edit-room-description').value
    };
    
    // Validate form data
    if (!roomData.room_name || !roomData.room_type || !roomData.location) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc: Tên phòng, loại phòng và vị trí!');
        return;
    }
    
    try {
        const response = await fetch(`${ENDPOINTS.ROOMS}/${roomId}`, {
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
        
        // Refresh rooms data
        await loadRoomsData();
        applyFilters();
        
        // Close modal
        document.getElementById('edit-room-modal').style.display = 'none';
        
        alert('Phòng đã được cập nhật thành công!');
    } catch (error) {
        console.error('Error updating room:', error);
        alert(`Lỗi khi cập nhật phòng: ${error.message}`);
    }
}

async function deleteRoom(roomId) {
    try {
        const response = await fetch(`${ENDPOINTS.ROOMS}/${roomId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete room');
        }
        
        // Refresh rooms data
        await loadRoomsData();
        applyFilters();
        
        alert('Phòng đã được xóa thành công!');
    } catch (error) {
        console.error('Error deleting room:', error);
        alert(`Lỗi khi xóa phòng: ${error.message}`);
    }
}

function exportRoomsToCSV() {
    // Get filtered rooms
    let filteredRooms = [...roomsData];
    
    // Apply current filters
    if (currentFilters.status !== 'all') {
        filteredRooms = filteredRooms.filter(room => room.status === currentFilters.status);
    }
    
    if (currentFilters.type !== 'all') {
        filteredRooms = filteredRooms.filter(room => room.room_type === currentFilters.type);
    }
    
    if (currentFilters.search) {
        filteredRooms = filteredRooms.filter(room => 
            room.room_name.toLowerCase().includes(currentFilters.search) ||
            room.location.toLowerCase().includes(currentFilters.search)
        );
    }
    
    if (filteredRooms.length === 0) {
        alert('Không có dữ liệu phòng để xuất!');
        return;
    }
    
    // Generate CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Headers
    csvContent += "ID,Tên phòng,Loại phòng,Sức chứa,Vị trí,Trạng thái,Cơ sở vật chất\n";
    
    // Data rows
    filteredRooms.forEach(room => {
        let statusText = '';
        
        switch(room.status) {
            case 'available': statusText = 'Còn trống'; break;
            case 'occupied': 
            case 'in_use': statusText = 'Đang sử dụng'; break;
            case 'maintenance': statusText = 'Bảo trì'; break;
            default: statusText = room.status;
        }
        
        const roomTypeName = roomTypes.find(type => type.code === room.room_type)?.name || room.room_type;
        
        let facilitiesStr = '';
        if (room.facilities) {
            if (typeof room.facilities === 'string') {
                facilitiesStr = room.facilities;
            } else if (Array.isArray(room.facilities)) {
                facilitiesStr = room.facilities.join(', ');
            }
        }
        
        csvContent += `${room.id},"${room.room_name}","${roomTypeName}",${room.capacity},"${room.location}","${statusText}","${facilitiesStr}"\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `danh-sach-phong-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
    
    alert('Đã xuất báo cáo danh sách phòng!');
} 