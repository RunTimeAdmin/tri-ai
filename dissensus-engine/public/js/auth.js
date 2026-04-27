// ── Dissensus Auth Client ─────────────────────────────────────
// Cookie-based auth with CSRF protection. No localStorage.

let currentUser = null;
let csrfToken = null;

function getCsrfToken() {
    if (csrfToken) return csrfToken;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function csrfHeaders() {
    const token = getCsrfToken();
    return token ? { 'X-CSRF-Token': token } : {};
}

function isLoggedIn() {
    return !!currentUser;
}

function getCurrentUser() {
    return currentUser;
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value.trim();
    const errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        currentUser = data.user;
        csrfToken = data.csrfToken;
        updateAuthUI();
        closeAuthModal();
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '';

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invalid email or password');

        currentUser = data.user;
        csrfToken = data.csrfToken;
        updateAuthUI();
        closeAuthModal();
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

async function logout() {
    await fetch('/api/auth/logout', {
        method: 'POST',
        headers: csrfHeaders(),
        credentials: 'same-origin'
    });
    currentUser = null;
    csrfToken = null;
    updateAuthUI();
    closeMyDebates();
}

function updateAuthUI() {
    const user = currentUser;
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');

    if (user && loginBtn && userMenu) {
        loginBtn.classList.add('hidden');
        userMenu.classList.remove('hidden');
        if (userName) userName.textContent = user.name || user.email;
    } else if (loginBtn && userMenu) {
        loginBtn.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

function showAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('hidden');
    switchAuthTab(tab);
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('hidden');
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) {
        if (tab === 'login') loginForm.classList.remove('hidden');
        else loginForm.classList.add('hidden');
    }
    if (registerForm) {
        if (tab === 'register') registerForm.classList.remove('hidden');
        else registerForm.classList.add('hidden');
    }
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab[data-tab="${tab}"]`)?.classList.add('active');
}

async function showMyDebates() {
    const panel = document.getElementById('myDebatesPanel');
    if (!panel) return;
    panel.classList.remove('hidden');

    const user = currentUser;
    if (!user) return;

    const listEl = document.getElementById('myDebatesList');
    listEl.innerHTML = '<div class="loading-debates">Loading...</div>';

    try {
        const res = await fetch(`/api/workspaces/${user.workspaceId}/debates?limit=20`, {
            credentials: 'same-origin'
        });
        if (!res.ok) throw new Error('Failed to load debates');
        const debates = await res.json();

        if (debates.length === 0) {
            listEl.innerHTML = '<div class="no-debates">No debates yet. Start your first debate!</div>';
            return;
        }

        listEl.innerHTML = debates.map(d => `
            <a href="/?debate=${d.id}" class="debate-list-item" data-debate-id="${d.id}">
                <div class="debate-list-topic">${escapeHtml(d.topic)}</div>
                <div class="debate-list-meta">${d.provider} &middot; ${new Date(d.timestamp).toLocaleDateString()}</div>
            </a>
        `).join('');

        listEl.querySelectorAll('.debate-list-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                loadDebateFromList(el.dataset.debateId);
            });
        });
    } catch (err) {
        listEl.innerHTML = `<div class="no-debates">Error: ${err.message}</div>`;
    }
}

function closeMyDebates() {
    const panel = document.getElementById('myDebatesPanel');
    if (panel) panel.classList.add('hidden');
}

function loadDebateFromList(debateId) {
    closeMyDebates();
    if (typeof loadSavedDebate === 'function') {
        loadSavedDebate(debateId);
    } else {
        window.location.href = `/?debate=${debateId}`;
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function initAuth() {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            updateAuthUI();
        }
    } catch {}
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initAuth();

    const loginForm = document.getElementById('loginFormEl');
    const registerForm = document.getElementById('registerFormEl');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
});
