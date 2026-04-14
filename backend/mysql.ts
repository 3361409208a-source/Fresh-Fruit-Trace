import mysql from 'mysql2/promise';
import type { Enterprise, User, Product, Batch, TraceEvent, TodayStats } from './types';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '123456';
const DB_NAME = process.env.DB_NAME || 'fruit_trace';

export const pool = mysql.createPool({
  host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME,
  waitForConnections: true, connectionLimit: 10, charset: 'utf8mb4',
});

const now = () => Math.floor(Date.now() / 1000);

// ── Enterprises ──────────────────────────────────────────────────────────────
export async function getEnterprises(): Promise<Enterprise[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM enterprises ORDER BY id DESC');
  return rows as Enterprise[];
}

export async function getEnterpriseById(id: number): Promise<Enterprise | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM enterprises WHERE id = ?', [id]);
  return rows.length ? (rows[0] as Enterprise) : null;
}

export async function createEnterprise(data: Partial<Enterprise> & { name: string; code: string }): Promise<Enterprise> {
  const t = now();
  const [res] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO enterprises (name, code, contact_person, contact_phone, address, license_no, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [data.name, data.code, data.contact_person || null, data.contact_phone || null, data.address || null, data.license_no || null, t, t]
  );
  return { id: res.insertId, name: data.name, code: data.code, contact_person: data.contact_person || null, contact_phone: data.contact_phone || null, address: data.address || null, license_no: data.license_no || null, logo_url: null, status: 1, created_at: t, updated_at: t };
}

export async function updateEnterprise(id: number, data: Partial<Enterprise>): Promise<void> {
  const fields: string[] = []; const values: any[] = [];
  for (const k of ['name', 'code', 'contact_person', 'contact_phone', 'address', 'license_no', 'logo_url', 'status'] as const) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (!fields.length) return;
  fields.push('updated_at = ?'); values.push(now()); values.push(id);
  await pool.execute(`UPDATE enterprises SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteEnterprise(id: number): Promise<void> {
  await pool.execute('DELETE FROM enterprises WHERE id = ?', [id]);
}

// ── Users ────────────────────────────────────────────────────────────────────
export async function getUsers(enterpriseId: number): Promise<User[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id, enterprise_id, username, real_name, phone, role, status, last_login_at, created_at, updated_at FROM users WHERE enterprise_id = ? ORDER BY id', [enterpriseId]
  );
  return rows as User[];
}

export async function getUserById(id: number): Promise<User | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT id, enterprise_id, username, real_name, phone, role, status, last_login_at, created_at, updated_at FROM users WHERE id = ?', [id]
  );
  return rows.length ? (rows[0] as User) : null;
}

export async function getUserWithPassword(enterpriseId: number, username: string): Promise<User | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM users WHERE enterprise_id = ? AND username = ?', [enterpriseId, username]
  );
  return rows.length ? (rows[0] as User) : null;
}

export async function getUserWithPasswordByUsername(username: string): Promise<User | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM users WHERE username = ?', [username]
  );
  return rows.length ? (rows[0] as User) : null;
}

export async function createUser(data: { enterprise_id: number; username: string; password_hash: string; real_name?: string; phone?: string; role?: string }): Promise<User> {
  const t = now();
  const [res] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO users (enterprise_id, username, password_hash, real_name, phone, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [data.enterprise_id, data.username, data.password_hash, data.real_name || null, data.phone || null, data.role || 'operator', t, t]
  );
  return { id: res.insertId, enterprise_id: data.enterprise_id, username: data.username, password_hash: data.password_hash, real_name: data.real_name || null, phone: data.phone || null, role: data.role as any, status: 1, last_login_at: null, created_at: t, updated_at: t };
}

export async function updateUser(id: number, data: Partial<User>): Promise<void> {
  const fields: string[] = []; const values: any[] = [];
  for (const k of ['username', 'real_name', 'phone', 'role', 'status'] as const) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (data.password_hash) { fields.push('password_hash = ?'); values.push(data.password_hash); }
  if (!fields.length) return;
  fields.push('updated_at = ?'); values.push(now()); values.push(id);
  await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function updateUserLastLogin(id: number): Promise<void> {
  await pool.execute('UPDATE users SET last_login_at = ? WHERE id = ?', [now(), id]);
}

export async function deleteUser(id: number): Promise<void> {
  await pool.execute('DELETE FROM users WHERE id = ?', [id]);
}

// ── Products ─────────────────────────────────────────────────────────────────
export async function getProducts(enterpriseId: number): Promise<Product[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM products WHERE enterprise_id = ?', [enterpriseId]);
  return rows as Product[];
}

export async function getProductById(id: number, enterpriseId: number): Promise<Product | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM products WHERE id = ? AND enterprise_id = ?', [id, enterpriseId]);
  return rows.length ? (rows[0] as Product) : null;
}

export async function createProduct(data: { enterprise_id: number; name: string; default_shelf_hours?: number }): Promise<Product> {
  const t = now();
  const [res] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO products (enterprise_id, name, default_shelf_hours, created_at) VALUES (?, ?, ?, ?)',
    [data.enterprise_id, data.name, data.default_shelf_hours || 24, t]
  );
  return { id: res.insertId, enterprise_id: data.enterprise_id, name: data.name, default_shelf_hours: data.default_shelf_hours || 24, created_at: t };
}

export async function updateProduct(id: number, enterpriseId: number, data: Partial<Product>): Promise<void> {
  const fields: string[] = []; const values: any[] = [];
  for (const k of ['name', 'default_shelf_hours'] as const) { if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); } }
  if (!fields.length) return;
  values.push(id); values.push(enterpriseId);
  await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND enterprise_id = ?`, values);
}

