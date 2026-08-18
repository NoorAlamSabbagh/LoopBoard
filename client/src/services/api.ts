import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody, ApiSuccess } from '@/types/api';

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let accessToken = '';
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }

    const message = error.response?.data?.message ?? error.message ?? 'Request failed';
    throw new ApiClientError(message, status ?? 0);
  },
);

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = api
      .post<ApiSuccess<{ accessToken: string }>>('/auth/refresh')
      .then((res) => {
        const token = res.data.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .catch(() => {
        setAccessToken('');
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<ApiSuccess<T>> {
  const res = await promise;
  return res.data;
}
