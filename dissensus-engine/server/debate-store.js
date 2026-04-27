const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data', 'debates');

// Ensure data directory exists
function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}
ensureDir();

function updateIndex(metadata) {
    const indexPath = path.join(DATA_DIR, 'index.json');
    let index = [];
    try {
        if (fs.existsSync(indexPath)) {
            index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        }
    } catch { index = []; }
    index.unshift(metadata);
    // Keep index at reasonable size
    if (index.length > 1000) index = index.slice(0, 1000);
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
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
    const indexPath = path.join(DATA_DIR, 'index.json');
    try {
        if (fs.existsSync(indexPath)) {
            const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            return index.slice(0, limit);
        }
    } catch { }
    // Fallback: scan files if index.json missing
    return listRecentFallback(limit);
}

function listRecentFallback(limit = 20) {
    ensureDir();
    const files = fs.readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.json') && f !== 'index.json')
        .map(f => {
            const filePath = path.join(DATA_DIR, f);
            try {
                const stat = fs.statSync(filePath);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return {
                    id: data.id,
                    topic: (data.topic || '').substring(0, 100),
                    provider: data.provider,
                    userId: data.userId || null,
                    workspaceId: data.workspaceId || null,
                    timestamp: data.timestamp || stat.mtime.toISOString()
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    return files;
}

module.exports = { saveDebate, getDebate, listRecent };
