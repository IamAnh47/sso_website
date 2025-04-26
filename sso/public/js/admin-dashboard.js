/**
 * Admin Dashboard JavaScript
 * Handles user management functionality for admin users
 */

// API endpoints
const API_BASE_URL = '/api';
const ENDPOINTS = {
    USERS: `${API_BASE_URL}/users`,
    USER_STATS: `${API_BASE_URL}/users/stats`,
    DEPARTMENTS: `${API_BASE_URL}/departments`
};

// State management
let usersData = [];
let departmentsData = [];
let currentFilters = {
    role: 'all',
    department: 'all',
    status: 'all',
    search: ''
};
let currentPage = 1;
const PAGE_SIZE = 10;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Setup navigation
    setupNavigation();
    
    // Initialize users table
    initializeDashboard();
    
    // Add event listeners for modals
    setupModalListeners();
    
    // Add event listeners for filters
    setupFilterListeners();
});

// Setup navigation between pages
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

async function initializeDashboard() {
    try {
        // Load departments and users data
        await Promise.all([
            loadDepartments(),
            loadUsersData(),
            loadUserStats()
        ]);
        
        // Populate department filter
        populateDepartmentFilter();
        
        // Render users table
        renderUsersTable();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Không thể tải dữ liệu người dùng. Vui lòng làm mới trang.');
    }
}

function setupModalListeners() {
    const addUserModal = document.getElementById('add-user-modal');
    const editUserModal = document.getElementById('edit-user-modal');
    const userDetailsModal = document.getElementById('user-details-modal');
    
    // Add user button
    document.getElementById('add-user-btn').addEventListener('click', function() {
        // Reset form
        document.getElementById('add-user-form').reset();
        
        // Populate department select
        populateDepartmentSelect('add-user-department');
        
        // Show modal
        addUserModal.style.display = 'flex';
    });
    
    // Close modals
    document.querySelectorAll('.modal-close, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            addUserModal.style.display = 'none';
            editUserModal.style.display = 'none';
            userDetailsModal.style.display = 'none';
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === addUserModal) {
            addUserModal.style.display = 'none';
        }
        if (event.target === editUserModal) {
            editUserModal.style.display = 'none';
        }
        if (event.target === userDetailsModal) {
            userDetailsModal.style.display = 'none';
        }
    });
    
    // Submit add user form
    document.getElementById('add-user-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        await addUser();
    });
    
    // Submit edit user form
    document.getElementById('edit-user-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        await updateUser();
    });
}

function setupFilterListeners() {
    // Role filter
    document.getElementById('role-filter').addEventListener('change', function() {
        currentFilters.role = this.value;
        currentPage = 1;
        applyFilters();
    });
    
    // Department filter
    document.getElementById('department-filter').addEventListener('change', function() {
        currentFilters.department = this.value;
        currentPage = 1;
        applyFilters();
    });
    
    // Status filter
    document.getElementById('status-filter').addEventListener('change', function() {
        currentFilters.status = this.value;
        currentPage = 1;
        applyFilters();
    });
    
    // Search input
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = this.value.toLowerCase();
            currentPage = 1;
            applyFilters();
        }, 300);
    });
    
    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', function() {
        document.getElementById('role-filter').value = 'all';
        document.getElementById('department-filter').value = 'all';
        document.getElementById('status-filter').value = 'all';
        document.getElementById('search-input').value = '';
        
        currentFilters = {
            role: 'all',
            department: 'all',
            status: 'all',
            search: ''
        };
        
        currentPage = 1;
        applyFilters();
    });
    
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', async function() {
        try {
            await loadUsersData();
            await loadUserStats();
            applyFilters();
            alert('Đã làm mới dữ liệu người dùng!');
        } catch (error) {
            console.error('Error refreshing users data:', error);
            alert('Không thể làm mới dữ liệu người dùng.');
        }
    });
    
    // Export button
    document.getElementById('export-btn').addEventListener('click', exportUsersToCSV);
}

async function loadDepartments() {
    try {
        const response = await fetch(ENDPOINTS.DEPARTMENTS, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch departments');
        }
        
        departmentsData = await response.json();
        return departmentsData;
    } catch (error) {
        console.error('Error loading departments:', error);
        // Fallback data if API fails
        departmentsData = [
            { id: 1, name: 'Khoa Khoa học và Kỹ thuật Máy tính', code: 'CSE' },
            { id: 2, name: 'Khoa Điện - Điện tử', code: 'EEE' },
            { id: 3, name: 'Khoa Quản lý Công nghiệp', code: 'IIM' },
            { id: 4, name: 'Khoa Kỹ thuật Hóa học', code: 'CHET' },
            { id: 5, name: 'Khoa Kỹ thuật Xây dựng', code: 'CEE' }
        ];
        return departmentsData;
    }
}

