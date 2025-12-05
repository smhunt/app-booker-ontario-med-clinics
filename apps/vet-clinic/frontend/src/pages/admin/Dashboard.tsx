import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';

interface Stats {
  totalBookings: number;
  bookingsByStatus: Record<string, number>;
  bookingsByModality: Record<string, number>;
  bookingsByVeterinarian: Array<{ veterinarian: string; count: number }>;
  totalOwners: number;
  totalPets: number;
  petsBySpecies: Record<string, number>;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        const [bookingStats, ownerStats] = await Promise.all([
          adminApi.getReports(),
          adminApi.getOwnerStats(),
        ]);
        setStats({
          ...bookingStats,
          ...ownerStats,
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex gap-4">
          <Link
            to="/admin/bookings"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Manage Bookings
          </Link>
          <Link
            to="/admin/audit-logs"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            View Audit Logs
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalBookings || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Owners</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalOwners || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Total Pets</p>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalPets || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">Pending Approvals</p>
          <p className="text-3xl font-bold text-yellow-600">
            {stats?.bookingsByStatus?.pending || 0}
          </p>
        </div>
      </div>

      {/* Booking Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Bookings by Status</h2>
          <div className="space-y-3">
            {stats?.bookingsByStatus &&
              Object.entries(stats.bookingsByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="capitalize text-gray-600">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Bookings by Modality</h2>
          <div className="space-y-3">
            {stats?.bookingsByModality &&
              Object.entries(stats.bookingsByModality).map(([modality, count]) => (
                <div key={modality} className="flex justify-between items-center">
                  <span className="capitalize text-gray-600">{modality}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Pets by Species */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Pets by Species</h2>
          <div className="space-y-3">
            {stats?.petsBySpecies &&
              Object.entries(stats.petsBySpecies).map(([species, count]) => (
                <div key={species} className="flex justify-between items-center">
                  <span className="capitalize text-gray-600">{species}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Bookings by Veterinarian</h2>
          <div className="space-y-3">
            {stats?.bookingsByVeterinarian?.slice(0, 6).map((item) => (
              <div key={item.veterinarian} className="flex justify-between items-center">
                <span className="text-gray-600 truncate">{item.veterinarian}</span>
                <span className="font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin/bookings?status=pending"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <p className="font-medium text-gray-900">Review Pending</p>
            <p className="text-sm text-gray-500">
              {stats?.bookingsByStatus?.pending || 0} awaiting approval
            </p>
          </Link>
          <Link
            to="/admin/bookings?status=confirmed"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <p className="font-medium text-gray-900">Today's Appointments</p>
            <p className="text-sm text-gray-500">View confirmed bookings</p>
          </Link>
          <Link
            to="/admin/audit-logs"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
          >
            <p className="font-medium text-gray-900">Audit Trail</p>
            <p className="text-sm text-gray-500">Review system activity</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