export async function deleteProduct(id: number, enterpriseId: number): Promise<void> {
  await pool.execute('DELETE FROM products WHERE id = ? AND enterprise_id = ?', [id, enterpriseId]);
}

// ── Batches ──────────────────────────────────────────────────────────────────
export async function getBatches(enterpriseId: number, filters?: { status?: string; product_name?: string; date?: string; offset?: number; limit?: number }): Promise<{ batches: Batch[]; total: number }> {
  let where = 'WHERE enterprise_id = ?';
  const params: any[] = [enterpriseId];
  if (filters?.status) { where += ' AND status = ?'; params.push(filters.status); }
  if (filters?.product_name) { where += ' AND product_name LIKE ?'; params.push(`%${filters.product_name}%`); }
  if (filters?.date) {
    const start = Math.floor(new Date(filters.date).getTime() / 1000);
    where += ' AND created_at >= ? AND created_at < ?';
    params.push(start, start + 86400);
  }
  const [countRows] = await pool.execute<mysql.RowDataPacket[]>(`SELECT COUNT(*) as cnt FROM batches ${where}`, params);
  const total = (countRows[0] as any).cnt;

  let sql = `SELECT * FROM batches ${where} ORDER BY created_at DESC`;
  if (filters?.limit) { sql += ' LIMIT ?'; params.push(filters.limit); }
  if (filters?.offset !== undefined) { sql += ' OFFSET ?'; params.push(filters.offset); }

  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params);
  return { batches: rows as Batch[], total };
}

export async function getBatchById(id: string, enterpriseId: number): Promise<Batch | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM batches WHERE id = ? AND enterprise_id = ?', [id, enterpriseId]
  );
  return rows.length ? (rows[0] as Batch) : null;
}

