import axios from "axios";

const API_URL = "/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vf_access");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("vf_access");
      localStorage.removeItem("vf_refresh");
    }

    return Promise.reject(error);
  }
);

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem("vf_access", access);
  localStorage.setItem("vf_refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("vf_access");
  localStorage.removeItem("vf_refresh");
}