async function loadUsersData() {
    try {
        const response = await fetch(ENDPOINTS.USERS, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch users data');
        }
        
        usersData = await response.json();
        return usersData;
    } catch (error) {
        console.error('Error loading users data:', error);
        // Fallback data if API fails
        usersData = [
            {
                id: 1,
                username: 'admin',
                email: 'admin@hcmut.edu.vn',
                fullname: 'Admin System',
                role: 'admin',
                department_id: 1,
                department_name: 'Khoa Khoa học và Kỹ thuật Máy tính',
                status: 'active',
                phone: '0987654321',
                created_at: '2023-01-01T00:00:00Z',
                last_login: '2023-05-15T10:30:00Z'
            },
            {
                id: 2,
                username: 'nhminh',
                email: 'nhminh@hcmut.edu.vn',
                fullname: 'Nguyễn Hoàng Minh',
                role: 'user',
                department_id: 1,
                department_name: 'Khoa Khoa học và Kỹ thuật Máy tính',
                status: 'active',
                phone: '0987654322',
                created_at: '2023-01-02T00:00:00Z',
                last_login: '2023-05-14T14:20:00Z'
            },
            {
                id: 3,
                username: 'ttloan',
                email: 'ttloan@hcmut.edu.vn',
                fullname: 'Trần Thị Loan',
                role: 'user',
                department_id: 2,
                department_name: 'Khoa Điện - Điện tử',
                status: 'inactive',
                phone: '0987654323',
                created_at: '2023-01-03T00:00:00Z',
                last_login: '2023-04-20T09:15:00Z'
            }
        ];
        return usersData;
    }
}

async function loadUserStats() {
    try {
        const response = await fetch(ENDPOINTS.USER_STATS, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user stats');
        }
        
        const stats = await response.json();
        
        // Update dashboard stats
        document.getElementById('total-users').textContent = stats.total || 0;
        document.getElementById('active-users').textContent = stats.active || 0;
        document.getElementById('admin-users').textContent = stats.admin || 0;
        document.getElementById('departments-count').textContent = stats.departments || 0;
        
        return stats;
    } catch (error) {
        console.error('Error loading user stats:', error);
        
        // Use counts from fallback data if API fails
        const totalUsers = usersData.length;
        const activeUsers = usersData.filter(user => user.status === 'active').length;
        const adminUsers = usersData.filter(user => user.role === 'admin').length;
        
        document.getElementById('total-users').textContent = totalUsers;
        document.getElementById('active-users').textContent = activeUsers;
        document.getElementById('admin-users').textContent = adminUsers;
        document.getElementById('departments-count').textContent = departmentsData.length;
        
        return {
            total: totalUsers,
            active: activeUsers,
            admin: adminUsers,
            departments: departmentsData.length
        };
    }
}

function populateDepartmentFilter() {
    const departmentFilter = document.getElementById('department-filter');
    
    // Clear existing options except first one
    while (departmentFilter.options.length > 1) {
        departmentFilter.remove(1);
    }
    
    // Add departments from data
    departmentsData.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        departmentFilter.appendChild(option);
    });
}

function populateDepartmentSelect(elementId) {
    const departmentSelect = document.getElementById(elementId);
    
    // Clear existing options
    departmentSelect.innerHTML = '';
    
    // Add departments from data
    departmentsData.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        departmentSelect.appendChild(option);
    });
}

function applyFilters() {
    let filteredUsers = [...usersData];
    
    // Apply role filter
    if (currentFilters.role !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === currentFilters.role);
    }
    
    // Apply department filter
    if (currentFilters.department !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.department_id.toString() === currentFilters.department);
    }
    
    // Apply status filter
    if (currentFilters.status !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.status === currentFilters.status);
    }
    
    // Apply search filter
    if (currentFilters.search) {
        filteredUsers = filteredUsers.filter(user => 
            user.username.toLowerCase().includes(currentFilters.search) ||
            user.email.toLowerCase().includes(currentFilters.search) ||
            user.fullname.toLowerCase().includes(currentFilters.search)
        );
    }
    
    // Update filtered count
    const countElement = document.getElementById('filtered-count');
    countElement.textContent = `${filteredUsers.length} / ${usersData.length}`;
    
    // Render users table with pagination
    renderUsersTable(filteredUsers);
    updatePagination(filteredUsers);
}

