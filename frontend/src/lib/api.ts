import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

const DEFAULT_PRODUCTION_API_URL =
  'https://viralforge-ai-production.up.railway.app/api/v1';

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV
    ? 'http://localhost:4000/api/v1'
    : DEFAULT_PRODUCTION_API_URL);

const ACCESS_TOKEN_KEY = 'vf_access';
const REFRESH_TOKEN_KEY = 'vf_refresh';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Cliente separado para renovar o token.
 * Não usa os interceptors da instância principal,
 * evitando repetição infinita de requisições.
 */
const refreshClient = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

interface RetriableRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  data?: {
    accessToken?: string;
    refreshToken?: string;
  };
}

let refreshPromise: Promise<string> | null = null;

function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

async function renewAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('Refresh token não encontrado');
  }

  const response = await refreshClient.post<RefreshResponse>(
    '/auth/refresh',
    { refreshToken },
  );

  const newAccessToken = response.data?.data?.accessToken;
  const newRefreshToken =
    response.data?.data?.refreshToken ?? refreshToken;

  if (!newAccessToken) {
    throw new Error(
      'A API não retornou um novo accessToken',
    );
  }

  setTokens(newAccessToken, newRefreshToken);

  return newAccessToken;
}

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as RetriableRequestConfig | undefined;

    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';

    const isAuthRoute =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout');

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthRoute
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = renewAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers.Authorization =
        `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      clearTokens();

      return Promise.reject(refreshError);
    }
  },
);

export function setTokens(
  access: string,
  refresh: string,
): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function saveTokens(
  access: string,
  refresh: string,
): void {
  setTokens(access, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export default api;