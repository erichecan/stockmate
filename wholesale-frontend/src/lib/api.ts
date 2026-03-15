// Updated: 2026-03-14T19:52:00 - 批发站: axios 实例，统一指向 /api/wholesale/*，附带前端 token
import axios from 'axios';

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:3001/api/wholesale',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 在每次请求前附加 accessToken（如果存在）
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
