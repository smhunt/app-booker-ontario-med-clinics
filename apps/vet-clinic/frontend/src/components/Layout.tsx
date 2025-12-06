import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserButton, SignedIn, SignedOut } from '../contexts/ClerkContext';

export function Layout() {
  const { isAuthenticated, logout, user, hasRole } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and main nav */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-2xl">🐾</span>
                <span className="text-xl font-semibold text-primary-700">
                  Pawsitive Care
                </span>
              </Link>

              <div className="hidden md:flex ml-10 space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/book"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/book')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Book Appointment
                </Link>
                <Link
                  to="/my-appointments"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/my-appointments')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  My Appointments
                </Link>
              </div>
            </div>

            {/* Auth section */}
            <div className="flex items-center space-x-4">
              {/* Admin link for authenticated staff */}
              {isAuthenticated && hasRole('staff') && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Admin
                </Link>
              )}

              {/* Staff/Admin auth */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {user?.name}
                  </span>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Staff Login
                </Link>
              )}

              {/* Pet Owner auth via Clerk */}
              <div className="border-l pl-4">
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
                <SignedOut>
                  <Link
                    to="/my-appointments"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Owner Sign In
                  </Link>
                </SignedOut>
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500">
                Pawsitive Care Veterinary Clinic - Demo
              </p>
              <p className="text-xs text-gray-400 mt-1">
                All data is fictional. PIPEDA compliant.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link
                to="/about"
                className="text-gray-500 hover:text-primary-600 transition-colors"
              >
                About &amp; Roadmap
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">
                Built by <span className="font-medium text-gray-600">Ecoworks</span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
