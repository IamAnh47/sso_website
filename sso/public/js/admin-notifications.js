// Admin Notifications JavaScript
// This file is intentionally kept minimal to avoid errors with dependencies

// Constants
const NOTIFICATION_API_ENDPOINTS = {
    NOTIFICATIONS: '/api/notifications',
    NOTIFICATIONS_UNREAD: '/api/notifications/unread/count',
    NOTIFICATIONS_HISTORY: '/api/notifications/history'
};

// This function will be called when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin notifications module loaded');
    
    // Fix auth.js errors by checking if elements exist before adding event listeners
    fixAuthJsErrors();
});

// Fix auth.js errors by adding dummy elements or checks
function fixAuthJsErrors() {
    // This function creates any missing elements that auth.js might be looking for
    // and adds no-op event listeners to prevent errors
    const elementsToCheck = ['login-form', 'register-form', 'logout-link', 'profile-link'];
    
    elementsToCheck.forEach(id => {
        if (!document.getElementById(id)) {
            const dummyElement = document.createElement('div');
            dummyElement.id = id;
            dummyElement.style.display = 'none';
            document.body.appendChild(dummyElement);
            
            // Add empty event listener
            dummyElement.addEventListener('submit', e => {
                e.preventDefault();
            });
            dummyElement.addEventListener('click', e => {
                e.preventDefault();
            });
        }
    });
    
    // Fix for auth.js variables accessed directly
    // Create dummy global variables that auth.js is trying to use
    if (typeof window.loginForm === 'undefined' || window.loginForm === null) {
        window.loginForm = document.createElement('form');
        window.loginForm.id = 'login-form';
        window.loginForm.style.display = 'none';
        document.body.appendChild(window.loginForm);
        window.loginForm.addEventListener('submit', e => e.preventDefault());
    }
    
    if (typeof window.registerForm === 'undefined' || window.registerForm === null) {
        window.registerForm = document.createElement('form');
        window.registerForm.id = 'register-form';
        window.registerForm.style.display = 'none';
        document.body.appendChild(window.registerForm);
        window.registerForm.addEventListener('submit', e => e.preventDefault());
    }
    
    if (typeof window.loginError === 'undefined' || window.loginError === null) {
        window.loginError = document.createElement('div');
        window.loginError.id = 'login-error';
        window.loginError.style.display = 'none';
        document.body.appendChild(window.loginError);
    }
    
    if (typeof window.registerError === 'undefined' || window.registerError === null) {
        window.registerError = document.createElement('div');
        window.registerError.id = 'register-error';
        window.registerError.style.display = 'none';
        document.body.appendChild(window.registerError);
    }
    
    if (typeof window.tabButtons === 'undefined' || window.tabButtons === null) {
        window.tabButtons = document.querySelectorAll('.tab-btn');
    }
    
    if (typeof window.tabContents === 'undefined' || window.tabContents === null) {
        window.tabContents = document.querySelectorAll('.tab-content');
    }
}

// Helper functions that may be used from the HTML
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    } catch (error) {
        return dateString;
    }
}

function getNotificationType(notification) {
    if (!notification || !notification.type) return '';
    
    switch(notification.type.toLowerCase()) {
        case 'success': return 'success';
        case 'warning': return 'warning';
        case 'error': return 'danger';
        case 'info': 
        default: return 'info';
    }
} 