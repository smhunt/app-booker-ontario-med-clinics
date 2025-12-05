import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { adminApi } from '../../lib/api';
import type { Booking } from '../../types';

type BookingStatus = 'pending' | 'approved' | 'confirmed' | 'completed' | 'cancelled' | 'declined';

export function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>(
    (searchParams.get('status') as BookingStatus) || 'all'
  );

  useEffect(() => {
    loadBookings();
  }, [statusFilter]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getBookings(
        statusFilter === 'all' ? undefined : { status: statusFilter }
      );
      setBookings(data);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (status: BookingStatus | 'all') => {
    setStatusFilter(status);
    if (status === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  const handleApprove = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await adminApi.approveBooking(bookingId);
      loadBookings();
    } catch (err) {
      alert('Failed to approve booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    if (!confirm('Are you sure you want to decline this booking?')) return;

    setActionLoading(bookingId);
    try {
      await adminApi.declineBooking(bookingId);
      loadBookings();
    } catch (err) {
      alert('Failed to decline booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    setActionLoading(bookingId);
    try {
      await adminApi.cancelBooking(bookingId);
      loadBookings();
    } catch (err) {
      alert('Failed to cancel booking');
    } finally {
      setActionLoading(null);
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

  const statusOptions: Array<{ value: BookingStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All Bookings' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'declined', label: 'Declined' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Manage Bookings</h1>
        <div className="flex items-center gap-4">
          <label htmlFor="status-filter" className="text-sm text-gray-600">
            Filter by status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as BookingStatus | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500">No bookings found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pet / Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Appointment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Veterinarian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{booking.pet.name}</p>
                      <p className="text-sm text-gray-500">
                        {booking.pet.species} • {booking.owner?.name}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-gray-900">{booking.appointmentType.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{booking.modality}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-gray-900">
                        {format(new Date(booking.date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-500">{booking.time}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{booking.veterinarian.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded ${getStatusBadge(
                        booking.status
                      )}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDecline(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {['approved', 'confirmed'].includes(booking.status) && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
