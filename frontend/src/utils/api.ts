import axios, { AxiosResponse } from 'axios';
import { ApiResponse, User, IntegrationSettings, FormSummary } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  register: async (name: string, email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = await api.post('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response: AxiosResponse<ApiResponse<{ token: string }>> = await api.post('/auth/refresh');
    return response.data;
  },
};

export const integrationsApi = {
  getAll: async (): Promise<ApiResponse<IntegrationSettings[]>> => {
    const response: AxiosResponse<ApiResponse<IntegrationSettings[]>> = await api.get('/integrations');
    return response.data;
  },

  create: async (integration: Omit<IntegrationSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<IntegrationSettings>> => {
    const response: AxiosResponse<ApiResponse<IntegrationSettings>> = await api.post('/integrations', integration);
    return response.data;
  },

  update: async (id: string, integration: Partial<IntegrationSettings>): Promise<ApiResponse<IntegrationSettings>> => {
    const response: AxiosResponse<ApiResponse<IntegrationSettings>> = await api.put(`/integrations/${id}`, integration);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response: AxiosResponse<ApiResponse<void>> = await api.delete(`/integrations/${id}`);
    return response.data;
  },

  test: async (id: string): Promise<ApiResponse<{ status: string }>> => {
    const response: AxiosResponse<ApiResponse<{ status: string }>> = await api.post(`/integrations/${id}/test`);
    return response.data;
  },
};

export const formsApi = {
  getSummaries: async (): Promise<ApiResponse<FormSummary[]>> => {
    const response: AxiosResponse<ApiResponse<FormSummary[]>> = await api.get('/forms/summaries');
    return response.data;
  },

  createSummary: async (formData: any): Promise<ApiResponse<FormSummary>> => {
    const response: AxiosResponse<ApiResponse<FormSummary>> = await api.post('/forms/summarize', formData);
    return response.data;
  },

  getSummary: async (id: string): Promise<ApiResponse<FormSummary>> => {
    const response: AxiosResponse<ApiResponse<FormSummary>> = await api.get(`/forms/summaries/${id}`);
    return response.data;
  },
};

export default api;