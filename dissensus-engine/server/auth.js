const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
}
if (JWT_SECRET === 'dissensus-default-secret-change-me') {
    console.error('FATAL: JWT_SECRET must not use the default value in production');
    if (process.env.NODE_ENV === 'production') process.exit(1);
}
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dissensus-dev-secret-not-for-production';
const JWT_EXPIRY = '7d';

async function registerUser(email, password, name) {
    // Input validation
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
        return { error: 'Valid email required' };
    }
    if (!password || password.length < 8) {
        return { error: 'Password must be at least 8 characters' };
    }
    if (!name || name.trim().length < 1) {
        return { error: 'Name is required' };
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) return { error: 'Email already registered' };

    const hash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO users (id, email, password, name, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, normalizedEmail, hash, name.trim(), now);

    // Auto-create personal workspace
    const wsId = crypto.randomUUID();
    db.prepare('INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)')
        .run(wsId, `${name.trim()}'s Workspace`, id, now);
    db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)')
        .run(wsId, id, 'owner', now);

    const token = jwt.sign({ id, email: normalizedEmail, name: name.trim() }, EFFECTIVE_JWT_SECRET, { expiresIn: JWT_EXPIRY });
    const csrfToken = crypto.randomBytes(32).toString('hex');
    return { token, user: { id, email: normalizedEmail, name: name.trim() }, csrfToken };
}

async function loginUser(email, password) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) return { error: 'Invalid credentials' };

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return { error: 'Invalid credentials' };

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, EFFECTIVE_JWT_SECRET, { expiresIn: JWT_EXPIRY });
    const csrfToken = crypto.randomBytes(32).toString('hex');
    return { token, user: { id: user.id, email: user.email, name: user.name }, csrfToken };
}

function verifyToken(token) {
    try {
        return jwt.verify(token, EFFECTIVE_JWT_SECRET);
    } catch {
        return null;
    }
}

function getUser(userId) {
    const user = db.prepare('SELECT id, email, name, created_at as createdAt FROM users WHERE id = ?').get(userId);
    if (!user) return null;
    const ws = db.prepare('SELECT id FROM workspaces WHERE owner_id = ? LIMIT 1').get(userId);
    if (ws) user.workspaceId = ws.id;
    return user;
}

function extractToken(req) {
    const cookieToken = req.cookies?.token;
    if (cookieToken) return cookieToken;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    return null;
}

// Middleware: requires auth — 401 if no valid token
function authMiddleware(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = decoded;
    next();
}

// Middleware: optional auth — extracts user if token present, passes through if not
function optionalAuth(req, res, next) {
    const token = extractToken(req);
    if (token) {
        const decoded = verifyToken(token);
        if (decoded) req.user = decoded;
    }
    next();
}

function csrfProtection(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const csrfToken = req.headers['x-csrf-token'];
    const cookieToken = req.cookies?.csrf_token;
    if (!csrfToken || !cookieToken || csrfToken.length !== cookieToken.length || 
        !crypto.timingSafeEqual(Buffer.from(csrfToken), Buffer.from(cookieToken))) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    next();
}

module.exports = { registerUser, loginUser, verifyToken, getUser, authMiddleware, optionalAuth, csrfProtection };
