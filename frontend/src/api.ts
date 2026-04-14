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
  AuthUser,
  Enterprise,
  User,
  UserRole,
} from './types';

const API_BASE = process.env.REACT_APP_API_URL || '';
const TOKEN_KEY = 'token';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 60000,
});

// 请求拦截器 - 添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    const msg = err.response?.data?.message || err.message || '请求失败';
    return Promise.reject(new Error(msg));
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string, enterprise_code?: string) =>
  api.post<any, ApiResponse<{ token: string; user: AuthUser; enterprise: Enterprise }>>('/auth/login', { username, password, enterprise_code });

export const register = (data: { enterprise_name: string; enterprise_code: string; username: string; password: string; real_name?: string; phone?: string }) =>
  api.post<any, ApiResponse<{ token: string; user: AuthUser; enterprise: Enterprise }>>('/auth/register', data);

export const getProfile = () =>
  api.get<any, ApiResponse<{ user: AuthUser; enterprise: Enterprise }>>('/auth/profile');

export const updatePassword = (old_password: string, new_password: string) =>
  api.put<any, ApiResponse<void>>('/auth/password', { old_password, new_password });

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

// ── Enterprises ─────────────────────────────────────────────────────────────
export const getEnterprises = () =>
  api.get<any, ApiResponse<Enterprise[]>>('/enterprises');

export const createEnterprise = (data: { name: string; code: string; contact_person?: string; contact_phone?: string; address?: string; license_no?: string }) =>
  api.post<any, ApiResponse<Enterprise>>('/enterprises', data);

export const updateEnterprise = (id: number, data: Partial<Enterprise>) =>
  api.put<any, ApiResponse<Enterprise>>(`/enterprises/${id}`, data);

export const updateEnterpriseStatus = (id: number, status: number) =>
  api.put<any, ApiResponse<void>>(`/enterprises/${id}/status`, { status });

// ── Users ────────────────────────────────────────────────────────────────────
export const getUsers = (enterprise_id?: number) =>
  api.get<any, ApiResponse<User[]>>('/users', { params: enterprise_id ? { enterprise_id } : undefined });

export const createUser = (data: { username: string; password: string; real_name?: string; phone?: string; role?: UserRole; enterprise_id?: number }) =>
  api.post<any, ApiResponse<User>>('/users', data);

export const updateUser = (id: number, data: Partial<User> & { password?: string }) =>
  api.put<any, ApiResponse<User>>(`/users/${id}`, data);

export const updateUserStatus = (id: number, status: number) =>
  api.put<any, ApiResponse<void>>(`/users/${id}/status`, { status });

export const deleteUser = (id: number) =>
  api.delete<any, ApiResponse<void>>(`/users/${id}`);

// ── Products ─────────────────────────────────────────────────────────────────
export const getProducts = () => api.get<any, ApiResponse<Product[]>>('/products');
export const createProduct = (data: CreateProductParams) => api.post<any, ApiResponse<Product>>('/products', data);
export const deleteProduct = (id: number | string) => api.delete<any, ApiResponse<void>>(`/products/${id}`);

// ── Batches ──────────────────────────────────────────────────────────────────
export const getBatches = (params?: BatchQueryParams) => api.get<any, ApiResponse<Batch[]>>('/batches', { params });
export const getBatch = (id: string) => api.get<any, ApiResponse<Batch>>(`/batches/${id}`);
export const createBatch = (data: CreateBatchParams) => api.post<any, ApiResponse<Batch>>('/batches', data);
export const updateBatch = (id: string, data: UpdateBatchParams) => api.put<any, ApiResponse<Batch>>(`/batches/${id}`, data);
export const deleteBatch = (id: string) => api.delete<any, ApiResponse<void>>(`/batches/${id}`);
export const getTodayStats = () => api.get<any, ApiResponse<TodayStats>>('/batches/stats/today');

// ── Video Upload ─────────────────────────────────────────────────────────────
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

// ── Public Trace ─────────────────────────────────────────────────────────────
export const getTrace = (id: string) => api.get<any, ApiResponse<TraceData>>(`/trace/${id}`);

export const API_BASE_URL = API_BASE;
