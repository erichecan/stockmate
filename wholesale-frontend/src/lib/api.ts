// Updated: 2026-03-17T00:05:00 - P0 闭环: 分离 wholesale API 和 auth API base URL
import axios from 'axios';

const AUTH_BASE = process.env.NEXT_PUBLIC_API_BASE_AUTH || 'http://localhost:3001/api';
const WHOLESALE_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/wholesale';

function addAuthInterceptor(instance: ReturnType<typeof axios.create>) {
  instance.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });
  return instance;
}

const api = addAuthInterceptor(
  axios.create({ baseURL: WHOLESALE_BASE, headers: { 'Content-Type': 'application/json' } }),
);

export const authApi = addAuthInterceptor(
  axios.create({ baseURL: AUTH_BASE, headers: { 'Content-Type': 'application/json' } }),
);

export default api;
