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
        timestamp: debateData.timestamp || new Date().toISOString(),
        phases: debateData.phases || []
    };
    const filePath = path.join(DATA_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
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
    ensureDir();
    const files = fs.readdirSync(DATA_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
            const filePath = path.join(DATA_DIR, f);
            try {
                const stat = fs.statSync(filePath);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return {
                    id: data.id,
                    topic: (data.topic || '').substring(0, 100),
                    provider: data.provider,
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
