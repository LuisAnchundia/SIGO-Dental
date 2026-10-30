import axios from 'axios';
import { useAuthStore } from '@/store/auth';

// Cliente HTTP único. El proxy de Vite redirige /api -> backend NestJS.
export const api = axios.create({
  baseURL: '/api',
});

// Adjunta el token JWT en cada petición.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expira o es inválido, cierra sesión.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
