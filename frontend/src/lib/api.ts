import axios, { AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vf_access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('vf_access', access);
  localStorage.setItem('vf_refresh', refresh);
}

export function clearTokens() {
  localStorage.removeItem('vf_access');
  localStorage.removeItem('vf_refresh');
}