function renderUsersTable(filteredData = usersData) {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 7;
        emptyCell.textContent = 'Không tìm thấy người dùng nào phù hợp với bộ lọc.';
        emptyCell.className = 'empty-table';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filteredData.length);
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    paginatedData.forEach((user, index) => {
        const row = document.createElement('tr');
        
        // Serial number
        const serialCell = document.createElement('td');
        serialCell.textContent = startIndex + index + 1;
        row.appendChild(serialCell);
        
        // Username
        const usernameCell = document.createElement('td');
        usernameCell.textContent = user.username;
        row.appendChild(usernameCell);
        
        // Full Name
        const nameCell = document.createElement('td');
        nameCell.textContent = user.fullname;
        row.appendChild(nameCell);
        
        // Department
        const deptCell = document.createElement('td');
        deptCell.textContent = user.department_name;
        row.appendChild(deptCell);
        
        // Role
        const roleCell = document.createElement('td');
        const roleSpan = document.createElement('span');
        roleSpan.className = `role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`;
        roleSpan.textContent = user.role === 'admin' ? 'Admin' : 'Người dùng';
        roleCell.appendChild(roleSpan);
        row.appendChild(roleCell);
        
        // Status
        const statusCell = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = `status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}`;
        statusSpan.textContent = user.status === 'active' ? 'Hoạt động' : 'Không hoạt động';
        statusCell.appendChild(statusSpan);
        row.appendChild(statusCell);
        
        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        // View button
        const viewButton = document.createElement('button');
        viewButton.className = 'action-btn view-btn';
        viewButton.innerHTML = '<i class="fas fa-eye"></i>';
        viewButton.title = 'Xem chi tiết';
        viewButton.addEventListener('click', () => showUserDetails(user));
        actionsCell.appendChild(viewButton);
        
        // Edit button
        const editButton = document.createElement('button');
        editButton.className = 'action-btn edit-btn';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = 'Chỉnh sửa';
        editButton.addEventListener('click', () => openEditUserModal(user));
        actionsCell.appendChild(editButton);
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-btn delete-btn';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = 'Xóa';
        deleteButton.addEventListener('click', () => {
            if (confirm(`Bạn có chắc chắn muốn xóa người dùng ${user.username}?`)) {
                deleteUser(user.id);
            }
        });
        actionsCell.appendChild(deleteButton);
        
        row.appendChild(actionsCell);
        tableBody.appendChild(row);
    });
}

function updatePagination(filteredData = usersData) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';
    
    if (filteredData.length <= PAGE_SIZE) {
        return;
    }
    
    const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-btn';
    prevButton.innerHTML = '<i class="fas fa-angle-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderUsersTable(filteredData);
            updatePagination(filteredData);
        }
    });
    paginationContainer.appendChild(prevButton);
    
    // Page buttons
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            renderUsersTable(filteredData);
            updatePagination(filteredData);
        });
        paginationContainer.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-btn';
    nextButton.innerHTML = '<i class="fas fa-angle-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderUsersTable(filteredData);
            updatePagination(filteredData);
        }
    });
    paginationContainer.appendChild(nextButton);
}

function showUserDetails(user) {
    const modal = document.getElementById('user-details-modal');
    
    // Fill in user details
    document.getElementById('detail-username').textContent = user.username || 'N/A';
    document.getElementById('detail-fullname').textContent = user.fullname || 'N/A';
    document.getElementById('detail-email').textContent = user.email || 'N/A';
    document.getElementById('detail-phone').textContent = user.phone || 'N/A';
    document.getElementById('detail-department').textContent = user.department_name || 'N/A';
    document.getElementById('detail-role').textContent = user.role === 'admin' ? 'Quản trị viên' : 'Người dùng';
    document.getElementById('detail-status').textContent = user.status === 'active' ? 'Hoạt động' : 'Không hoạt động';
    
    // Format dates
    const createdDate = user.created_at ? new Date(user.created_at).toLocaleString('vi-VN') : 'N/A';
    const lastLoginDate = user.last_login ? new Date(user.last_login).toLocaleString('vi-VN') : 'N/A';
    
    document.getElementById('detail-created').textContent = createdDate;
    document.getElementById('detail-last-login').textContent = lastLoginDate;
    
    // Set action buttons data
    document.getElementById('detail-edit-btn').setAttribute('data-id', user.id);
    document.getElementById('detail-edit-btn').addEventListener('click', () => {
        modal.style.display = 'none';
        openEditUserModal(user);
    });
    
    // Show modal
    modal.style.display = 'flex';
}

function openEditUserModal(user) {
    // Populate form with user data
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-fullname').value = user.fullname;
    document.getElementById('edit-phone').value = user.phone || '';
    
    // Populate department select
    populateDepartmentSelect('edit-user-department');
    document.getElementById('edit-user-department').value = user.department_id;
    
    // Set role and status
    document.getElementById('edit-role').value = user.role;
    document.getElementById('edit-status').value = user.status;
    
    // Show modal
    document.getElementById('edit-user-modal').style.display = 'flex';
}

