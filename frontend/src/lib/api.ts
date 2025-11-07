import axios, { AxiosError } from 'axios';
import type {
  Provider,
  AppointmentType,
  TimeSlot,
  Booking,
  CreateBookingRequest,
  LoginRequest,
  LoginResponse,
  AuditLog,
  ApiError,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Public API
export const publicApi = {
  // Get all providers
  getProviders: async (): Promise<Provider[]> => {
    const { data } = await api.get<{ providers: Provider[] }>('/providers');
    return data.providers;
  },

  // Get appointment types
  getAppointmentTypes: async (): Promise<AppointmentType[]> => {
    const { data } = await api.get<{ appointmentTypes: AppointmentType[] }>(
      '/appointment-types'
    );
    return data.appointmentTypes;
  },

  // Get availability for provider on specific date
  getAvailability: async (
    providerId: string,
    date: string
  ): Promise<TimeSlot[]> => {
    const { data } = await api.get<{ slots: TimeSlot[] }>('/availability', {
      params: { providerId, date },
    });
    return data.slots;
  },

  // Create a booking
  createBooking: async (booking: CreateBookingRequest): Promise<Booking> => {
    const { data } = await api.post<{ booking: Booking }>('/bookings', booking);
    return data.booking;
  },

  // Cancel a booking
  cancelBooking: async (bookingId: string): Promise<void> => {
    await api.delete(`/bookings/${bookingId}`);
  },

  // Get patient bookings by email
  getPatientBookings: async (email: string): Promise<{ patient: { name: string; email: string }; bookings: Booking[] }> => {
    const { data } = await api.get(`/bookings/patient/${encodeURIComponent(email)}`);
    return data;
  },
};

// Auth API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);

    // Store token and user
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: (): LoginResponse['user'] | null => {
    const userJson = localStorage.getItem('user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },
};

// Admin API
export const adminApi = {
  // Get all bookings with filters
  getBookings: async (params?: {
    status?: string;
    providerId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Booking[]> => {
    const { data } = await api.get<{ bookings: Booking[] }>(
      '/admin/bookings',
      { params }
    );
    return data.bookings;
  },

  // Approve booking
  approveBooking: async (bookingId: string): Promise<Booking> => {
    const { data } = await api.patch<{ booking: Booking }>(
      `/admin/bookings/${bookingId}/approve`
    );
    return data.booking;
  },

  // Decline booking
  declineBooking: async (
    bookingId: string,
    reason: string
  ): Promise<Booking> => {
    const { data } = await api.patch<{ booking: Booking }>(
      `/admin/bookings/${bookingId}/decline`,
      { reason }
    );
    return data.booking;
  },

  // Get booking statistics
  getBookingStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byProvider: Record<string, number>;
    byModality: Record<string, number>;
  }> => {
    const { data } = await api.get('/admin/reports/bookings', { params });
    return data.stats;
  },

  // Get audit logs
  getAuditLogs: async (params?: {
    action?: string;
    resource?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> => {
    const { data } = await api.get<{ logs: AuditLog[]; total: number }>(
      '/admin/audit-logs',
      { params }
    );
    return data;
  },
};

export default api;
