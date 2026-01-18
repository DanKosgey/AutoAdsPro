// API Configuration
const API_BASE = window.location.origin;
const POLL_INTERVAL = 3000; // Poll every 3 seconds

// State
let currentPage = 'dashboard';
let connectionStatus = 'DISCONNECTED';
let contacts = [];
let chats = [];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeRefresh();
    initializeSettings();
    startStatusPolling();
    checkNotificationPermission();
});

// Navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });
}

function switchPage(page) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`${page}-page`).classList.add('active');

    currentPage = page;

    // Load page data
    loadPageData(page);
}

function loadPageData(page) {
    switch (page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'chats':
            loadChats();
            break;
        case 'contacts':
            loadContacts();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Status Polling
function startStatusPolling() {
    checkStatus();
    setInterval(checkStatus, POLL_INTERVAL);
}

async function checkStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        const data = await response.json();

        updateConnectionStatus(data.status, data.qr);

        // If status changed, reload current page
        if (data.status !== connectionStatus) {
            connectionStatus = data.status;
            loadPageData(currentPage);
        }
    } catch (error) {
        console.error('Status check failed:', error);
        updateConnectionStatus('DISCONNECTED');
    }
}

function updateConnectionStatus(status, qr = null) {
    const statusEl = document.getElementById('connection-status');
    const indicator = statusEl.querySelector('.status-indicator');
    const label = statusEl.querySelector('.status-label');
    const detail = statusEl.querySelector('.status-detail');

    indicator.className = 'status-indicator';

    switch (status) {
        case 'CONNECTED':
            indicator.classList.add('connected');
            label.textContent = 'Connected';
            detail.textContent = 'WhatsApp is online';
            hideQRSection();
            break;
        case 'WAITING_FOR_QR':
            label.textContent = 'Waiting for QR';
            detail.textContent = 'Scan to connect';
            showQRCode(qr);
            break;
        default:
            indicator.classList.add('disconnected');
            label.textContent = 'Disconnected';
            detail.textContent = 'Not connected';
            hideQRSection();
    }
}

// QR Code Display
function showQRCode(qrData) {
    const qrSection = document.getElementById('qr-section');
    const qrContainer = document.getElementById('qr-code');
    const statsGrid = document.getElementById('stats-grid');

    qrSection.style.display = 'block';
    statsGrid.style.display = 'none';

    if (qrData) {
        // Use QRCode library or display as ASCII
        qrContainer.innerHTML = `
            <div style="width: 300px; height: 300px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 16px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}" 
                     alt="QR Code" 
                     style="width: 280px; height: 280px;" />
            </div>
        `;
    }
}

function hideQRSection() {
    const qrSection = document.getElementById('qr-section');
    const statsGrid = document.getElementById('stats-grid');

    qrSection.style.display = 'none';
    statsGrid.style.display = 'grid';
}

// Dashboard
async function loadDashboard() {
    try {
        // Fetch real stats from API
        const response = await fetch(`${API_BASE}/api/stats`);
        const stats = await response.json();

        updateDashboardStats({
            totalMessages: stats.totalMessages || 0,
            activeContacts: stats.totalContacts || 0,
            responseRate: stats.responseRate || 98,
            avgResponseTime: stats.avgResponseTime || '12s'
        });

        loadRecentActivity();
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        // Fallback to zeros on error
        updateDashboardStats({
            totalMessages: 0,
            activeContacts: 0,
            responseRate: 98,
            avgResponseTime: '12s'
        });
    }
}

function updateDashboardStats(stats) {
    document.getElementById('total-messages').textContent = stats.totalMessages;
    document.getElementById('active-contacts').textContent = stats.activeContacts;
}

function loadRecentActivity() {
    const activityList = document.getElementById('activity-list');

    // Mock data - replace with real API call
    const activities = [];

    if (activities.length === 0) {
        activityList.innerHTML = `
            <div class="activity-empty">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="32" fill="#f3f4f6"/>
                    <path d="M32 20v24M20 32h24" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p>No recent activity</p>
            </div>
        `;
    }
}

// Chats
async function loadChats() {
    const chatList = document.getElementById('chat-list');

    try {
        const response = await fetch(`${API_BASE}/api/chats`);
        chats = await response.json();

        if (chats.length === 0) {
            chatList.innerHTML = `
                <div class="chat-empty">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="32" fill="#f3f4f6"/>
                        <path d="M20 28h24M20 36h16" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p>No conversations yet</p>
                </div>
            `;
        } else {
            renderChatList(chats);
        }

        updateChatCount(chats.length);
    } catch (error) {
        console.error('Failed to load chats:', error);
        chatList.innerHTML = `
            <div class="chat-empty">
                <p style="color: var(--danger);">Failed to load chats</p>
            </div>
        `;
    }
}

function renderChatList(chats) {
    const chatList = document.getElementById('chat-list');
    chatList.innerHTML = chats.map(chat => `
        <div class="chat-item" data-jid="${chat.phone}" onclick="selectChat('${chat.phone}')">
            <div class="chat-avatar">${(chat.name || 'Unknown').charAt(0).toUpperCase()}</div>
            <div class="chat-info">
                <div class="chat-header">
                    <span class="chat-name">${chat.name || 'Unknown'}</span>
                    <span class="chat-time">${chat.lastMessageTime ? formatTime(new Date(chat.lastMessageTime).getTime()) : ''}</span>
                </div>
                <div class="chat-preview">${chat.lastMessage || 'No messages'}</div>
            </div>
        </div>
    `).join('');
}

