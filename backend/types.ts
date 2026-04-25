export interface Tenant {
  id: string;
  name: string;
  contact_name: string;
  contact_phone: string;
  created_at: number;
}

export type UserRole = 'admin' | 'operator';

export interface User {
  id: string;
  tenant_id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  display_name: string;
  created_at: number;
}

export interface Product {
  id: number;
  tenant_id: string;
  name: string;
  default_shelf_hours: number;
  created_at: number;
}

export type BatchStatus = 'preparing' | 'recording' | 'done' | 'printed';

export interface Batch {
  id: string;
  tenant_id: string;
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
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  created_at: number;
}

export interface TraceEvent {
  id: number;
  tenant_id: string;
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
