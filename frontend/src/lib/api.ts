import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 30_000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('vf_access');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

function retryRequest(config: InternalAxiosRequestConfig, token: string | null) {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return api.request(config);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;
    const refreshToken = localStorage.getItem('vf_refresh');

    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          retryRequest(original, token).then(resolve).catch(reject);
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await axios.post(`${baseURL}/auth/refresh`, {
        refreshToken,
      });

      const newAccess = (data?.data?.accessToken || data?.data?.access_token) as string | undefined;
      const newRefresh = (data?.data?.refreshToken || data?.data?.refresh_token) as string | undefined;

      if (!newAccess) {
        throw new Error('A API não retornou um novo token de acesso.');
      }

      localStorage.setItem('vf_access', newAccess);

      if (newRefresh) {
        localStorage.setItem('vf_refresh', newRefresh);
      }

      queue.forEach((callback) => callback(newAccess));
      queue = [];

      return retryRequest(original, newAccess);
    } catch (refreshError) {
      queue.forEach((callback) => callback(null));
      queue = [];
      clearTokens();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('vf_access', access);
  localStorage.setItem('vf_refresh', refresh);
}

export function clearTokens() {
  localStorage.removeItem('vf_access');
  localStorage.removeItem('vf_refresh');
}

export default api;