async function selectChat(phone) {
    const chatDetail = document.getElementById('chat-detail');
    chatDetail.innerHTML = `
        <div style="padding: 2rem; width: 100%;">
            <h3>Loading conversation...</h3>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/api/chats/${phone}/messages`);
        const messages = await response.json();

        const contactResponse = await fetch(`${API_BASE}/api/contacts/${phone}`);
        const contact = await contactResponse.json();

        chatDetail.innerHTML = `
            <div class="chat-messages-container">
                <div class="chat-messages-header">
                    <div class="chat-avatar">${(contact.name || 'Unknown').charAt(0).toUpperCase()}</div>
                    <div>
                        <h3>${contact.name || 'Unknown'}</h3>
                        <p style="font-size: 0.875rem; color: var(--text-secondary);">${phone}</p>
                    </div>
                </div>
                <div class="chat-messages-list">
                    ${messages.map(msg => `
                        <div class="message ${msg.role === 'agent' ? 'message-sent' : 'message-received'}">
                            <div class="message-content">${msg.content}</div>
                            <div class="message-time">${formatTime(new Date(msg.createdAt).getTime())}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load chat:', error);
        chatDetail.innerHTML = `
            <div class="chat-detail-empty">
                <p style="color: var(--danger);">Failed to load conversation</p>
            </div>
        `;
    }
}

function updateChatCount(count) {
    document.getElementById('chat-count').textContent = count;
}

// Contacts
async function loadContacts() {
    const contactsGrid = document.getElementById('contacts-grid');

    try {
        const response = await fetch(`${API_BASE}/api/contacts`);
        contacts = await response.json();

        if (contacts.length === 0) {
            contactsGrid.innerHTML = `
                <div class="contacts-empty">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="32" fill="#f3f4f6"/>
                        <circle cx="32" cy="26" r="8" stroke="#9ca3af" stroke-width="2"/>
                        <path d="M20 50c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p>No contacts yet</p>
                </div>
            `;
        } else {
            renderContacts(contacts);
        }
    } catch (error) {
        console.error('Failed to load contacts:', error);
        contactsGrid.innerHTML = `
            <div class="contacts-empty">
                <p style="color: var(--danger);">Failed to load contacts</p>
            </div>
        `;
    }
}

function renderContacts(contacts) {
    const contactsGrid = document.getElementById('contacts-grid');
    contactsGrid.innerHTML = contacts.map(contact => `
        <div class="contact-card">
            <div class="contact-avatar">${contact.name.charAt(0).toUpperCase()}</div>
            <div class="contact-name">${contact.name}</div>
            <div class="contact-phone">${contact.phone}</div>
            <span class="contact-trust ${getTrustClass(contact.trustLevel)}">
                Trust Level: ${contact.trustLevel}
            </span>
        </div>
    `).join('');
}

function getTrustClass(level) {
    if (level >= 7) return 'high';
    if (level >= 4) return 'medium';
    return 'low';
}

// Settings
function loadSettings() {
    const statusEl = document.getElementById('settings-status');
    const phoneEl = document.getElementById('settings-phone');

    statusEl.textContent = connectionStatus === 'CONNECTED' ? 'Connected' : 'Disconnected';
    phoneEl.textContent = connectionStatus === 'CONNECTED' ? 'Connected' : 'Not connected';
}

function initializeSettings() {
    // Desktop notifications toggle
    const desktopNotif = document.getElementById('desktop-notifications');
    desktopNotif.checked = localStorage.getItem('desktop-notifications') === 'true';
    desktopNotif.addEventListener('change', (e) => {
        localStorage.setItem('desktop-notifications', e.target.checked);
        if (e.target.checked) {
            requestNotificationPermission();
        }
    });

    // Sound alerts toggle
    const soundAlerts = document.getElementById('sound-alerts');
    soundAlerts.checked = localStorage.getItem('sound-alerts') === 'true';
    soundAlerts.addEventListener('change', (e) => {
        localStorage.setItem('sound-alerts', e.target.checked);
    });

    // Disconnect button
    document.getElementById('disconnect-btn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to disconnect WhatsApp?')) {
            try {
                // Call disconnect API
                alert('Disconnect functionality not yet implemented');
            } catch (error) {
                console.error('Disconnect failed:', error);
            }
        }
    });
}

// Refresh
function initializeRefresh() {
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadPageData(currentPage);
    });
}

// Notifications
function checkNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        // Don't auto-request, wait for user to enable in settings
    }
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    if ('Notification' in window &&
        Notification.permission === 'granted' &&
        localStorage.getItem('desktop-notifications') === 'true') {
        new Notification(title, {
            body,
            icon: '/icon.png',
            badge: '/badge.png'
        });
    }
}

// Utilities
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
}

// Search functionality
document.getElementById('chat-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterChats(query);
});

document.getElementById('contact-search')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterContacts(query);
});

function filterChats(query) {
    const filtered = chats.filter(chat =>
        chat.name.toLowerCase().includes(query) ||
        chat.lastMessage.toLowerCase().includes(query)
    );
    renderChatList(filtered);
}

function filterContacts(query) {
    const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(query) ||
        contact.phone.includes(query)
    );
    renderContacts(filtered);
}

// Export for global access
window.switchPage = switchPage;
window.selectChat = selectChat;
