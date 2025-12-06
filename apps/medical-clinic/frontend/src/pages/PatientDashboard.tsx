import { useState, useEffect } from 'react';
import { SignedIn, SignedOut, SignIn, UserButton } from '../contexts/ClerkContext';
import { usePatientAuth } from '../contexts/PatientAuthContext';
import { publicApi } from '../lib/api';
import type { Booking } from '../types';
import { format, isPast } from 'date-fns';
import { Link } from 'react-router-dom';

// Helper to parse date string in local timezone
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function PatientDashboard() {
  const { isSignedIn, isLoaded, patient } = usePatientAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn && patient?.email) {
      loadBookings();
    }
  }, [isSignedIn, patient]);

  const loadBookings = async () => {
    if (!patient?.email) return;

    setLoading(true);
    try {
      const response = await publicApi.getPatientBookings(patient.email);
      setBookings(response.bookings);
    } catch (err) {
      setError('Failed to load your appointments');
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await publicApi.cancelBooking(bookingId);
      // Remove from local state
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (err) {
      setError('Failed to cancel appointment. Please try again.');
      console.error('Failed to cancel booking', err);
    } finally {
      setCancellingId(null);
    }
  };

  // Show loading while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="spinner" aria-label="Loading..." />
        </div>
      </div>
    );
  }

  // Separate upcoming and past bookings
  const now = new Date();
  const upcomingBookings = bookings.filter((b) => {
    const bookingDate = parseLocalDate(b.date);
    return !isPast(bookingDate) || format(bookingDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  });
  const pastBookings = bookings.filter((b) => {
    const bookingDate = parseLocalDate(b.date);
    return isPast(bookingDate) && format(bookingDate, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd');
  });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Appointments</h1>

      <SignedOut>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2 text-lg">
            Sign in to view your appointments
          </h3>
          <p className="text-sm text-blue-800 mb-4">
            We'll send you a magic link via email or text - no password needed!
          </p>
          <SignIn
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0 p-0',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                formButtonPrimary: 'bg-primary-600 hover:bg-primary-700',
              },
            }}
          />
        </div>
      </SignedOut>

      <SignedIn>
        {/* User info header */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/my-appointments" />
            <div>
              <p className="font-medium text-gray-900">
                {patient?.fullName || patient?.firstName || 'Patient'}
              </p>
              <p className="text-sm text-gray-600">{patient?.email}</p>
            </div>
          </div>
          <Link
            to="/book"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm"
          >
            Book New Appointment
          </Link>
        </div>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" aria-label="Loading appointments..." />
          </div>
        ) : (
          <>
            {/* Upcoming Appointments */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upcoming Appointments
              </h2>
              {upcomingBookings.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600 mb-4">
                    You have no upcoming appointments.
                  </p>
                  <Link
                    to="/book"
                    className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                  >
                    Book an Appointment
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded ${
                                booking.status === 'confirmed'
                                  ? 'bg-green-100 text-green-800'
                                  : booking.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {booking.status}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">
                              {booking.modality}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900">
                            {booking.appointmentType?.name}
                          </h3>
                          <p className="text-gray-600">
                            {format(parseLocalDate(booking.date), 'EEEE, MMMM d, yyyy')} at{' '}
                            {booking.time}
                          </p>
                          <p className="text-sm text-gray-500">
                            with {booking.provider?.name || 'Provider'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={cancellingId === booking.id}
                            className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
                          >
                            {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Past Appointments */}
            {pastBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Past Appointments
                </h2>
                <div className="space-y-3">
                  {pastBookings.slice(0, 5).map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-700">
                            {booking.appointmentType?.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {format(parseLocalDate(booking.date), 'MMMM d, yyyy')} at{' '}
                            {booking.time} - {booking.provider?.name}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            booking.status === 'completed'
                              ? 'bg-gray-100 text-gray-600'
                              : booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </SignedIn>
    </div>
  );
}
