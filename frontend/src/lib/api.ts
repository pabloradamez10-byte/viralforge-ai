import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

const API_URL = "/api/v1";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("vf_access");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("vf_access");
      localStorage.removeItem("vf_refresh");
    }

    return Promise.reject(error);
  }
);

export function saveTokens(access: string, refresh: string): void {
  localStorage.setItem("vf_access", access);
  localStorage.setItem("vf_refresh", refresh);
}

export function clearTokens(): void {
  localStorage.removeItem("vf_access");
  localStorage.removeItem("vf_refresh");
}

export default api;
