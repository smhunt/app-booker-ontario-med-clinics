import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { publicApi } from '../lib/api';
import type { Veterinarian, AppointmentType } from '../types';

export function Home() {
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [vets, types] = await Promise.all([
          publicApi.getVeterinarians(),
          publicApi.getAppointmentTypes(),
        ]);
        setVeterinarians(vets);
        setAppointmentTypes(types.filter((t) => t.isCommon));
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-r from-primary-50 to-green-50 rounded-2xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Pawsitive Care Veterinary Clinic
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Compassionate care for your beloved pets. Book an appointment online today.
        </p>
        <Link
          to="/book"
          className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Book an Appointment
          <svg
            className="ml-2 w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </section>

      {/* Services Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Services</h2>
        <p className="text-gray-600 mb-4">Click a service to book an appointment</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointmentTypes.map((type) => (
              <Link
                key={type.id}
                to={`/book?type=${type.id}`}
                className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-gray-900 group-hover:text-primary-600">
                    {type.name}
                  </h3>
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {type.description || `${type.duration} minute appointment`}
                </p>
                <p className="text-xs text-primary-600 mt-2 font-medium">
                  {type.duration} minutes • Click to book
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Team Section */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Veterinarians</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {veterinarians.map((vet) => (
              <div
                key={vet.id}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🩺</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {vet.displayName || vet.name}
                    </h3>
                    <p className="text-sm text-primary-600">{vet.specialty}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Languages: {vet.languages.join(', ')}
                  </span>
                  {vet.acceptsNewClients && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Accepting new clients
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Info Section */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Clinic Hours</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Monday - Friday</dt>
                <dd className="font-medium">8:00 AM - 6:00 PM</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Saturday</dt>
                <dd className="font-medium">9:00 AM - 2:00 PM</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Sunday</dt>
                <dd className="font-medium">Closed</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Contact</h3>
            <p className="text-gray-600">
              For emergencies outside clinic hours, please contact your nearest
              24-hour emergency veterinary hospital.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
