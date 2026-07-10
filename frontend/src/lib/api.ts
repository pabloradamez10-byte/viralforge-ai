import axios, { AxiosError } from "axios";

const API_URL = "https://viralforge-ai-production.up.railway.app/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("vf_access");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearTokens();
    }

    return Promise.reject(error);
  }
);

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem("vf_access", access);
  localStorage.setItem("vf_refresh", refresh);
}

export function saveTokens(access: string, refresh: string): void {
  setTokens(access, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem("vf_access");
  localStorage.removeItem("vf_refresh");
}

export default api;
