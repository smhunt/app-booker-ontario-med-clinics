import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import patientBookingsRoutes from '../bookings';

// Mock Clerk middleware
jest.mock('../../../middleware/clerkAuth', () => ({
  requirePatientWithInfo: (req: any, res: any, next: any) => {
    // Simulate authenticated patient
    if (req.headers['x-test-clerk-user']) {
      req.clerkPatient = JSON.parse(req.headers['x-test-clerk-user'] as string);
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  },
  getPatientFromClerk: (req: any) => req.clerkPatient || null,
}));

// Mock BookingService
jest.mock('../../../services/bookingService', () => ({
  BookingService: {
    createBooking: jest.fn(),
    cancelBooking: jest.fn(),
  },
}));

import { BookingService } from '../../../services/bookingService';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPatient = {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const mockBooking = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      patient: mockPatient,
      booking: mockBooking,
    })),
  };
});

const prisma = new PrismaClient();

describe('Patient Bookings Routes', () => {
  let app: express.Application;

  const testClerkUser = {
    clerkUserId: 'clerk_user_123',
    email: 'patient@example.com',
    firstName: 'Test',
    lastName: 'Patient',
  };

  const testPatient = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Test Patient',
    email: 'patient@example.com',
    clerkUserId: 'clerk_user_123',
    dob: new Date('1990-01-01'),
    gender: 'unknown',
    fakeMrn: 'TEST-1234',
    postalCode: 'N0M 2A0',
    rostered: false,
    consentNotifications: true,
    canReceiveSms: true,
    notificationChannel: 'email',
    languages: ['en'],
    chronicConditions: [],
  };

  const testProvider = {
    id: '22222222-2222-2222-2222-222222222222',
    displayName: 'Dr. Test Provider',
  };

  const testAppointmentType = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Follow-up',
    duration: 15,
  };

  const testBooking = {
    id: '44444444-4444-4444-4444-444444444444',
    date: new Date('2025-01-15'),
    time: '10:00',
    modality: 'in-person',
    status: 'confirmed',
    reason: 'Test reason',
    provider: testProvider,
    patient: testPatient,
    appointmentType: testAppointmentType,
    createdAt: new Date(),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/patient', patientBookingsRoutes);
    jest.clearAllMocks();
  });

  describe('GET /patient/bookings', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/patient/bookings');
      expect(response.status).toBe(401);
    });

    it('should return empty array when patient not found', async () => {
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser));

      expect(response.status).toBe(200);
      expect(response.body.bookings).toEqual([]);
    });

    it('should return bookings for authenticated patient', async () => {
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(testPatient);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([testBooking]);

      const response = await request(app)
        .get('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser));

      expect(response.status).toBe(200);
      expect(response.body.bookings).toHaveLength(1);
      expect(response.body.bookings[0].id).toBe(testBooking.id);
    });

    it('should find patient by clerkUserId or email', async () => {
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(testPatient);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser));

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { clerkUserId: testClerkUser.clerkUserId },
            { email: testClerkUser.email },
          ],
        },
      });
    });
  });

  describe('POST /patient/bookings', () => {
    const validBookingData = {
      providerId: '22222222-2222-2222-2222-222222222222',
      appointmentTypeId: '33333333-3333-3333-3333-333333333333',
      date: '2025-01-15',
      time: '10:00',
      modality: 'in-person',
      reason: 'Test reason',
      patientInfo: {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: '1990-01-01',
        email: 'patient@example.com',
        smsNumber: '+15551234567',
        preferredNotification: 'email',
      },
    };

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/patient/bookings')
        .send(validBookingData);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid booking data', async () => {
      const response = await request(app)
        .post('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser))
        .send({ providerId: 'not-a-uuid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid booking data');
    });

    it('should create booking for new patient', async () => {
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.patient.create as jest.Mock).mockResolvedValue(testPatient);
      (BookingService.createBooking as jest.Mock).mockResolvedValue({
        ...testBooking,
        providerId: validBookingData.providerId,
        patientId: testPatient.id,
      });

      const response = await request(app)
        .post('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser))
        .send(validBookingData);

      expect(response.status).toBe(201);
      expect(response.body.booking).toBeDefined();
      expect(prisma.patient.create).toHaveBeenCalled();
    });

    it('should link existing patient to Clerk user', async () => {
      const existingPatient = { ...testPatient, clerkUserId: null };
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(existingPatient);
      (prisma.patient.update as jest.Mock).mockResolvedValue({
        ...existingPatient,
        clerkUserId: testClerkUser.clerkUserId,
      });
      (BookingService.createBooking as jest.Mock).mockResolvedValue(testBooking);

      const response = await request(app)
        .post('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser))
        .send(validBookingData);

      expect(response.status).toBe(201);
      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: existingPatient.id },
        data: { clerkUserId: testClerkUser.clerkUserId },
      });
    });

    it('should use existing patient with clerkUserId', async () => {
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(testPatient);
      (BookingService.createBooking as jest.Mock).mockResolvedValue(testBooking);

      const response = await request(app)
        .post('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser))
        .send(validBookingData);

      expect(response.status).toBe(201);
      expect(prisma.patient.create).not.toHaveBeenCalled();
      expect(prisma.patient.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /patient/bookings/:id', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await request(app).delete('/patient/bookings/booking_123');
      expect(response.status).toBe(401);
    });

    it('should return 404 when booking not found', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .delete('/patient/bookings/nonexistent_booking')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser));

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Booking not found');
    });

    it('should return 403 when patient does not own booking', async () => {
      const otherPatient = { ...testPatient, clerkUserId: 'other_clerk_user', email: 'other@example.com' };
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...testBooking,
        patient: otherPatient,
      });

      const response = await request(app)
        .delete('/patient/bookings/booking_123')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser));

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Not authorized to cancel this booking');
    });

    it('should cancel booking owned by clerkUserId', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...testBooking,
        patient: testPatient,
      });
      (BookingService.cancelBooking as jest.Mock).mockResolvedValue({
        ...testBooking,
        status: 'cancelled',
      });

      const response = await request(app)
        .delete('/patient/bookings/booking_123')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser));

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Booking cancelled successfully');
    });

    it('should cancel booking matched by email', async () => {
      const patientWithoutClerkId = { ...testPatient, clerkUserId: null };
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...testBooking,
        patient: patientWithoutClerkId,
      });
      (BookingService.cancelBooking as jest.Mock).mockResolvedValue({
        ...testBooking,
        status: 'cancelled',
      });

      const response = await request(app)
        .delete('/patient/bookings/booking_123')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser));

      expect(response.status).toBe(200);
    });

    it('should pass cancellation reason to service', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        ...testBooking,
        patient: testPatient,
      });
      (BookingService.cancelBooking as jest.Mock).mockResolvedValue({
        ...testBooking,
        status: 'cancelled',
      });

      await request(app)
        .delete('/patient/bookings/booking_123')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser))
        .send({ reason: 'Changed my mind' });

      expect(BookingService.cancelBooking).toHaveBeenCalledWith(
        'booking_123',
        'Changed my mind'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing email in Clerk user', async () => {
      const userWithoutEmail = { ...testClerkUser, email: undefined };

      const response = await request(app)
        .get('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(userWithoutEmail));

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Patient email not found');
    });

    it('should handle database errors gracefully', async () => {
      (prisma.patient.findFirst as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser));

      expect(response.status).toBe(500);
    });

    it('should handle booking service errors', async () => {
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(testPatient);
      (BookingService.createBooking as jest.Mock).mockRejectedValue(
        new Error('Service Error')
      );

      const response = await request(app)
        .post('/patient/bookings')
        .set('x-test-clerk-user', JSON.stringify(testClerkUser))
        .send({
          providerId: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
          appointmentTypeId: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
          date: '2025-01-15',
          time: '10:00',
          modality: 'in-person',
          patientInfo: {
            firstName: 'Test',
            lastName: 'Patient',
            dateOfBirth: '1990-01-01',
            email: 'patient@example.com',
            preferredNotification: 'email',
          },
        });

      expect(response.status).toBe(500);
    });
  });
});