export async function createBatch(data: { id: string; enterprise_id: number; product_name: string; product_type_id?: number | null; operator: string; weight?: number | null; spec?: string; notes?: string; latitude?: number | null; longitude?: number | null; location_name?: string | null }): Promise<Batch> {
  const t = now();
  await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO batches (id, enterprise_id, product_name, product_type_id, operator, weight, spec, notes, status, started_at, latitude, longitude, location_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'preparing', ?, ?, ?, ?, ?)`,
    [data.id, data.enterprise_id, data.product_name, data.product_type_id ?? null, data.operator, data.weight ?? null, data.spec || '', data.notes || null, t, data.latitude ?? null, data.longitude ?? null, data.location_name || null, t]
  );
  return { id: data.id, enterprise_id: data.enterprise_id, product_name: data.product_name, product_type_id: data.product_type_id ?? null, operator: data.operator, weight: data.weight ?? null, spec: data.spec || '', notes: data.notes || null, status: 'preparing', started_at: t, ended_at: null, production_time: null, expire_at: null, video_path: null, video_url: null, latitude: data.latitude ?? null, longitude: data.longitude ?? null, location_name: data.location_name || null, created_at: t };
}

export async function updateBatch(id: string, enterpriseId: number, data: Partial<Batch>): Promise<void> {
  const fields: string[] = []; const values: any[] = [];
  for (const k of ['product_name', 'product_type_id', 'operator', 'weight', 'spec', 'notes', 'status', 'started_at', 'ended_at', 'production_time', 'expire_at', 'video_path', 'video_url', 'latitude', 'longitude', 'location_name'] as const) {
    if (data[k] !== undefined) { fields.push(`${k} = ?`); values.push(data[k]); }
  }
  if (!fields.length) return;
  values.push(id); values.push(enterpriseId);
  await pool.execute(`UPDATE batches SET ${fields.join(', ')} WHERE id = ? AND enterprise_id = ?`, values);
}

export async function deleteBatch(id: string, enterpriseId: number): Promise<void> {
  await pool.execute('DELETE FROM batches WHERE id = ? AND enterprise_id = ?', [id, enterpriseId]);
}

// ── Trace Events ─────────────────────────────────────────────────────────────
export async function getEventsByBatch(batchId: string, enterpriseId: number): Promise<TraceEvent[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM trace_events WHERE batch_id = ? AND enterprise_id = ? ORDER BY occurred_at ASC',
    [batchId, enterpriseId]
  );
  return rows as TraceEvent[];
}

export async function addEvent(data: { batch_id: string; enterprise_id: number; event_type: string; description: string }): Promise<TraceEvent> {
  const t = now();
  const [res] = await pool.execute<mysql.ResultSetHeader>(
    'INSERT INTO trace_events (batch_id, enterprise_id, event_type, description, occurred_at) VALUES (?, ?, ?, ?, ?)',
    [data.batch_id, data.enterprise_id, data.event_type, data.description, t]
  );
  return { id: res.insertId, batch_id: data.batch_id, enterprise_id: data.enterprise_id, event_type: data.event_type, description: data.description, occurred_at: t };
}

export async function deleteEventsByBatch(batchId: string, enterpriseId: number): Promise<void> {
  await pool.execute('DELETE FROM trace_events WHERE batch_id = ? AND enterprise_id = ?', [batchId, enterpriseId]);
}

// ── Today Stats ──────────────────────────────────────────────────────────────
export async function getTodayStats(enterpriseId: number): Promise<TodayStats> {
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'recording' THEN 1 ELSE 0 END) as recording,
      SUM(CASE WHEN status IN ('done', 'printed') THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing,
      SUM(CASE WHEN status = 'printed' THEN 1 ELSE 0 END) as printed,
      SUM(weight) as total_weight
     FROM batches WHERE enterprise_id = ? AND created_at >= ?`,
    [enterpriseId, todayStart]
  );
  const r = rows[0] as any;
  return { total: r.total || 0, recording: r.recording || 0, completed: r.completed || 0, preparing: r.preparing || 0, printed: r.printed || 0, total_weight: r.total_weight || 0 };
}

// ── Public Trace (no auth required) ──────────────────────────────────────────
export async function getBatchForPublicTrace(id: string): Promise<Batch | null> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>('SELECT * FROM batches WHERE id = ?', [id]);
  return rows.length ? (rows[0] as Batch) : null;
}

export async function getEventsForPublicTrace(batchId: string): Promise<TraceEvent[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(
    'SELECT * FROM trace_events WHERE batch_id = ? ORDER BY occurred_at ASC', [batchId]
  );
  return rows as TraceEvent[];
}
