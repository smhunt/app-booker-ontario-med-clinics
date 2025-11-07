import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Online Appointment Booking
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          Book your medical appointments quickly and easily. Our system is compliant
          with Ontario Health OAB v2.0 standards.
        </p>
        <Link
          to="/book"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Book an Appointment
        </Link>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-primary-600 text-3xl font-bold mb-2">1</div>
            <h3 className="text-lg font-semibold mb-2">Select Provider</h3>
            <p className="text-gray-600">
              Choose from our team of healthcare providers based on your needs.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-primary-600 text-3xl font-bold mb-2">2</div>
            <h3 className="text-lg font-semibold mb-2">Pick a Time</h3>
            <p className="text-gray-600">
              Select an available appointment time that works for your schedule.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-primary-600 text-3xl font-bold mb-2">3</div>
            <h3 className="text-lg font-semibold mb-2">Confirm Booking</h3>
            <p className="text-gray-600">
              Receive confirmation and reminders for your upcoming appointment.
            </p>
          </div>
        </div>
      </section>

      {/* Notice */}
      <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">
          DEMO Environment Notice
        </h3>
        <p className="text-yellow-800">
          This is a demonstration environment using synthetic data only. Do not enter
          real personal health information. For production use, CANADA_PHIPA_READY
          flag must be enabled and all compliance artifacts completed.
        </p>
      </section>

      {/* Accessibility notice */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Accessibility Features
        </h3>
        <p className="text-blue-800 mb-2">
          This system is designed to be accessible to all users:
        </p>
        <ul className="list-disc list-inside text-blue-800 space-y-1">
          <li>WCAG 2.0 Level AA compliant</li>
          <li>Keyboard navigation support</li>
          <li>Screen reader compatible</li>
          <li>High contrast modes available</li>
        </ul>
      </section>
    </div>
  );
}
