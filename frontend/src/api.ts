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
} from './types';

const API_BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 60000,
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || err.message || '请求失败';
    return Promise.reject(new Error(msg));
  }
);

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
