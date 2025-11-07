import { useState, useEffect } from 'react';
import { publicApi } from '../lib/api';
import type {
  Provider,
  AppointmentType,
  TimeSlot,
  CreateBookingRequest,
  Booking,
} from '../types';
import { format, addDays } from 'date-fns';
import { DatePicker } from '../components/DatePicker';

type Step = 'provider' | 'datetime' | 'patient' | 'confirm' | 'success';

export function BookAppointment() {
  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('provider');

  // Data
  const [providers, setProviders] = useState<Provider[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Form data
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedAppointmentType, setSelectedAppointmentType] =
    useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [modality, setModality] = useState<'in-person' | 'video' | 'phone'>(
    'in-person'
  );
  const [patientInfo, setPatientInfo] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    smsNumber: '',
    preferredNotification: 'email' as 'email' | 'sms' | 'voice',
  });
  const [reason, setReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingId, setBookingId] = useState('');

  // Patient identification
  const [identifiedEmail, setIdentifiedEmail] = useState('');
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [showIdentifyPrompt, setShowIdentifyPrompt] = useState(false);

  // Load providers and appointment types on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [providersData, appointmentTypesData] = await Promise.all([
          publicApi.getProviders(),
          publicApi.getAppointmentTypes(),
        ]);
        setProviders(providersData);
        setAppointmentTypes(appointmentTypesData);
      } catch (err) {
        setError('Failed to load booking options');
      }
    };
    loadData();

    // Check if patient is identified
    const storedEmail = localStorage.getItem('patientEmail');
    if (storedEmail) {
      setIdentifiedEmail(storedEmail);
      loadPatientBookings(storedEmail);
    } else {
      setShowIdentifyPrompt(true);
    }
  }, []);

  const loadPatientBookings = async (email: string) => {
    try {
      const response = await publicApi.getPatientBookings(email);
      setUpcomingBookings(response.bookings);
    } catch (err) {
      console.error('Failed to load patient bookings', err);
    }
  };

  const handleIdentifyPatient = async (email: string) => {
    if (!email) return;

    localStorage.setItem('patientEmail', email);
    setIdentifiedEmail(email);
    setShowIdentifyPrompt(false);

    // Pre-fill email if available
    setPatientInfo((prev) => ({ ...prev, email }));

    // Load their bookings
    await loadPatientBookings(email);
  };

  // Load availability when provider and date are selected
  useEffect(() => {
    if (selectedProvider && selectedDate) {
      const loadAvailability = async () => {
        setLoading(true);
        try {
          const slots = await publicApi.getAvailability(
            selectedProvider.id,
            selectedDate
          );
          setTimeSlots(slots);
        } catch (err) {
          setError('Failed to load availability');
        } finally {
          setLoading(false);
        }
      };
      loadAvailability();
    }
  }, [selectedProvider, selectedDate]);

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    setCurrentStep('datetime');
  };

  const handleDateTimeSelect = () => {
    if (!selectedDate || !selectedTime || !selectedAppointmentType) {
      setError('Please select date, time, and appointment type');
      return;
    }
    setError('');
    setCurrentStep('patient');
  };

  const handlePatientInfoSubmit = () => {
    if (
      !patientInfo.firstName ||
      !patientInfo.lastName ||
      !patientInfo.dateOfBirth ||
      !patientInfo.email
    ) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setCurrentStep('confirm');
  };

  const handleConfirmBooking = async () => {
    if (!selectedProvider || !selectedAppointmentType) return;

    setLoading(true);
    setError('');

    try {
      const booking: CreateBookingRequest = {
        providerId: selectedProvider.id,
        appointmentTypeId: selectedAppointmentType.id,
        date: selectedDate,
        time: selectedTime,
        modality,
        patientInfo,
        reason: reason || undefined,
      };

      const result = await publicApi.createBooking(booking);
      setBookingId(result.id);
      setCurrentStep('success');
    } catch (err) {
      setError('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('provider');
    setSelectedProvider(null);
    setSelectedAppointmentType(null);
    setSelectedDate('');
    setSelectedTime('');
    setModality('in-person');
    setPatientInfo({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      email: '',
      smsNumber: '',
      preferredNotification: 'email',
    });
    setReason('');
    setBookingId('');
    setError('');
  };

  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    return format(date, 'yyyy-MM-dd');
  });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Book an Appointment
      </h1>

      {/* Patient identification prompt */}
      {showIdentifyPrompt && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Have you booked with us before?
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            Enter your email to see your upcoming appointments and pre-fill your information.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your.email@example.com"
              className="flex-1 px-3 py-2 border border-blue-300 rounded-md text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleIdentifyPatient((e.target as HTMLInputElement).value);
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousSibling as HTMLInputElement;
                handleIdentifyPatient(input.value);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
            >
              Find My Info
            </button>
            <button
              onClick={() => setShowIdentifyPrompt(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Upcoming appointments banner */}
      {identifiedEmail && upcomingBookings.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-green-900 mb-2">
            Your Upcoming Appointments
          </h3>
          <div className="space-y-2">
            {upcomingBookings.slice(0, 2).map((booking) => (
              <div key={booking.id} className="text-sm text-green-800">
                <strong>{format(new Date(booking.date), 'MMMM d, yyyy')}</strong> at{' '}
                {booking.time} - {booking.provider?.name} ({booking.appointmentType?.name})
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { key: 'provider', label: 'Select Provider' },
            { key: 'datetime', label: 'Date & Time' },
            { key: 'patient', label: 'Patient Info' },
            { key: 'confirm', label: 'Confirm' },
          ].map((step, index) => (
            <div key={step.key} className="flex items-center flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  currentStep === step.key
                    ? 'bg-primary-600 text-white'
                    : index <
                      ['provider', 'datetime', 'patient', 'confirm'].indexOf(
                        currentStep
                      )
                    ? 'bg-primary-200 text-primary-700'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index + 1}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">
                {step.label}
              </span>
              {index < 3 && (
                <div className="flex-1 h-1 mx-4 bg-gray-200 rounded"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Provider Selection */}
      {currentStep === 'provider' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Select a Provider</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderSelect(provider)}
                className="text-left p-4 border border-gray-300 rounded-lg hover:border-primary-500 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <h3 className="font-semibold text-lg">{provider.fullName}</h3>
                <p className="text-gray-600 text-sm">{provider.credentials}</p>
                {provider.team && (
                  <p className="text-gray-500 text-sm mt-1">Team {provider.team}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Date & Time Selection */}
      {currentStep === 'datetime' && selectedProvider && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Select Date & Time</h2>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Provider: <strong>{selectedProvider.fullName}</strong>
            </p>
          </div>

          {/* Appointment Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appointment Type *
            </label>
            <select
              value={selectedAppointmentType?.id || ''}
              onChange={(e) => {
                const type = appointmentTypes.find((t) => t.id === e.target.value);
                setSelectedAppointmentType(type || null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Select appointment type</option>
              {appointmentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.duration} min)
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date *
            </label>
            <DatePicker
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              minDaysAhead={1}
              maxDaysAhead={90}
            />
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time *
              </label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="spinner" aria-label="Loading times" />
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={`px-3 py-2 rounded border ${
                        selectedTime === slot.time
                          ? 'bg-primary-600 text-white border-primary-600'
                          : slot.available
                          ? 'bg-white border-gray-300 hover:border-primary-500'
                          : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No available times for this date</p>
              )}
            </div>
          )}

          {/* Modality */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appointment Modality *
            </label>
            <div className="flex gap-4">
              {(['in-person', 'video', 'phone'] as const).map((mod) => (
                <label key={mod} className="flex items-center">
                  <input
                    type="radio"
                    name="modality"
                    value={mod}
                    checked={modality === mod}
                    onChange={(e) =>
                      setModality(e.target.value as typeof modality)
                    }
                    className="mr-2"
                  />
                  <span className="capitalize">{mod}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep('provider')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleDateTimeSelect}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Patient Information */}
      {currentStep === 'patient' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Patient Information</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={patientInfo.firstName}
                  onChange={(e) =>
                    setPatientInfo({ ...patientInfo, firstName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={patientInfo.lastName}
                  onChange={(e) =>
                    setPatientInfo({ ...patientInfo, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date of Birth *
              </label>
              <input
                type="date"
                id="dateOfBirth"
                value={patientInfo.dateOfBirth}
                onChange={(e) =>
                  setPatientInfo({ ...patientInfo, dateOfBirth: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={patientInfo.email}
                onChange={(e) =>
                  setPatientInfo({ ...patientInfo, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label
                htmlFor="smsNumber"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Phone Number (optional)
              </label>
              <input
                type="tel"
                id="smsNumber"
                value={patientInfo.smsNumber}
                onChange={(e) =>
                  setPatientInfo({ ...patientInfo, smsNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+1-555-123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Notification Method *
              </label>
              <div className="flex gap-4">
                {(['email', 'sms', 'voice'] as const).map((method) => (
                  <label key={method} className="flex items-center">
                    <input
                      type="radio"
                      name="preferredNotification"
                      value={method}
                      checked={patientInfo.preferredNotification === method}
                      onChange={(e) =>
                        setPatientInfo({
                          ...patientInfo,
                          preferredNotification: e.target.value as typeof method,
                        })
                      }
                      className="mr-2"
                    />
                    <span className="capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Reason for Visit (optional)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Brief description of your symptoms or reason for booking"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setCurrentStep('datetime')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handlePatientInfoSubmit}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 'confirm' && selectedProvider && selectedAppointmentType && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Confirm Your Booking</h2>

          <div className="space-y-4 mb-6">
            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-900">Provider</h3>
              <p className="text-gray-600">{selectedProvider.fullName}</p>
              <p className="text-gray-500 text-sm">{selectedProvider.credentials}</p>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-900">Appointment</h3>
              <p className="text-gray-600">{selectedAppointmentType.name}</p>
              <p className="text-gray-600">
                {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')} at{' '}
                {selectedTime}
              </p>
              <p className="text-gray-600 capitalize">Modality: {modality}</p>
            </div>

            <div className="border-b pb-4">
              <h3 className="font-semibold text-gray-900">Patient</h3>
              <p className="text-gray-600">
                {patientInfo.firstName} {patientInfo.lastName}
              </p>
              <p className="text-gray-600">{patientInfo.email}</p>
              {patientInfo.smsNumber && (
                <p className="text-gray-600">{patientInfo.smsNumber}</p>
              )}
              <p className="text-gray-600 text-sm capitalize">
                Notifications: {patientInfo.preferredNotification}
              </p>
            </div>

            {reason && (
              <div>
                <h3 className="font-semibold text-gray-900">Reason</h3>
                <p className="text-gray-600">{reason}</p>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This is a demo environment. Your booking will be
              created with synthetic data only. In production, you would receive email
              or SMS confirmation.
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setCurrentStep('patient')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success */}
      {currentStep === 'success' && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Confirmed!
          </h2>
          <p className="text-gray-600 mb-4">
            Your appointment has been booked successfully.
          </p>
          <div className="bg-gray-50 rounded p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Booking ID:</strong> {bookingId}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              You will receive a confirmation notification shortly. Please save your
              booking ID for reference.
            </p>
          </div>
          <button
            onClick={resetForm}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Book Another Appointment
          </button>
        </div>
      )}
    </div>
  );
}
