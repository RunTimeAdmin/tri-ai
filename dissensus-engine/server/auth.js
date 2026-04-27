const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'dissensus-default-secret-change-me';
const JWT_EXPIRY = '7d';

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadUsers() {
    ensureDir();
    if (!fs.existsSync(USERS_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch { return []; }
}

function saveUsers(users) {
    ensureDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function registerUser(email, password, name) {
    const users = loadUsers();
    const normalizedEmail = email.toLowerCase().trim();
    
    if (users.find(u => u.email === normalizedEmail)) {
        throw new Error('Email already registered');
    }
    if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new Error('Valid email required');
    }
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    
    const user = {
        id: userId,
        email: normalizedEmail,
        name: (name || '').trim() || normalizedEmail.split('@')[0],
        passwordHash: hash,
        workspaceId,  // personal default workspace
        createdAt: new Date().toISOString()
    };
    
    users.push(user);
    saveUsers(users);
    
    return { id: userId, email: normalizedEmail, name: user.name, workspaceId };
}

async function loginUser(email, password) {
    const users = loadUsers();
    const normalizedEmail = email.toLowerCase().trim();
    const user = users.find(u => u.email === normalizedEmail);
    
    if (!user) throw new Error('Invalid email or password');
    
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid email or password');
    
    const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, workspaceId: user.workspaceId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
    
    return { token, user: { id: user.id, email: user.email, name: user.name, workspaceId: user.workspaceId } };
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

function getUser(userId) {
    const users = loadUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, workspaceId: user.workspaceId, createdAt: user.createdAt };
}

// Middleware: requires auth — 401 if no valid token
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = decoded;
    next();
}

// Middleware: optional auth — extracts user if token present, passes through if not
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        if (decoded) req.user = decoded;
    }
    next();
}

module.exports = { registerUser, loginUser, verifyToken, getUser, authMiddleware, optionalAuth };
