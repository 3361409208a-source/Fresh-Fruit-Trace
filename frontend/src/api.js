import axios from 'axios';

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
export const getProducts = () => api.get('/products');
export const createProduct = (data) => api.post('/products', data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// 批次管理
export const getBatches = (params) => api.get('/batches', { params });
export const getBatch = (id) => api.get(`/batches/${id}`);
export const createBatch = (data) => api.post('/batches', data);
export const updateBatch = (id, data) => api.put(`/batches/${id}`, data);
export const deleteBatch = (id) => api.delete(`/batches/${id}`);
export const getTodayStats = () => api.get('/batches/stats/today');

// 视频上传
export const uploadVideo = (batchId, blob, onProgress) => {
  const formData = new FormData();
  const ext = blob.type.includes('mp4') ? '.mp4' : '.webm';
  formData.append('video', blob, `recording${ext}`);
  return api.post(`/batches/${batchId}/video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,  // 10 minutes for iOS large uploads
    onUploadProgress: (e) => {
      if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });
};

// 公开溯源
export const getTrace = (id) => api.get(`/trace/${id}`);

export const API_BASE_URL = API_BASE;
