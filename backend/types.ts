export interface Enterprise {
  id: number;
  name: string;
  code: string;
  contact_person: string | null;
  contact_phone: string | null;
  address: string | null;
  license_no: string | null;
  logo_url: string | null;
  status: number;
  created_at: number;
  updated_at: number;
}

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'operator';

export interface User {
  id: number;
  enterprise_id: number;
  username: string;
  password_hash: string;
  real_name: string | null;
  phone: string | null;
  role: UserRole;
  status: number;
  last_login_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface Product {
  id: number;
  enterprise_id: number;
  name: string;
  default_shelf_hours: number;
  created_at: number;
}

export type BatchStatus = 'preparing' | 'recording' | 'done' | 'printed';

export interface Batch {
  id: string;
  enterprise_id: number;
  product_name: string;
  product_type_id: number | null;
  operator: string;
  weight: number | null;
  spec: string;
  notes: string | null;
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
  batch_id: string;
  enterprise_id: number;
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

export interface JwtPayload {
  userId: number;
  enterpriseId: number;
  role: UserRole;
  username: string;
}
