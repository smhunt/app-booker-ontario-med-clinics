import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { authApi } from '../api';

vi.mock('axios');

describe('API Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('authApi', () => {
    describe('login', () => {
      it('should store token and user on successful login', async () => {
        const mockResponse = {
          data: {
            token: 'test-token',
            user: {
              id: '1',
              email: 'test@example.com',
              role: 'admin',
              fullName: 'Test User',
            },
          },
        };

        vi.mocked(axios.create).mockReturnValue({
          post: vi.fn().mockResolvedValue(mockResponse),
        } as any);

        const credentials = { email: 'test@example.com', password: 'password' };
        const result = await authApi.login(credentials);

        expect(result).toEqual(mockResponse.data);
        expect(localStorage.getItem('authToken')).toBe('test-token');
        expect(localStorage.getItem('user')).toBe(
          JSON.stringify(mockResponse.data.user)
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
