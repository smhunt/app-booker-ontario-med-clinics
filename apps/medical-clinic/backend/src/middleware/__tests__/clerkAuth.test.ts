import { Request, Response, NextFunction } from 'express';
import {
  getPatientFromClerk,
  requirePatientWithInfo,
  extractPatientInfo,
  ClerkPatient,
} from '../clerkAuth';

// Store the mock auth for getAuth to return
let mockAuthState: { userId?: string } | null = null;

// Mock the @clerk/express module
jest.mock('@clerk/express', () => ({
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
  clerkMiddleware: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
  requireAuth: jest.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
  getAuth: jest.fn((_req: Request) => mockAuthState),
}));

// Import the mocked module
import { clerkClient, getAuth } from '@clerk/express';

describe('Clerk Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      clerkPatient: undefined,
    } as Partial<Request>;
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    mockAuthState = null; // Reset auth state
    jest.clearAllMocks();
    // Reset the getAuth mock to use mockAuthState
    (getAuth as jest.Mock).mockImplementation(() => mockAuthState);
  });

  describe('getPatientFromClerk', () => {
    it('should return null when clerkPatient is not set', () => {
      const result = getPatientFromClerk(mockRequest as Request);
      expect(result).toBeNull();
    });

    it('should return the clerkPatient when set', () => {
      const patient: ClerkPatient = {
        clerkUserId: 'user_123',
        email: 'patient@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      mockRequest.clerkPatient = patient;

      const result = getPatientFromClerk(mockRequest as Request);
      expect(result).toEqual(patient);
    });
  });

  describe('requirePatientWithInfo', () => {
    it('should return 401 when auth is not present', () => {
      requirePatientWithInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Patient authentication required. Please sign in.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when userId is missing', () => {
      mockAuthState = {};

      requirePatientWithInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should proceed when userId is present', async () => {
      mockAuthState = { userId: 'user_123' };

      // Mock clerkClient.users.getUser
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'patient@example.com' }],
        phoneNumbers: [{ phoneNumber: '+15551234567' }],
        firstName: 'John',
        lastName: 'Doe',
      });

      requirePatientWithInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockResponse.status).not.toHaveBeenCalledWith(401);
    });
  });

  describe('extractPatientInfo', () => {
    it('should call next when no auth is present', async () => {
      await extractPatientInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.clerkPatient).toBeUndefined();
    });

    it('should call next when auth has no userId', async () => {
      mockAuthState = {};

      await extractPatientInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.clerkPatient).toBeUndefined();
    });

    it('should extract patient info from Clerk user', async () => {
      mockAuthState = { userId: 'user_123' };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'patient@example.com' }],
        phoneNumbers: [{ phoneNumber: '+15551234567' }],
        firstName: 'John',
        lastName: 'Doe',
      });

      await extractPatientInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.clerkPatient).toEqual({
        clerkUserId: 'user_123',
        email: 'patient@example.com',
        phone: '+15551234567',
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle users without email', async () => {
      mockAuthState = { userId: 'user_123' };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_123',
        emailAddresses: [],
        phoneNumbers: [],
        firstName: null,
        lastName: null,
      });

      await extractPatientInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.clerkPatient).toEqual({
        clerkUserId: 'user_123',
        email: undefined,
        phone: undefined,
        firstName: undefined,
        lastName: undefined,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle Clerk API errors gracefully', async () => {
      mockAuthState = { userId: 'user_123' };

      (clerkClient.users.getUser as jest.Mock).mockRejectedValue(
        new Error('Clerk API error')
      );

      await extractPatientInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('edge cases', () => {
    it('should handle undefined emailAddresses array', async () => {
      mockAuthState = { userId: 'user_123' };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_123',
        emailAddresses: undefined,
        phoneNumbers: undefined,
        firstName: 'Test',
        lastName: 'User',
      });

      await extractPatientInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.clerkPatient?.clerkUserId).toBe('user_123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should preserve existing request properties', async () => {
      mockAuthState = { userId: 'user_123' };
      mockRequest.body = { test: 'data' };

      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        phoneNumbers: [],
        firstName: 'Test',
        lastName: 'User',
      });

      await extractPatientInfo(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body).toEqual({ test: 'data' });
      expect(mockRequest.clerkPatient).toBeDefined();
    });
  });
});
