import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Tenant, User, Product, Batch, TraceEvent, TodayStats } from './types';

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_FILE = path.join(dataDir, 'trace.db');

let db: Database;

function saveToFile(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as number, tenant_id: row.tenant_id as string, name: row.name as string,
    default_shelf_hours: row.default_shelf_hours as number, created_at: row.created_at as number,
  };
}

function rowToBatch(row: Record<string, unknown>): Batch {
  return {
    id: row.id as string, tenant_id: row.tenant_id as string, product_name: row.product_name as string,
    product_type_id: row.product_type_id as number | null, operator: row.operator as string,
    weight: row.weight !== null ? Number(row.weight) : null, spec: (row.spec as string) || '',
    notes: (row.notes as string) || '', status: row.status as Batch['status'],
    started_at: row.started_at as number, ended_at: row.ended_at as number | null,
    production_time: row.production_time as number | null, expire_at: row.expire_at as number | null,
    video_path: row.video_path as string | null, video_url: row.video_url as string | null,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    location_name: row.location_name as string | null, created_at: row.created_at as number,
  };
}

function rowToEvent(row: Record<string, unknown>): TraceEvent {
  return {
    id: row.id as number, tenant_id: row.tenant_id as string, batch_id: row.batch_id as string,
    event_type: row.event_type as string, description: row.description as string, occurred_at: row.occurred_at as number,
  };
}

