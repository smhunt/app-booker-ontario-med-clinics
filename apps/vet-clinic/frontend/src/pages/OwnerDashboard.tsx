import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { publicApi } from '../lib/api';
import { useClerkContext, SignIn, SignedIn, SignedOut } from '../contexts/ClerkContext';
import type { Booking } from '../types';

export function OwnerDashboard() {
  const location = useLocation();
  const { isSignedIn, user } = useClerkContext();

  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check for success message from booking
  useEffect(() => {
    if (location.state?.success) {
      setSuccessMessage(location.state.success);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Pre-fill email if signed in
  useEffect(() => {
    if (isSignedIn && user?.emailAddresses?.[0]?.emailAddress) {
      const userEmail = user.emailAddresses[0].emailAddress;
      setEmail(userEmail);
      // Auto-search for signed in users
      handleSearch(userEmail);
    }
  }, [isSignedIn, user]);

  const handleSearch = async (searchEmail?: string) => {
    const emailToSearch = searchEmail || email;
    if (!emailToSearch) return;

    setLoading(true);
    setSearched(true);

    try {
      const result = await publicApi.getOwnerBookings(emailToSearch);
      setBookings(result.bookings);
      setOwnerName(result.owner?.name || '');
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      await publicApi.cancelBooking(bookingId);
      // Refresh bookings
      handleSearch();
    } catch (err) {
      alert('Failed to cancel appointment. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      declined: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Appointments</h1>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Sign in section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <SignedOut>
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Sign in to view your appointments</h2>
            <SignIn
              fallback={
                <p className="text-sm text-gray-500 mb-4">
                  Or search by email below to find your appointments.
                </p>
              }
            />
          </div>
        </SignedOut>

        <SignedIn>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Signed in as</p>
              <p className="font-medium">{user?.emailAddresses?.[0]?.emailAddress}</p>
            </div>
            <Link
              to="/book"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Book New Appointment
            </Link>
          </div>
        </SignedIn>

        {/* Email search for guests */}
        <SignedOut>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-4"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Find Appointments'}
            </button>
          </form>
        </SignedOut>
      </div>

      {/* Bookings list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : searched ? (
        bookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <p className="text-gray-500 mb-4">No appointments found.</p>
            <Link
              to="/book"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Book your first appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {ownerName && (
              <p className="text-gray-600 mb-4">
                Showing appointments for <span className="font-medium">{ownerName}</span>
              </p>
            )}

            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-lg">
                        {booking.pet.name} - {booking.appointmentType.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusBadge(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      {format(new Date(booking.date), 'EEEE, MMMM d, yyyy')} at{' '}
                      {booking.time}
                    </p>
                    <p className="text-sm text-gray-500">
                      With {booking.veterinarian.name} &bull;{' '}
                      <span className="capitalize">{booking.modality}</span>
                    </p>
                    {booking.reason && (
                      <p className="text-sm text-gray-500">
                        Reason: {booking.reason}
                      </p>
                    )}
                  </div>

                  {['pending', 'approved', 'confirmed'].includes(booking.status) && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
