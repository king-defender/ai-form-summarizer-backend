export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface IntegrationSettings {
  id: string;
  name: string;
  type: 'webhook' | 'api' | 'database';
  endpoint: string;
  apiKey?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormSummary {
  id: string;
  title: string;
  summary: string;
  originalForm: any;
  createdAt: string;
  status: 'processing' | 'completed' | 'failed';
}