async function addUser() {
    const userData = {
        username: document.getElementById('add-username').value,
        email: document.getElementById('add-email').value,
        password: document.getElementById('add-password').value,
        fullname: document.getElementById('add-fullname').value,
        phone: document.getElementById('add-phone').value,
        department_id: document.getElementById('add-user-department').value,
        role: document.getElementById('add-role').value,
        status: document.getElementById('add-status').value
    };
    
    // Validate form data
    if (!userData.username || !userData.email || !userData.password || !userData.fullname) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc: Tên đăng nhập, email, mật khẩu và họ tên!');
        return;
    }
    
    try {
        const response = await fetch(ENDPOINTS.USERS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to add user');
        }
        
        // Refresh users data
        await Promise.all([loadUsersData(), loadUserStats()]);
        applyFilters();
        
        // Close modal
        document.getElementById('add-user-modal').style.display = 'none';
        
        alert('Người dùng đã được thêm thành công!');
    } catch (error) {
        console.error('Error adding user:', error);
        alert(`Lỗi khi thêm người dùng: ${error.message}`);
    }
}

async function updateUser() {
    const userId = document.getElementById('edit-user-id').value;
    
    const userData = {
        username: document.getElementById('edit-username').value,
        email: document.getElementById('edit-email').value,
        fullname: document.getElementById('edit-fullname').value,
        phone: document.getElementById('edit-phone').value,
        department_id: document.getElementById('edit-user-department').value,
        role: document.getElementById('edit-role').value,
        status: document.getElementById('edit-status').value
    };
    
    // Add password only if it's provided (not empty)
    const password = document.getElementById('edit-password').value;
    if (password) {
        userData.password = password;
    }
    
    // Validate form data
    if (!userData.username || !userData.email || !userData.fullname) {
        alert('Vui lòng điền đầy đủ thông tin bắt buộc: Tên đăng nhập, email và họ tên!');
        return;
    }
    
    try {
        const response = await fetch(`${ENDPOINTS.USERS}/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to update user');
        }
        
        // Refresh users data
        await Promise.all([loadUsersData(), loadUserStats()]);
        applyFilters();
        
        // Close modal
        document.getElementById('edit-user-modal').style.display = 'none';
        
        alert('Người dùng đã được cập nhật thành công!');
    } catch (error) {
        console.error('Error updating user:', error);
        alert(`Lỗi khi cập nhật người dùng: ${error.message}`);
    }
}

async function deleteUser(userId) {
    try {
        const response = await fetch(`${ENDPOINTS.USERS}/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete user');
        }
        
        // Refresh users data
        await Promise.all([loadUsersData(), loadUserStats()]);
        applyFilters();
        
        alert('Người dùng đã được xóa thành công!');
    } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Lỗi khi xóa người dùng: ${error.message}`);
    }
}

function exportUsersToCSV() {
    // Get filtered users
    let filteredUsers = [...usersData];
    
    // Apply current filters
    if (currentFilters.role !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === currentFilters.role);
    }
    
    if (currentFilters.department !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.department_id.toString() === currentFilters.department);
    }
    
    if (currentFilters.status !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.status === currentFilters.status);
    }
    
    if (currentFilters.search) {
        filteredUsers = filteredUsers.filter(user => 
            user.username.toLowerCase().includes(currentFilters.search) ||
            user.email.toLowerCase().includes(currentFilters.search) ||
            user.fullname.toLowerCase().includes(currentFilters.search)
        );
    }
    
    if (filteredUsers.length === 0) {
        alert('Không có dữ liệu người dùng để xuất!');
        return;
    }
    
    // Generate CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Headers
    csvContent += "ID,Tên đăng nhập,Họ và tên,Email,Số điện thoại,Khoa/Phòng ban,Vai trò,Trạng thái,Ngày tạo,Đăng nhập cuối\n";
    
    // Data rows
    filteredUsers.forEach(user => {
        const role = user.role === 'admin' ? 'Quản trị viên' : 'Người dùng';
        const status = user.status === 'active' ? 'Hoạt động' : 'Không hoạt động';
        const createdDate = user.created_at ? new Date(user.created_at).toLocaleString('vi-VN') : '';
        const lastLoginDate = user.last_login ? new Date(user.last_login).toLocaleString('vi-VN') : '';
        
        csvContent += `${user.id},"${user.username}","${user.fullname}","${user.email}","${user.phone || ''}","${user.department_name}","${role}","${status}","${createdDate}","${lastLoginDate}"\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `danh-sach-nguoi-dung-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    document.body.removeChild(link);
    
    alert('Đã xuất báo cáo danh sách người dùng!');
} 