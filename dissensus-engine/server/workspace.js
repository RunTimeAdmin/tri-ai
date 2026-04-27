const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WORKSPACES_FILE = path.join(DATA_DIR, 'workspaces.json');

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadWorkspaces() {
    ensureDir();
    if (!fs.existsSync(WORKSPACES_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(WORKSPACES_FILE, 'utf8')); } catch { return []; }
}

function saveWorkspaces(workspaces) {
    ensureDir();
    fs.writeFileSync(WORKSPACES_FILE, JSON.stringify(workspaces, null, 2));
}

function createWorkspace(name, ownerId) {
    const workspaces = loadWorkspaces();
    const workspace = {
        id: crypto.randomUUID(),
        name: (name || '').trim(),
        ownerId,
        members: [{ userId: ownerId, role: 'owner' }],
        createdAt: new Date().toISOString()
    };
    workspaces.push(workspace);
    saveWorkspaces(workspaces);
    return workspace;
}

function getWorkspace(id) {
    const workspaces = loadWorkspaces();
    return workspaces.find(w => w.id === id) || null;
}

function getUserWorkspaces(userId) {
    const workspaces = loadWorkspaces();
    return workspaces.filter(w => w.members.some(m => m.userId === userId));
}

function addMember(workspaceId, userId, role = 'member') {
    const workspaces = loadWorkspaces();
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) throw new Error('Workspace not found');
    if (ws.members.find(m => m.userId === userId)) throw new Error('User already a member');
    ws.members.push({ userId, role });
    saveWorkspaces(workspaces);
    return ws;
}

module.exports = { createWorkspace, getWorkspace, getUserWorkspaces, addMember };
