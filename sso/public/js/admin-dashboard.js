const API_BASE_URL = '/api';
const ENDPOINTS = {
    USERS: `${API_BASE_URL}/users`,
    USER_STATS: `${API_BASE_URL}/users/stats`,
    DEPARTMENTS: `${API_BASE_URL}/departments`
};

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

document.addEventListener('DOMContentLoaded', function() {
    setupNavigation();
    
    initializeDashboard();
    
    setupModalListeners();
    
    setupFilterListeners();
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

async function initializeDashboard() {
    try {
        await Promise.all([
            loadDepartments(),
            loadUsersData(),
            loadUserStats()
        ]);
        
        populateDepartmentFilter();
        
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
    
    document.getElementById('add-user-btn').addEventListener('click', function() {
        document.getElementById('add-user-form').reset();
        
        populateDepartmentSelect('add-user-department');
        
        addUserModal.style.display = 'flex';
    });
    
    document.querySelectorAll('.modal-close, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            addUserModal.style.display = 'none';
            editUserModal.style.display = 'none';
            userDetailsModal.style.display = 'none';
        });
    });
    
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
    
    document.getElementById('add-user-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        await addUser();
    });
    
    document.getElementById('edit-user-form').addEventListener('submit', async function(event) {
        event.preventDefault();
        await updateUser();
    });
}

function setupFilterListeners() {
    document.getElementById('role-filter').addEventListener('change', function() {
        currentFilters.role = this.value;
        currentPage = 1;
        applyFilters();
    });
    
    document.getElementById('department-filter').addEventListener('change', function() {
        currentFilters.department = this.value;
        currentPage = 1;
        applyFilters();
    });
    
    document.getElementById('status-filter').addEventListener('change', function() {
        currentFilters.status = this.value;
        currentPage = 1;
        applyFilters();
    });
    
    let searchTimeout;
    document.getElementById('search-input').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = this.value.toLowerCase();
            currentPage = 1;
            applyFilters();
        }, 300);
    });
    
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
        
        document.getElementById('total-users').textContent = stats.total || 0;
        document.getElementById('active-users').textContent = stats.active || 0;
        document.getElementById('admin-users').textContent = stats.admin || 0;
        document.getElementById('departments-count').textContent = stats.departments || 0;
        
        return stats;
    } catch (error) {
        console.error('Error loading user stats:', error);
        
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
    
    while (departmentFilter.options.length > 1) {
        departmentFilter.remove(1);
    }
    
    departmentsData.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        departmentFilter.appendChild(option);
    });
}

function populateDepartmentSelect(elementId) {
    const departmentSelect = document.getElementById(elementId);
    
    departmentSelect.innerHTML = '';
    
    departmentsData.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        departmentSelect.appendChild(option);
    });
}

