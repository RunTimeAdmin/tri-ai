// ── Dissensus Auth Client ─────────────────────────────────────
const AUTH_TOKEN_KEY = 'dissensus_token';
const AUTH_USER_KEY = 'dissensus_user';

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getAuthUser() {
    try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY)); } catch { return null; }
}

function setAuth(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    updateAuthUI();
}

function clearAuth() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    updateAuthUI();
}

function isLoggedIn() {
    return !!getAuthToken();
}

// Returns headers object with auth token if logged in
function authHeaders() {
    const token = getAuthToken();
    if (token) return { 'Authorization': `Bearer ${token}` };
    return {};
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
        
        // Auto-login after register
        const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.error || 'Login failed');
        
        setAuth(loginData.token, loginData.user);
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
        
        setAuth(data.token, data.user);
        closeAuthModal();
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

function logout() {
    clearAuth();
    closeMyDebates();
}

function updateAuthUI() {
    const user = getAuthUser();
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    
    if (user && loginBtn && userMenu) {
        loginBtn.style.display = 'none';
        userMenu.style.display = 'flex';
        if (userName) userName.textContent = user.name || user.email;
    } else if (loginBtn && userMenu) {
        loginBtn.style.display = 'inline-flex';
        userMenu.style.display = 'none';
    }
}

function showAuthModal(tab = 'login') {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'flex';
    switchAuthTab(tab);
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

function switchAuthTab(tab) {
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab[data-tab="${tab}"]`)?.classList.add('active');
}

async function showMyDebates() {
    const panel = document.getElementById('myDebatesPanel');
    if (!panel) return;
    panel.style.display = 'block';
    
    const user = getAuthUser();
    if (!user) return;
    
    const listEl = document.getElementById('myDebatesList');
    listEl.innerHTML = '<div class="loading-debates">Loading...</div>';
    
    try {
        const res = await fetch(`/api/workspaces/${user.workspaceId}/debates?limit=20`, {
            headers: authHeaders()
        });
        if (!res.ok) throw new Error('Failed to load debates');
        const debates = await res.json();
        
        if (debates.length === 0) {
            listEl.innerHTML = '<div class="no-debates">No debates yet. Start your first debate!</div>';
            return;
        }
        
        listEl.innerHTML = debates.map(d => `
            <a href="/?debate=${d.id}" class="debate-list-item" onclick="loadDebateFromList('${d.id}'); return false;">
                <div class="debate-list-topic">${escapeHtml(d.topic)}</div>
                <div class="debate-list-meta">${d.provider} &middot; ${new Date(d.timestamp).toLocaleDateString()}</div>
            </a>
        `).join('');
    } catch (err) {
        listEl.innerHTML = `<div class="no-debates">Error: ${err.message}</div>`;
    }
}

function closeMyDebates() {
    const panel = document.getElementById('myDebatesPanel');
    if (panel) panel.style.display = 'none';
}

function loadDebateFromList(debateId) {
    closeMyDebates();
    // Use the existing loadSavedDebate function from app.js
    if (typeof loadSavedDebate === 'function') {
        loadSavedDebate(debateId);
    } else {
        window.location.href = `/?debate=${debateId}`;
    }
}

// Helper - reuse escapeHtml from app.js or define locally
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    
    // Wire up form submissions
    const loginForm = document.getElementById('loginFormEl');
    const registerForm = document.getElementById('registerFormEl');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
});
