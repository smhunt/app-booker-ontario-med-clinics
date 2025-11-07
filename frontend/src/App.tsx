import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { BookAppointment } from './pages/BookAppointment';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminBookings } from './pages/admin/Bookings';
import { AdminAuditLogs } from './pages/admin/AuditLogs';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="book" element={<BookAppointment />} />
            <Route path="login" element={<Login />} />

            {/* Admin routes */}
            <Route
              path="admin"
              element={
                <ProtectedRoute requiredRole="staff">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/bookings"
              element={
                <ProtectedRoute requiredRole="staff">
                  <AdminBookings />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/audit-logs"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminAuditLogs />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
