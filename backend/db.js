const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const PRODUCTS_FILE = path.join(dataDir, 'products.json');
const BATCHES_FILE = path.join(dataDir, 'batches.json');
const EVENTS_FILE = path.join(dataDir, 'events.json');

function readJSON(file, defaultVal) {
  try {
    if (!fs.existsSync(file)) return defaultVal;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return defaultVal; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const store = {
  // ── Products ──────────────────────────────────────
  getProducts() {
    return readJSON(PRODUCTS_FILE, []);
  },
  saveProducts(list) {
    writeJSON(PRODUCTS_FILE, list);
  },

  // ── Batches ───────────────────────────────────────
  getBatches() {
    return readJSON(BATCHES_FILE, []);
  },
  saveBatches(list) {
    writeJSON(BATCHES_FILE, list);
  },
  getBatchById(id) {
    return this.getBatches().find(b => b.id === id) || null;
  },
  upsertBatch(batch) {
    const list = this.getBatches();
    const idx = list.findIndex(b => b.id === batch.id);
    if (idx >= 0) list[idx] = batch; else list.unshift(batch);
    this.saveBatches(list);
    return batch;
  },
  deleteBatch(id) {
    const list = this.getBatches().filter(b => b.id !== id);
    this.saveBatches(list);
  },

  // ── Events ────────────────────────────────────────
  getEvents() {
    return readJSON(EVENTS_FILE, []);
  },
  saveEvents(list) {
    writeJSON(EVENTS_FILE, list);
  },
  getEventsByBatch(batchId) {
    return this.getEvents().filter(e => e.batch_id === batchId).sort((a, b) => a.occurred_at - b.occurred_at);
  },
  addEvent(batchId, eventType, description) {
    const events = this.getEvents();
    const ev = { id: Date.now() + Math.random(), batch_id: batchId, event_type: eventType, description, occurred_at: Math.floor(Date.now() / 1000) };
    events.push(ev);
    this.saveEvents(events);
    return ev;
  },
  deleteEventsByBatch(batchId) {
    this.saveEvents(this.getEvents().filter(e => e.batch_id !== batchId));
  },

  // ── Today Stats ───────────────────────────────────
  getTodayStats() {
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const batches = this.getBatches().filter(b => b.created_at >= todayStart);
    return {
      total: batches.length,
      recording: batches.filter(b => b.status === 'recording').length,
      completed: batches.filter(b => b.status === 'done' || b.status === 'printed').length,
      preparing: batches.filter(b => b.status === 'preparing').length,
      printed: batches.filter(b => b.status === 'printed').length,
      total_weight: batches.reduce((s, b) => s + (b.weight || 0), 0),
    };
  },
};

// ── Seed default product types ───────────────────────
function seedProducts() {
  const existing = store.getProducts();
  if (existing.length > 0) return;
  const defaults = [
    { id: 1, name: '草莓', default_shelf_hours: 24 },
    { id: 2, name: '西瓜', default_shelf_hours: 48 },
    { id: 3, name: '芒果', default_shelf_hours: 36 },
    { id: 4, name: '哈密瓜', default_shelf_hours: 48 },
    { id: 5, name: '菠萝', default_shelf_hours: 24 },
    { id: 6, name: '火龙果', default_shelf_hours: 48 },
    { id: 7, name: '猕猴桃', default_shelf_hours: 36 },
    { id: 8, name: '葡萄', default_shelf_hours: 24 },
    { id: 9, name: '樱桃', default_shelf_hours: 24 },
    { id: 10, name: '蓝莓', default_shelf_hours: 48 },
  ].map(p => ({ ...p, created_at: Math.floor(Date.now() / 1000) }));
  store.saveProducts(defaults);
}
seedProducts();

module.exports = store;
