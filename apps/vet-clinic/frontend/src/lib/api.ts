import axios, { AxiosError } from 'axios';
import type {
  Veterinarian,
  Pet,
  AppointmentType,
  TimeSlot,
  Booking,
  CreateBookingRequest,
  CreatePetRequest,
  LoginRequest,
  LoginResponse,
  AuditLog,
  ApiError,
} from '../types';

// Dynamic API URL: use same host as frontend, but different port
const getApiBaseUrl = () => {
  // If explicitly set via env var, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Otherwise, derive from current window location (supports LAN access)
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8081`;
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
  // Get all veterinarians
  getVeterinarians: async (): Promise<Veterinarian[]> => {
    const { data } = await api.get<{ veterinarians: Veterinarian[] }>('/veterinarians');
    return data.veterinarians;
  },

  // Get appointment types
  getAppointmentTypes: async (): Promise<AppointmentType[]> => {
    const { data } = await api.get<{ appointmentTypes: AppointmentType[] }>(
      '/appointment-types'
    );
    return data.appointmentTypes;
  },

  // Get availability for veterinarian on specific date
  getAvailability: async (
    veterinarianId: string,
    date: string
  ): Promise<TimeSlot[]> => {
    const { data } = await api.get<{ slots: TimeSlot[] }>('/availability', {
      params: { veterinarianId, date },
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

  // Get owner bookings by email
  getOwnerBookings: async (email: string): Promise<{ owner: { name: string; email: string }; bookings: Booking[] }> => {
    const { data } = await api.get(`/bookings/owner/${encodeURIComponent(email)}`);
    return data;
  },
};

// Pet Owner API (authenticated via Clerk)
export const ownerApi = {
  // Get my pets
  getMyPets: async (): Promise<{ owner: { id: string; name: string; email: string }; pets: Pet[] }> => {
    const { data } = await api.get('/owner/pets');
    return data;
  },

  // Add a new pet
  addPet: async (pet: CreatePetRequest): Promise<Pet> => {
    const { data } = await api.post<{ pet: Pet }>('/owner/pets', pet);
    return data.pet;
  },

  // Update a pet
  updatePet: async (petId: string, pet: Partial<CreatePetRequest>): Promise<Pet> => {
    const { data } = await api.put<{ pet: Pet }>(`/owner/pets/${petId}`, pet);
    return data.pet;
  },

  // Delete a pet
  deletePet: async (petId: string): Promise<void> => {
    await api.delete(`/owner/pets/${petId}`);
  },

  // Get my bookings
  getMyBookings: async (): Promise<{ owner: { id: string; name: string; email: string }; bookings: Booking[] }> => {
    const { data } = await api.get('/owner/bookings');
    return data;
  },

  // Create a booking for my pet
  createBooking: async (booking: Omit<CreateBookingRequest, 'ownerInfo' | 'petInfo'>): Promise<Booking> => {
    const { data } = await api.post<{ booking: Booking }>('/owner/bookings', booking);
    return data.booking;
  },

  // Cancel a booking
  cancelBooking: async (bookingId: string, reason?: string): Promise<void> => {
    await api.delete(`/owner/bookings/${bookingId}`, { data: { reason } });
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
    veterinarianId?: string;
    petId?: string;
    ownerId?: string;
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
    reason?: string
  ): Promise<Booking> => {
    const { data } = await api.patch<{ booking: Booking }>(
      `/admin/bookings/${bookingId}/decline`,
      { reason }
    );
    return data.booking;
  },

  // Cancel booking (admin)
  cancelBooking: async (bookingId: string, reason?: string): Promise<void> => {
    await api.patch(`/admin/bookings/${bookingId}/decline`, { reason });
  },

  // Complete booking
  completeBooking: async (bookingId: string): Promise<Booking> => {
    const { data } = await api.patch<{ booking: Booking }>(
      `/admin/bookings/${bookingId}/complete`
    );
    return data.booking;
  },

  // Get booking statistics (alias for getReports)
  getBookingStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<{
    summary: {
      totalBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      pendingBookings: number;
      completionRate: number;
      cancellationRate: number;
    };
    byVeterinarian: { veterinarianId: string; veterinarianName: string; count: number }[];
    bySpecies: { species: string; count: number }[];
    byAppointmentType: { appointmentTypeId: string; appointmentTypeName: string; count: number }[];
  }> => {
    const { data } = await api.get('/admin/reports/bookings', { params });
    return data;
  },

  // Get reports (used by Dashboard)
  getReports: async (): Promise<{
    totalBookings: number;
    bookingsByStatus: Record<string, number>;
    bookingsByModality: Record<string, number>;
    bookingsByVeterinarian: Array<{ veterinarian: string; count: number }>;
  }> => {
    const { data } = await api.get('/admin/reports/bookings');
    // Transform the response to match expected format
    const statusCounts: Record<string, number> = {};
    statusCounts.pending = data.summary?.pendingBookings || 0;
    statusCounts.completed = data.summary?.completedBookings || 0;
    statusCounts.cancelled = data.summary?.cancelledBookings || 0;

    return {
      totalBookings: data.summary?.totalBookings || 0,
      bookingsByStatus: statusCounts,
      bookingsByModality: {},
      bookingsByVeterinarian: (data.byVeterinarian || []).map((v: { veterinarianName: string; count: number }) => ({
        veterinarian: v.veterinarianName,
        count: v.count,
      })),
    };
  },

  // Get owner stats (used by Dashboard)
  getOwnerStats: async (): Promise<{
    totalOwners: number;
    totalPets: number;
    petsBySpecies: Record<string, number>;
  }> => {
    const { data } = await api.get('/admin/reports/owners');
    const petsBySpecies: Record<string, number> = {};
    (data.petsBySpecies || []).forEach((p: { species: string; count: number }) => {
      petsBySpecies[p.species] = p.count;
    });
    return {
      totalOwners: data.summary?.totalOwners || 0,
      totalPets: data.summary?.totalPets || 0,
      petsBySpecies,
    };
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
