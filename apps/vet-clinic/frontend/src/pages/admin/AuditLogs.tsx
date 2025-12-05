import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { adminApi } from '../../lib/api';
import type { AuditLog } from '../../types';

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    action: '',
    entityType: '',
  });

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs({
        startDate: filters.startDate,
        endDate: filters.endDate,
        action: filters.action || undefined,
        resource: filters.entityType || undefined,
      });
      setLogs(data.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const getActionBadge = (action: string) => {
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    if (action.includes('update')) return 'bg-blue-100 text-blue-800';
    if (action.includes('delete') || action.includes('cancel')) return 'bg-red-100 text-red-800';
    if (action.includes('login')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const actionOptions = [
    { value: '', label: 'All Actions' },
    { value: 'booking.create', label: 'Booking Created' },
    { value: 'booking.update', label: 'Booking Updated' },
    { value: 'booking.cancel', label: 'Booking Cancelled' },
    { value: 'booking.approve', label: 'Booking Approved' },
    { value: 'booking.decline', label: 'Booking Declined' },
    { value: 'pet.create', label: 'Pet Created' },
    { value: 'pet.update', label: 'Pet Updated' },
    { value: 'owner.create', label: 'Owner Created' },
    { value: 'admin.login', label: 'Admin Login' },
  ];

  const entityTypeOptions = [
    { value: '', label: 'All Entities' },
    { value: 'booking', label: 'Bookings' },
    { value: 'pet', label: 'Pets' },
    { value: 'owner', label: 'Owners' },
    { value: 'veterinarian', label: 'Veterinarians' },
    { value: 'admin', label: 'Admin Users' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>

      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              id="action"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="entityType" className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <select
              id="entityType"
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {entityTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Search
            </button>
          </div>
        </div>
      </form>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-500">No audit logs found for the selected criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm text-gray-900">
                        {format(new Date(log.timestamp), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900 capitalize">{log.resourceType}</p>
                      <p className="text-xs text-gray-500 font-mono">{log.resourceId?.slice(0, 8) || 'N/A'}...</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-900">
                        {log.userId ? log.userId.slice(0, 8) + '...' : 'System'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{log.userRole || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-500 font-mono">{log.ipAddress || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => alert(JSON.stringify(log.details, null, 2))}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">About Audit Logs</h3>
        <p className="text-sm text-blue-700">
          Audit logs track all significant actions in the system including bookings, pet management,
          and administrative activities. Logs are retained according to PIPEDA compliance requirements.
          All personal information in logs is automatically redacted.
        </p>
      </div>
    </div>
  );
}
