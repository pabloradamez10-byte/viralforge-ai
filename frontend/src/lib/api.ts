import axios, { AxiosError } from 'axios';

const baseURL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vf_access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let queue: Array<(t: string | null) => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('vf_refresh');
      if (!refresh) {
        localStorage.removeItem('vf_access');
        return Promise.reject(error);
      }
      if (isRefreshing) {
        return new Promise((resolve) => queue.push((t) => resolve(this.retry(original, t))));
      }
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: refresh });
        const newAccess = (data?.data?.accessToken || data?.data?.access_token) as string;
        const newRefresh = (data?.data?.refreshToken || data?.data?.refresh_token) as string;
        if (newAccess) localStorage.setItem('vf_access', newAccess);
        if (newRefresh) localStorage.setItem('vf_refresh', newRefresh);
        queue.forEach((cb) => cb(newAccess));
        queue = [];
        return this.retry(original, newAccess);
      } catch (e) {
        localStorage.removeItem('vf_access');
        localStorage.removeItem('vf_refresh');
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

(api as any).retry = function (config: any, token: string | null) {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return api.request(config);
};

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('vf_access', access);
  localStorage.setItem('vf_refresh', refresh);
}
export function clearTokens() {
  localStorage.removeItem('vf_access');
  localStorage.removeItem('vf_refresh');
}
