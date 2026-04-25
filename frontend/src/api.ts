import axios from 'axios';
import type {
  ApiResponse,
  Product,
  Batch,
  BatchQueryParams,
  CreateBatchParams,
  UpdateBatchParams,
  CreateProductParams,
  TodayStats,
  TraceData,
  AuthData,
  RegisterParams,
  LoginParams,
} from './types';

const API_BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 60000,
});

// 请求拦截器：自动附加 JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('authData');
      window.location.href = '/login';
    }
    const msg = err.response?.data?.message || err.message || '请求失败';
    return Promise.reject(new Error(msg));
  }
);

// ── 认证 API ────────────────────────────────────────────────────────────
export const register = (data: RegisterParams) => api.post<any, ApiResponse<AuthData>>('/auth/register', data);
export const login = (data: LoginParams) => api.post<any, ApiResponse<AuthData>>('/auth/login', data);
export const getMe = () => api.get<any, ApiResponse<{ user: AuthData['user']; tenant: AuthData['tenant'] }>>('/auth/me');

export function saveAuthData(data: AuthData): void {
  localStorage.setItem('token', data.token);
  localStorage.setItem('authData', JSON.stringify(data));
}

export function getAuthData(): AuthData | null {
  const raw = localStorage.getItem('authData');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthData;
  } catch {
    return null;
  }
}

export function clearAuthData(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('authData');
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('token');
}

// 产品类型
export const getProducts = () => api.get<any, ApiResponse<Product[]>>('/products');
export const createProduct = (data: CreateProductParams) => api.post<any, ApiResponse<Product>>('/products', data);
export const deleteProduct = (id: number | string) => api.delete<any, ApiResponse<void>>(`/products/${id}`);

// 批次管理
export const getBatches = (params?: BatchQueryParams) => api.get<any, ApiResponse<Batch[]>>('/batches', { params });
export const getBatch = (id: string) => api.get<any, ApiResponse<Batch>>(`/batches/${id}`);
export const createBatch = (data: CreateBatchParams) => api.post<any, ApiResponse<Batch>>('/batches', data);
export const updateBatch = (id: string, data: UpdateBatchParams) => api.put<any, ApiResponse<Batch>>(`/batches/${id}`, data);
export const deleteBatch = (id: string) => api.delete<any, ApiResponse<void>>(`/batches/${id}`);
export const getTodayStats = () => api.get<any, ApiResponse<TodayStats>>('/batches/stats/today');

// 视频上传
export const uploadVideo = (batchId: string, blob: Blob, onProgress?: (percent: number) => void) => {
  const formData = new FormData();
  const ext = blob.type.includes('mp4') ? '.mp4' : '.webm';
  formData.append('video', blob, `recording${ext}`);
  return api.post<any, ApiResponse<{ video_url: string; filename: string; size: number }>>(
    `/batches/${batchId}/video`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    }
  );
};

// 公开溯源
export const getTrace = (id: string) => api.get<any, ApiResponse<TraceData>>(`/trace/${id}`);

export const API_BASE_URL = API_BASE;
