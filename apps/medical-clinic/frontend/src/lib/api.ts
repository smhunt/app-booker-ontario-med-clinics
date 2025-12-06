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
  FamilyMember,
  PatientAccount,
  CreateFamilyMemberRequest,
  FamilyMemberBooking,
  CreateFamilyMemberBookingRequest,
} from '../types';

// Dynamic API URL: use same host as frontend, but different port
const getApiBaseUrl = () => {
  // If explicitly set via env var, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Otherwise, derive from current window location (supports LAN access)
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8080`;
};

const API_BASE_URL = getApiBaseUrl();

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

// Account API (requires Clerk auth)
// These functions need a getToken function passed in to get the Clerk session token
export const createAccountApi = (getToken: () => Promise<string | null>) => {
  const authenticatedRequest = async <T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: unknown
  ): Promise<T> => {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    switch (method) {
      case 'get':
        return (await api.get<T>(url, config)).data;
      case 'post':
        return (await api.post<T>(url, data, config)).data;
      case 'put':
        return (await api.put<T>(url, data, config)).data;
      case 'delete':
        return (await api.delete<T>(url, { ...config, data })).data;
    }
  };

  return {
    // Family Members
    getFamilyMembers: async (): Promise<{
      account: PatientAccount;
      familyMembers: FamilyMember[];
    }> => {
      return authenticatedRequest('get', '/account/family-members');
    },

    getFamilyMember: async (id: string): Promise<{ familyMember: FamilyMember }> => {
      return authenticatedRequest('get', `/account/family-members/${id}`);
    },

    createFamilyMember: async (
      data: CreateFamilyMemberRequest
    ): Promise<{ familyMember: FamilyMember }> => {
      return authenticatedRequest('post', '/account/family-members', data);
    },

    updateFamilyMember: async (
      id: string,
      data: Partial<CreateFamilyMemberRequest>
    ): Promise<{ familyMember: FamilyMember }> => {
      return authenticatedRequest('put', `/account/family-members/${id}`, data);
    },

    deleteFamilyMember: async (id: string): Promise<{ message: string }> => {
      return authenticatedRequest('delete', `/account/family-members/${id}`);
    },

    // Family Member Bookings
    getBookings: async (params?: {
      familyMemberId?: string;
      status?: string;
      upcoming?: boolean;
    }): Promise<{
      account: { id: string; name: string };
      bookings: FamilyMemberBooking[];
    }> => {
      const queryParams = new URLSearchParams();
      if (params?.familyMemberId) queryParams.set('familyMemberId', params.familyMemberId);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.upcoming) queryParams.set('upcoming', 'true');

      const url = `/account/bookings${queryParams.toString() ? `?${queryParams}` : ''}`;
      return authenticatedRequest('get', url);
    },

    getBooking: async (id: string): Promise<{ booking: FamilyMemberBooking }> => {
      return authenticatedRequest('get', `/account/bookings/${id}`);
    },

    createBooking: async (
      data: CreateFamilyMemberBookingRequest
    ): Promise<{ booking: FamilyMemberBooking }> => {
      return authenticatedRequest('post', '/account/bookings', data);
    },

    cancelBooking: async (
      id: string,
      reason?: string
    ): Promise<{ message: string; booking: { id: string; status: string } }> => {
      return authenticatedRequest('delete', `/account/bookings/${id}`, { reason });
    },
  };
};

export default api;