function applyFilters() {
    let filteredUsers = [...usersData];
    
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
    
    const countElement = document.getElementById('filtered-count');
    countElement.textContent = `${filteredUsers.length} / ${usersData.length}`;
    
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
    
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, filteredData.length);
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    paginatedData.forEach((user, index) => {
        const row = document.createElement('tr');
        
        const serialCell = document.createElement('td');
        serialCell.textContent = startIndex + index + 1;
        row.appendChild(serialCell);
        
        const usernameCell = document.createElement('td');
        usernameCell.textContent = user.username;
        row.appendChild(usernameCell);
        
        const nameCell = document.createElement('td');
        nameCell.textContent = user.fullname;
        row.appendChild(nameCell);
        
        const deptCell = document.createElement('td');
        deptCell.textContent = user.department_name;
        row.appendChild(deptCell);
        
        const roleCell = document.createElement('td');
        const roleSpan = document.createElement('span');
        roleSpan.className = `role-badge ${user.role === 'admin' ? 'role-admin' : 'role-user'}`;
        roleSpan.textContent = user.role === 'admin' ? 'Admin' : 'Người dùng';
        roleCell.appendChild(roleSpan);
        row.appendChild(roleCell);
        
        const statusCell = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.className = `status-badge ${user.status === 'active' ? 'status-active' : 'status-inactive'}`;
        statusSpan.textContent = user.status === 'active' ? 'Hoạt động' : 'Không hoạt động';
        statusCell.appendChild(statusSpan);
        row.appendChild(statusCell);
        
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        const viewButton = document.createElement('button');
        viewButton.className = 'action-btn view-btn';
        viewButton.innerHTML = '<i class="fas fa-eye"></i>';
        viewButton.title = 'Xem chi tiết';
        viewButton.addEventListener('click', () => showUserDetails(user));
        actionsCell.appendChild(viewButton);
        
        const editButton = document.createElement('button');
        editButton.className = 'action-btn edit-btn';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = 'Chỉnh sửa';
        editButton.addEventListener('click', () => openEditUserModal(user));
        actionsCell.appendChild(editButton);
        
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
    
    document.getElementById('detail-username').textContent = user.username || 'N/A';
    document.getElementById('detail-fullname').textContent = user.fullname || 'N/A';
    document.getElementById('detail-email').textContent = user.email || 'N/A';
    document.getElementById('detail-phone').textContent = user.phone || 'N/A';
    document.getElementById('detail-department').textContent = user.department_name || 'N/A';
    document.getElementById('detail-role').textContent = user.role === 'admin' ? 'Quản trị viên' : 'Người dùng';
    document.getElementById('detail-status').textContent = user.status === 'active' ? 'Hoạt động' : 'Không hoạt động';
    
    const createdDate = user.created_at ? new Date(user.created_at).toLocaleString('vi-VN') : 'N/A';
    const lastLoginDate = user.last_login ? new Date(user.last_login).toLocaleString('vi-VN') : 'N/A';
    
    document.getElementById('detail-created').textContent = createdDate;
    document.getElementById('detail-last-login').textContent = lastLoginDate;
    
    document.getElementById('detail-edit-btn').setAttribute('data-id', user.id);
    document.getElementById('detail-edit-btn').addEventListener('click', () => {
        modal.style.display = 'none';
        openEditUserModal(user);
    });
    
    modal.style.display = 'flex';
}

function openEditUserModal(user) {
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-fullname').value = user.fullname;
    document.getElementById('edit-phone').value = user.phone || '';
    
    populateDepartmentSelect('edit-user-department');
    document.getElementById('edit-user-department').value = user.department_id;
    
    document.getElementById('edit-role').value = user.role;
    document.getElementById('edit-status').value = user.status;
    
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
        
        await Promise.all([loadUsersData(), loadUserStats()]);
        applyFilters();
        
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
    
    const password = document.getElementById('edit-password').value;
    if (password) {
        userData.password = password;
    }
    
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
        
        await Promise.all([loadUsersData(), loadUserStats()]);
        applyFilters();
        
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
        
        await Promise.all([loadUsersData(), loadUserStats()]);
        applyFilters();
        
        alert('Người dùng đã được xóa thành công!');
    } catch (error) {
        console.error('Error deleting user:', error);
        alert(`Lỗi khi xóa người dùng: ${error.message}`);
    }
}

function exportUsersToCSV() {
    let filteredUsers = [...usersData];
    
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
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    csvContent += "ID,Tên đăng nhập,Họ và tên,Email,Số điện thoại,Khoa/Phòng ban,Vai trò,Trạng thái,Ngày tạo,Đăng nhập cuối\n";
    
    filteredUsers.forEach(user => {
        const role = user.role === 'admin' ? 'Quản trị viên' : 'Người dùng';
        const status = user.status === 'active' ? 'Hoạt động' : 'Không hoạt động';
        const createdDate = user.created_at ? new Date(user.created_at).toLocaleString('vi-VN') : '';
        const lastLoginDate = user.last_login ? new Date(user.last_login).toLocaleString('vi-VN') : '';
        
        csvContent += `${user.id},"${user.username}","${user.fullname}","${user.email}","${user.phone || ''}","${user.department_name}","${role}","${status}","${createdDate}","${lastLoginDate}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `danh-sach-nguoi-dung-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    
    alert('Đã xuất báo cáo danh sách người dùng!');
} 