import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';

export function AdminDashboard() {
  const [stats, setStats] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byProvider: Record<string, number>;
    byModality: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await adminApi.getBookingStats();
        setStats(data);
      } catch (err) {
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" aria-label="Loading dashboard" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/admin/bookings"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Manage Bookings
          </h3>
          <p className="text-gray-600">
            View, approve, and decline appointment requests
          </p>
        </Link>

        <Link
          to="/admin/audit-logs"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Audit Logs
          </h3>
          <p className="text-gray-600">Review system activity and security logs</p>
        </Link>

        <a
          href="http://localhost:8080/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            API Documentation
          </h3>
          <p className="text-gray-600">View Swagger API documentation</p>
        </a>
      </div>

      {/* Statistics */}
      {stats && (
        <>
          {/* Total Bookings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Total Bookings
            </h2>
            <p className="text-4xl font-bold text-primary-600">{stats.total}</p>
          </div>

          {/* Bookings by Status */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Bookings by Status
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600 capitalize">{status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bookings by Provider */}
          {Object.keys(stats.byProvider).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Bookings by Provider
              </h2>
              <div className="space-y-2">
                {Object.entries(stats.byProvider).map(([provider, count]) => (
                  <div key={provider} className="flex justify-between items-center">
                    <span className="text-gray-700">{provider}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bookings by Modality */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Bookings by Modality
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(stats.byModality).map(([modality, count]) => (
                <div key={modality} className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600 capitalize">{modality}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
