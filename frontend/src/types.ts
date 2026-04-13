// ── 产品类型 ────────────────────────────────────────────────────────────────
export interface Product {
  id: number;
  name: string;
  default_shelf_hours: number;
  created_at: number;
}

// ── 批次状态 ────────────────────────────────────────────────────────────────
export type BatchStatus = 'preparing' | 'recording' | 'done' | 'printed';

// ── 批次 ────────────────────────────────────────────────────────────────────
export interface Batch {
  id: string;
  product_name: string;
  product_type_id: number | null;
  operator: string;
  weight: number | null;
  spec: string;
  notes: string;
  status: BatchStatus;
  started_at: number;
  ended_at: number | null;
  production_time: number | null;
  expire_at: number | null;
  video_path: string | null;
  video_url: string | null;
  created_at: number;
  default_shelf_hours?: number | null;
  events?: TraceEvent[];
}

// ── 事件 ────────────────────────────────────────────────────────────────────
export interface TraceEvent {
  id: number;
  batch_id: string;
  event_type: string;
  description: string;
  occurred_at: number;
}

// ── 溯源公开数据 ────────────────────────────────────────────────────────────
export interface TraceData {
  id: string;
  product_name: string;
  operator: string;
  weight: number | null;
  spec: string;
  notes: string;
  status: BatchStatus;
  started_at: number;
  ended_at: number | null;
  production_time: number | null;
  expire_at: number | null;
  is_expired: boolean;
  remaining_seconds: number | null;
  video_url: string | null;
  product_type_name: string | null;
  events: Pick<TraceEvent, 'event_type' | 'description' | 'occurred_at'>[];
  created_at: number;
}

// ── 今日统计 ────────────────────────────────────────────────────────────────
export interface TodayStats {
  total: number;
  recording: number;
  completed: number;
  preparing: number;
  printed: number;
  total_weight: number;
}

// ── API 响应 ────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

// ── 状态配置 ────────────────────────────────────────────────────────────────
export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  dot?: string;
}

// ── 批次列表查询参数 ────────────────────────────────────────────────────────
export interface BatchQueryParams {
  status?: string;
  product_name?: string;
  date?: string;
  page?: number;
  limit?: number;
}

// ── 创建批次参数 ────────────────────────────────────────────────────────────
export interface CreateBatchParams {
  product_name: string;
  product_type_id?: string | number | null;
  operator: string;
  weight?: number | null;
  spec?: string;
  notes?: string;
}

// ── 更新批次参数 ────────────────────────────────────────────────────────────
export interface UpdateBatchParams {
  status?: BatchStatus;
  weight?: number | null;
  spec?: string;
  notes?: string;
  expire_at?: number | null;
  production_time?: number | null;
  product_name?: string;
  operator?: string;
}

// ── 创建产品参数 ────────────────────────────────────────────────────────────
export interface CreateProductParams {
  name: string;
  default_shelf_hours?: number;
}
