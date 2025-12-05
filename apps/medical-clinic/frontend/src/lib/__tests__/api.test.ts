import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoist mock functions to run before vi.mock
const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

// Import after mock is set up
import { authApi } from '../api';

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('authApi', () => {
    describe('login', () => {
      it('should store token and user on successful login', async () => {
        const mockResponseData = {
          token: 'test-token',
          user: {
            id: '1',
            email: 'test@example.com',
            role: 'admin',
            fullName: 'Test User',
          },
        };

        mockPost.mockResolvedValue({ data: mockResponseData });

        const credentials = { email: 'test@example.com', password: 'password' };
        const result = await authApi.login(credentials);

        expect(result).toEqual(mockResponseData);
        expect(localStorage.getItem('authToken')).toBe('test-token');
        expect(localStorage.getItem('user')).toBe(
          JSON.stringify(mockResponseData.user)
        );
      });
    });

    describe('logout', () => {
      it('should clear token and user from localStorage', () => {
        localStorage.setItem('authToken', 'test-token');
        localStorage.setItem('user', JSON.stringify({ id: '1' }));

        authApi.logout();

        expect(localStorage.getItem('authToken')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
      });
    });

    describe('getCurrentUser', () => {
      it('should return user from localStorage', () => {
        const user = {
          id: '1',
          email: 'test@example.com',
          role: 'admin',
          fullName: 'Test User',
        };
        localStorage.setItem('user', JSON.stringify(user));

        const result = authApi.getCurrentUser();

        expect(result).toEqual(user);
      });

      it('should return null if no user in localStorage', () => {
        const result = authApi.getCurrentUser();
        expect(result).toBeNull();
      });

      it('should return null if localStorage has invalid JSON', () => {
        localStorage.setItem('user', 'invalid-json');
        const result = authApi.getCurrentUser();
        expect(result).toBeNull();
      });
    });
  });
});