// ── Initialize database ──────────────────────────────
export async function initDB(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator',
    display_name TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    default_shelf_hours INTEGER NOT NULL DEFAULT 24,
    created_at INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_type_id INTEGER,
    operator TEXT NOT NULL,
    weight REAL,
    spec TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'preparing',
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    production_time INTEGER,
    expire_at INTEGER,
    video_path TEXT,
    video_url TEXT,
    latitude REAL,
    longitude REAL,
    location_name TEXT,
    created_at INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS trace_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    occurred_at INTEGER NOT NULL
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_batches_tenant ON batches(tenant_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_tenant ON trace_events(tenant_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_events_batch ON trace_events(batch_id)`);

  saveToFile();
  console.log('✅ 数据库初始化完成 (SQLite)');
}

// ── Tenant operations ────────────────────────────────
async function createTenant(name: string, contactName: string, contactPhone: string): Promise<Tenant> {
  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  db.run(`INSERT INTO tenants (id, name, contact_name, contact_phone, created_at) VALUES (?, ?, ?, ?, ?)`,
    [id, name, contactName, contactPhone, now]);
  saveToFile();
  return { id, name, contact_name: contactName, contact_phone: contactPhone, created_at: now };
}

async function getTenantById(id: string): Promise<Tenant | null> {
  const result = db.exec(`SELECT * FROM tenants WHERE id = ?`, [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row: Record<string, unknown> = {};
  for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
  return { id: row.id as string, name: row.name as string, contact_name: row.contact_name as string, contact_phone: row.contact_phone as string, created_at: row.created_at as number };
}

// ── User operations ──────────────────────────────────
async function createUser(tenantId: string, username: string, passwordHash: string, role: string, displayName: string): Promise<User> {
  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  db.run(`INSERT INTO users (id, tenant_id, username, password_hash, role, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, tenantId, username, passwordHash, role, displayName, now]);
  saveToFile();
  return { id, tenant_id: tenantId, username, password_hash: passwordHash, role: role as User['role'], display_name: displayName, created_at: now };
}

async function getUserByUsername(username: string): Promise<User | null> {
  const result = db.exec(`SELECT * FROM users WHERE username = ?`, [username]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row: Record<string, unknown> = {};
  for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
  return { id: row.id as string, tenant_id: row.tenant_id as string, username: row.username as string, password_hash: row.password_hash as string, role: row.role as User['role'], display_name: row.display_name as string, created_at: row.created_at as number };
}

async function getUserById(id: string): Promise<User | null> {
  const result = db.exec(`SELECT * FROM users WHERE id = ?`, [id]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row: Record<string, unknown> = {};
  for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
  return { id: row.id as string, tenant_id: row.tenant_id as string, username: row.username as string, password_hash: row.password_hash as string, role: row.role as User['role'], display_name: row.display_name as string, created_at: row.created_at as number };
}

// ── Product operations (tenant-scoped) ───────────────
async function getProducts(tenantId: string): Promise<Product[]> {
  const result = db.exec(`SELECT * FROM products WHERE tenant_id = ? ORDER BY name`, [tenantId]);
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
    return rowToProduct(row);
  });
}

async function createProduct(tenantId: string, name: string, defaultShelfHours: number): Promise<Product> {
  const now = Math.floor(Date.now() / 1000);
  db.run(`INSERT INTO products (tenant_id, name, default_shelf_hours, created_at) VALUES (?, ?, ?, ?)`,
    [tenantId, name, defaultShelfHours, now]);
  const result = db.exec(`SELECT * FROM products WHERE tenant_id = ? ORDER BY id DESC LIMIT 1`, [tenantId]);
  saveToFile();
  if (result.length === 0 || result[0].values.length === 0) {
    return { id: 0, tenant_id: tenantId, name, default_shelf_hours: defaultShelfHours, created_at: now };
  }
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row: Record<string, unknown> = {};
  for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
  return rowToProduct(row);
}

async function updateProduct(tenantId: string, productId: number, name: string, defaultShelfHours: number): Promise<Product | null> {
  db.run(`UPDATE products SET name = ?, default_shelf_hours = ? WHERE id = ? AND tenant_id = ?`,
    [name, defaultShelfHours, productId, tenantId]);
  saveToFile();
  const result = db.exec(`SELECT * FROM products WHERE id = ? AND tenant_id = ?`, [productId, tenantId]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row: Record<string, unknown> = {};
  for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
  return rowToProduct(row);
}

async function deleteProduct(tenantId: string, productId: number): Promise<boolean> {
  db.run(`DELETE FROM products WHERE id = ? AND tenant_id = ?`, [productId, tenantId]);
  saveToFile();
  return true;
}

// ── Batch operations (tenant-scoped) ─────────────────
async function getBatches(tenantId: string, filters?: { status?: string; product_name?: string; date?: string; page?: number; limit?: number }): Promise<{ data: Batch[]; total: number }> {
  const conditions: string[] = ['tenant_id = ?'];
  const params: (string | number)[] = [tenantId];

  if (filters?.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters?.product_name) {
    conditions.push('product_name LIKE ?');
    params.push(`%${filters.product_name}%`);
  }
  if (filters?.date) {
    const start = Math.floor(new Date(filters.date).getTime() / 1000);
    conditions.push('created_at >= ? AND created_at < ?');
    params.push(start, start + 86400);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countResult = db.exec(`SELECT COUNT(*) as cnt FROM batches ${where}`, params);
  const total = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const offset = (page - 1) * limit;

  const result = db.exec(`SELECT * FROM batches ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]);

  if (result.length === 0) return { data: [], total };

  const cols = result[0].columns;
  const data: Batch[] = result[0].values.map((vals: unknown[]) => {
    const row: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
    return rowToBatch(row);
  });

  return { data, total };
}

async function getBatchById(tenantId: string, batchId: string): Promise<Batch | null> {
  const result = db.exec(`SELECT * FROM batches WHERE id = ? AND tenant_id = ?`, [batchId, tenantId]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row: Record<string, unknown> = {};
  for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
  return rowToBatch(row);
}

async function getBatchByIdPublic(batchId: string): Promise<Batch | null> {
  const result = db.exec(`SELECT * FROM batches WHERE id = ?`, [batchId]);
  if (result.length === 0 || result[0].values.length === 0) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row: Record<string, unknown> = {};
  for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
  return rowToBatch(row);
}

async function createBatch(tenantId: string, batch: Omit<Batch, 'id' | 'tenant_id' | 'created_at'>): Promise<Batch> {
  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  db.run(
    `INSERT INTO batches (id, tenant_id, product_name, product_type_id, operator, weight, spec, notes, status, started_at, ended_at, production_time, expire_at, video_path, video_url, latitude, longitude, location_name, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, tenantId, batch.product_name, batch.product_type_id, batch.operator, batch.weight,
     batch.spec, batch.notes, batch.status, batch.started_at, batch.ended_at, batch.production_time,
     batch.expire_at, batch.video_path, batch.video_url, batch.latitude, batch.longitude, batch.location_name, now]
  );
  saveToFile();
  return { ...batch, id, tenant_id: tenantId, created_at: now };
}

async function updateBatch(tenantId: string, batchId: string, updates: Partial<Batch>): Promise<Batch | null> {
  const existing = await getBatchById(tenantId, batchId);
  if (!existing) return null;
  const merged = { ...existing, ...updates };
  db.run(
    `UPDATE batches SET product_name=?, product_type_id=?, operator=?, weight=?, spec=?, notes=?, status=?, started_at=?, ended_at=?, production_time=?, expire_at=?, video_path=?, video_url=?, latitude=?, longitude=?, location_name=? WHERE id=? AND tenant_id=?`,
    [merged.product_name, merged.product_type_id, merged.operator, merged.weight, merged.spec,
     merged.notes, merged.status, merged.started_at, merged.ended_at, merged.production_time,
     merged.expire_at, merged.video_path, merged.video_url, merged.latitude, merged.longitude, merged.location_name, batchId, tenantId]
  );
  saveToFile();
  return merged;
}

async function deleteBatch(tenantId: string, batchId: string): Promise<boolean> {
  db.run(`DELETE FROM trace_events WHERE batch_id = ? AND tenant_id = ?`, [batchId, tenantId]);
  db.run(`DELETE FROM batches WHERE id = ? AND tenant_id = ?`, [batchId, tenantId]);
  saveToFile();
  return true;
}

// ── Event operations (tenant-scoped) ─────────────────
async function getEventsByBatch(tenantId: string, batchId: string): Promise<TraceEvent[]> {
  const result = db.exec(`SELECT * FROM trace_events WHERE batch_id = ? AND tenant_id = ? ORDER BY occurred_at`, [batchId, tenantId]);
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
    return rowToEvent(row);
  });
}

async function getEventsByBatchPublic(batchId: string): Promise<TraceEvent[]> {
  const result = db.exec(`SELECT * FROM trace_events WHERE batch_id = ? ORDER BY occurred_at`, [batchId]);
  if (result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map((vals: unknown[]) => {
    const row: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
    return rowToEvent(row);
  });
}

async function addEvent(tenantId: string, batchId: string, eventType: string, description: string): Promise<TraceEvent> {
  const now = Math.floor(Date.now() / 1000);
  db.run(`INSERT INTO trace_events (tenant_id, batch_id, event_type, description, occurred_at) VALUES (?, ?, ?, ?, ?)`,
    [tenantId, batchId, eventType, description, now]);
  saveToFile();
  const result = db.exec(`SELECT * FROM trace_events WHERE batch_id = ? AND tenant_id = ? ORDER BY id DESC LIMIT 1`, [batchId, tenantId]);
  if (result.length === 0 || result[0].values.length === 0) {
    return { id: Date.now(), tenant_id: tenantId, batch_id: batchId, event_type: eventType, description, occurred_at: now };
  }
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const row: Record<string, unknown> = {};
  for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
  return rowToEvent(row);
}

async function deleteEventsByBatch(tenantId: string, batchId: string): Promise<void> {
  db.run(`DELETE FROM trace_events WHERE batch_id = ? AND tenant_id = ?`, [batchId, tenantId]);
  saveToFile();
}

// ── Today Stats (tenant-scoped) ─────────────────────
async function getTodayStats(tenantId: string): Promise<TodayStats> {
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const result = db.exec(
    `SELECT status, COUNT(*) as cnt, COALESCE(SUM(weight), 0) as tw FROM batches WHERE tenant_id = ? AND created_at >= ? GROUP BY status`,
    [tenantId, todayStart]
  );

  let total = 0, recording = 0, completed = 0, preparing = 0, printed = 0, totalWeight = 0;

  if (result.length > 0) {
    const cols = result[0].columns;
    for (const vals of result[0].values as unknown[][]) {
      const row: Record<string, unknown> = {};
      for (let i = 0; i < cols.length; i++) { row[cols[i]] = vals[i]; }
      const status = row.status as string;
      const cnt = row.cnt as number;
      const weight = Number(row.tw) || 0;
      total += cnt;
      totalWeight += weight;
      if (status === 'recording') recording = cnt;
      if (status === 'done') completed += cnt;
      if (status === 'preparing') preparing = cnt;
      if (status === 'printed') { printed = cnt; completed += cnt; }
    }
  }

  return { total, recording, completed, preparing, printed, total_weight: totalWeight };
}

// ── Seed default products for a new tenant ───────────
async function seedProductsForTenant(tenantId: string): Promise<void> {
  const defaults: { name: string; default_shelf_hours: number }[] = [
    { name: '草莓', default_shelf_hours: 24 },
    { name: '西瓜', default_shelf_hours: 48 },
    { name: '芒果', default_shelf_hours: 36 },
    { name: '哈密瓜', default_shelf_hours: 48 },
    { name: '菠萝', default_shelf_hours: 24 },
    { name: '火龙果', default_shelf_hours: 48 },
    { name: '猕猴桃', default_shelf_hours: 36 },
    { name: '葡萄', default_shelf_hours: 24 },
    { name: '樱桃', default_shelf_hours: 24 },
    { name: '蓝莓', default_shelf_hours: 48 },
  ];
  const now = Math.floor(Date.now() / 1000);
  for (const item of defaults) {
    db.run(`INSERT INTO products (tenant_id, name, default_shelf_hours, created_at) VALUES (?, ?, ?, ?)`,
      [tenantId, item.name, item.default_shelf_hours, now]);
  }
  saveToFile();
}

const store = {
  initDB,
  createTenant,
  getTenantById,
  createUser,
  getUserByUsername,
  getUserById,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getBatches,
  getBatchById,
  getBatchByIdPublic,
  createBatch,
  updateBatch,
  deleteBatch,
  getEventsByBatch,
  getEventsByBatchPublic,
  addEvent,
  deleteEventsByBatch,
  getTodayStats,
  seedProductsForTenant,
};

export default store;
