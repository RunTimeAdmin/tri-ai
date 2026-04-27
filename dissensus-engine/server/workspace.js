const crypto = require('crypto');
const db = require('./db');

function createWorkspace(name, ownerId) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)').run(id, name, ownerId, now);
    db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(id, ownerId, 'owner', now);
    return { id, name, ownerId, members: [{ userId: ownerId, role: 'owner' }], createdAt: now };
}

function getWorkspace(id) {
    const ws = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
    if (!ws) return null;
    const members = db.prepare('SELECT user_id as userId, role FROM workspace_members WHERE workspace_id = ?').all(ws.id);
    return { id: ws.id, name: ws.name, ownerId: ws.owner_id, members, createdAt: ws.created_at };
}

function getUserWorkspaces(userId) {
    const rows = db.prepare(`
        SELECT w.* FROM workspaces w
        JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE wm.user_id = ?
    `).all(userId);
    return rows.map(ws => {
        const members = db.prepare('SELECT user_id as userId, role FROM workspace_members WHERE workspace_id = ?').all(ws.id);
        return { id: ws.id, name: ws.name, ownerId: ws.owner_id, members, createdAt: ws.created_at };
    });
}

function addMember(workspaceId, userId, role = 'member') {
    try {
        db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(workspaceId, userId, role);
        return true;
    } catch { return false; }
}

module.exports = { createWorkspace, getWorkspace, getUserWorkspaces, addMember };
