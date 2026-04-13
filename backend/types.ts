export interface Product {
  id: number;
  name: string;
  default_shelf_hours: number;
  created_at: number;
}

export type BatchStatus = 'preparing' | 'recording' | 'done' | 'printed';

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
}

export interface TraceEvent {
  id: number;
  batch_id: string;
  event_type: string;
  description: string;
  occurred_at: number;
}

export interface TodayStats {
  total: number;
  recording: number;
  completed: number;
  preparing: number;
  printed: number;
  total_weight: number;
}
