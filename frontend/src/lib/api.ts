import axios from 'axios';
import { useAuthStore } from '@/store/auth';

// Cliente HTTP único. En desarrollo el proxy de Vite redirige /api -> backend
// NestJS local. En producción (Vercel) VITE_API_URL apunta al backend real
// desplegado en Render (ej. https://sigo-dental-api.onrender.com/api).
const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({ baseURL });

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
