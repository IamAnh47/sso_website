const API_URL = '/api';
const USER_KEY = 'sso_user';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

document.addEventListener('DOMContentLoaded', () => {
  if ((window.location.pathname === '/' || window.location.pathname === '/index.html') && 
      !window.location.search.includes('logged_out=true')) {
    verifyAuth()
      .then(userData => {
        if (userData) {
          sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
          redirectToDashboard();
        }
      })
      .catch(err => {
        console.error('Error verifying authentication:', err);
        clearAuthData();
      });
  }

  if (tabButtons && tabButtons.length > 0) {
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        switchTab(tabId);
        clearErrors();
      });
    });
  }
});

async function verifyAuth() {
  try {
    console.log('Verifying authentication with server...');
    const response = await fetch(`${API_URL}/auth/verify`, {
      credentials: 'include',
    });

    if (!response.ok) {
      console.log('Authentication verification failed with status:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('Authentication verification successful');
    return data.user;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('remember-me').checked;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));

    redirectToDashboard();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const email = document.getElementById('register-email').value;
  const fullName = document.getElementById('register-fullname').value;
  const studentId = document.getElementById('register-student-id').value;
  const phone = document.getElementById('register-phone').value;
  const departmentId = document.getElementById('register-department').value;

  if (password !== confirmPassword) {
    showRegisterError('Mật khẩu không khớp!');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password,
        email,
        full_name: fullName,
        student_id: studentId,
        phone,
        department_id: departmentId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to register');
    }

    registerForm.reset();
    showRegisterSuccess('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
    switchTab('login');
  } catch (error) {
    console.error('Register error:', error);
    showRegisterError(error.message || 'Đã xảy ra lỗi khi đăng ký.');
  }
});

async function logout() {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    
    await response.json();
    
    clearAuthData();
    window.location.href = '/index.html?logged_out=true';
  } catch (error) {
    console.error('Logout error:', error);
    clearAuthData();
    window.location.href = '/index.html?logged_out=true';
  }
}

function clearAuthData() {
  sessionStorage.removeItem(USER_KEY);
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.style.display = 'block';
}

function showRegisterError(message) {
  registerError.textContent = message;
  registerError.style.display = 'block';
}

function showRegisterSuccess(message) {
  loginError.textContent = message;
  loginError.style.color = 'var(--success-color)';
  loginError.style.display = 'block';
}

function clearErrors() {
  loginError.textContent = '';
  registerError.textContent = '';
  loginError.style.color = 'var(--error-color)';
}

function switchTab(tabId) {
  tabButtons.forEach(button => {
    if (button.getAttribute('data-tab') === tabId) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });

  tabContents.forEach(content => {
    if (content.id === tabId) {
      content.classList.remove('hidden');
    } else {
      content.classList.add('hidden');
    }
  });
}

function redirectToDashboard() {
  const currentPath = window.location.pathname;
  
  const userStr = sessionStorage.getItem(USER_KEY);
  if (!userStr) {
    if (currentPath !== '/' && currentPath !== '/index.html') {
      window.location.href = '/index.html';
    }
    return;
  }
  
  try {
    const user = JSON.parse(userStr);
    
    if (user.role === 'admin' || user.role === 'staff') {
      if (currentPath !== '/admin-overview.html') {
        window.location.href = '/admin-overview.html';
      }
    } else if (user.role === 'it_staff') {
      if (currentPath !== '/it-staff-dashboard.html') {
        window.location.href = '/it-staff-dashboard.html';
      }
    } else if (user.role === 'student') {
      if (currentPath !== '/student-dashboard.html') {
        window.location.href = '/student-dashboard.html';
      }
    } else {
      window.location.href = '/index.html';
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
    window.location.href = '/index.html';
  }
}

window.logout = logout; 