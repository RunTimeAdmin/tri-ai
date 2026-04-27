const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const DATA_DIR = path.join(__dirname, '..', 'data', 'debates');

// Ensure data directory exists
function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}
ensureDir();

db.exec(`
    CREATE TABLE IF NOT EXISTS debate_index (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        provider TEXT,
        model TEXT,
        user_id TEXT,
        workspace_id TEXT,
        visibility TEXT NOT NULL DEFAULT 'private',
        share_token TEXT,
        timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_debate_index_timestamp ON debate_index(timestamp);
    CREATE INDEX IF NOT EXISTS idx_debate_index_user ON debate_index(user_id);
    CREATE INDEX IF NOT EXISTS idx_debate_index_workspace ON debate_index(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_debate_index_share ON debate_index(share_token);
`);

function updateIndex(metadata) {
    db.prepare(`INSERT OR REPLACE INTO debate_index (id, topic, provider, model, user_id, workspace_id, visibility, share_token, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        metadata.id, metadata.topic, metadata.provider, metadata.model,
        metadata.userId || null, metadata.workspaceId || null,
        'private', null, metadata.timestamp
    );
}

/**
 * Save a completed debate to disk.
 * @param {Object} debateData - { topic, provider, model, phases, timestamp }
 * @returns {string} debate ID (UUID)
 */
function saveDebate(debateData) {
    ensureDir();
    const id = crypto.randomUUID();
    const record = {
        id,
        topic: debateData.topic,
        provider: debateData.provider,
        model: debateData.model,
        userId: debateData.userId || null,
        workspaceId: debateData.workspaceId || null,
        timestamp: debateData.timestamp || new Date().toISOString(),
        phases: debateData.phases || []
    };
    const filePath = path.join(DATA_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
    updateIndex({ id, topic: record.topic, timestamp: record.timestamp, provider: record.provider, model: record.model, userId: record.userId, workspaceId: record.workspaceId });
    return id;
}

/**
 * Retrieve a saved debate by ID.
 * @param {string} id - debate UUID
 * @returns {Object|null}
 */
function getDebate(id) {
    // Validate ID format to prevent path traversal
    if (!id || !/^[a-f0-9-]{36}$/.test(id)) return null;
    const filePath = path.join(DATA_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * List recent debates (metadata only, no full content).
 * @param {number} limit - max results (default 20)
 * @returns {Array}
 */
function listRecent(limit = 20) {
    return db.prepare('SELECT id, topic, provider, model, user_id as userId, workspace_id as workspaceId, visibility, share_token as shareToken, timestamp FROM debate_index ORDER BY timestamp DESC LIMIT ?').all(limit);
}

function setDebateVisibility(debateId, visibility, userId) {
    const row = db.prepare('SELECT user_id FROM debate_index WHERE id = ?').get(debateId);
    if (!row || row.user_id !== userId) return false;
    db.prepare('UPDATE debate_index SET visibility = ? WHERE id = ?').run(visibility, debateId);
    return true;
}

function generateShareToken(debateId, userId) {
    const row = db.prepare('SELECT user_id FROM debate_index WHERE id = ?').get(debateId);
    if (!row || row.user_id !== userId) return null;
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    db.prepare('UPDATE debate_index SET share_token = ?, visibility = ? WHERE id = ?').run(token, 'shared', debateId);
    return token;
}

function getDebateByShareToken(shareToken) {
    if (!shareToken || shareToken.length !== 16) return null;
    return db.prepare('SELECT id FROM debate_index WHERE share_token = ?').get(shareToken);
}

function getDebateMeta(id) {
    if (!id || !/^[a-f0-9-]{36}$/.test(id)) return null;
    return db.prepare('SELECT id, user_id as userId, workspace_id as workspaceId, visibility, share_token as shareToken FROM debate_index WHERE id = ?').get(id);
}

module.exports = { saveDebate, getDebate, listRecent, setDebateVisibility, generateShareToken, getDebateByShareToken, getDebateMeta };
