import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { publicApi } from '../lib/api';
import { useClerkContext, SignIn, SignedIn, SignedOut } from '../contexts/ClerkContext';
import { BreedTypeahead } from '../components/BreedTypeahead';
import type { Veterinarian, AppointmentType, TimeSlot } from '../types';

type Step = 'pet' | 'vet' | 'datetime' | 'confirm';

export function BookAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isSignedIn, user } = useClerkContext();

  // Check for pre-selected appointment type from URL
  const preSelectedTypeId = searchParams.get('type');

  const [step, setStep] = useState<Step>('pet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignIn, setShowSignIn] = useState(false);

  // Data from API
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // Form state
  const [ownerInfo, setOwnerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    preferredNotification: 'email' as const,
  });
  const [petInfo, setPetInfo] = useState({
    name: '',
    species: 'dog',
    breed: '',
    sex: '',
  });
  const [selectedVet, setSelectedVet] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [modality, setModality] = useState<'in-person' | 'video' | 'phone'>('in-person');
  const [reason, setReason] = useState('');

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [vets, types] = await Promise.all([
          publicApi.getVeterinarians(),
          publicApi.getAppointmentTypes(),
        ]);
        setVeterinarians(vets);
        setAppointmentTypes(types);

        // Pre-select appointment type from URL if provided
        if (preSelectedTypeId) {
          const matchedType = types.find((t: AppointmentType) => t.id === preSelectedTypeId);
          if (matchedType) {
            setSelectedType(matchedType.id);
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }
    loadData();
  }, [preSelectedTypeId]);

  // Pre-fill owner info if signed in
  useEffect(() => {
    if (isSignedIn && user) {
      setOwnerInfo((prev) => ({
        ...prev,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || prev.name,
        email: user.emailAddresses?.[0]?.emailAddress || prev.email,
        phone: user.phoneNumbers?.[0]?.phoneNumber || prev.phone,
      }));
    }
  }, [isSignedIn, user]);

  // Load availability when vet and date selected
  useEffect(() => {
    if (!selectedVet || !selectedDate) return;

    async function loadAvailability() {
      try {
        const slots = await publicApi.getAvailability(selectedVet, selectedDate);
        setAvailableSlots(slots);
      } catch (err) {
        console.error('Failed to load availability:', err);
      }
    }
    loadAvailability();
  }, [selectedVet, selectedDate]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      await publicApi.createBooking({
        veterinarianId: selectedVet,
        ownerInfo,
        petInfo,
        appointmentTypeId: selectedType,
        date: selectedDate,
        time: selectedTime,
        modality,
        reason,
      });

      navigate('/my-appointments', {
        state: { success: 'Appointment booked successfully!' },
      });
    } catch (err) {
      setError('Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedVetData = veterinarians.find((v) => v.id === selectedVet);
  const selectedTypeData = appointmentTypes.find((t) => t.id === selectedType);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Book an Appointment</h1>

      {/* Progress indicator - sticky on mobile */}
      <div className="flex items-center justify-between mb-4 sm:mb-8 bg-white py-2 -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-14 sm:static z-10">
        {(['pet', 'vet', 'datetime', 'confirm'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                step === s
                  ? 'bg-primary-600 text-white'
                  : i < ['pet', 'vet', 'datetime', 'confirm'].indexOf(step)
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={`w-8 sm:w-16 h-1 mx-1 sm:mx-2 ${
                  i < ['pet', 'vet', 'datetime', 'confirm'].indexOf(step)
                    ? 'bg-primary-200'
                    : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Step 1: Pet & Owner Info */}
        {step === 'pet' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Your Information</h2>

            {/* Clerk Sign In for returning pet owners - collapsible on mobile */}
            <div className="mb-4">
              <SignedOut>
                {!showSignIn ? (
                  <button
                    type="button"
                    onClick={() => setShowSignIn(true)}
                    className="w-full p-3 bg-primary-50 border border-primary-200 rounded-lg text-sm text-primary-700 hover:bg-primary-100 transition-colors flex items-center justify-between"
                  >
                    <span>Have an account? Sign in to use saved info</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ) : (
                  <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-primary-800 font-medium">Sign in</p>
                      <button
                        type="button"
                        onClick={() => setShowSignIn(false)}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        Continue as guest
                      </button>
                    </div>
                    <SignIn
                      fallback={
                        <p className="text-sm text-gray-500">
                          Sign-in unavailable. Continue as guest below.
                        </p>
                      }
                    />
                  </div>
                )}
              </SignedOut>
              <SignedIn>
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800">
                    ✓ Signed in as {user?.emailAddresses?.[0]?.emailAddress}
                  </p>
                </div>
              </SignedIn>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={ownerInfo.name}
                  onChange={(e) =>
                    setOwnerInfo({ ...ownerInfo, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={ownerInfo.email}
                  onChange={(e) =>
                    setOwnerInfo({ ...ownerInfo, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={ownerInfo.phone}
                  onChange={(e) =>
                    setOwnerInfo({ ...ownerInfo, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Contact
                </label>
                <select
                  value={ownerInfo.preferredNotification}
                  onChange={(e) =>
                    setOwnerInfo({
                      ...ownerInfo,
                      preferredNotification: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="voice">Phone Call</option>
                </select>
              </div>
            </div>

            <h3 className="text-lg font-medium mt-6 mb-4">Pet Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Name *
                </label>
                <input
                  type="text"
                  value={petInfo.name}
                  onChange={(e) =>
                    setPetInfo({ ...petInfo, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Species *
                </label>
                <select
                  value={petInfo.species}
                  onChange={(e) =>
                    setPetInfo({ ...petInfo, species: e.target.value, breed: '' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="bird">Bird</option>
                  <option value="rabbit">Rabbit</option>
                  <option value="reptile">Reptile</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Breed
                </label>
                <BreedTypeahead
                  species={petInfo.species}
                  value={petInfo.breed}
                  onChange={(breed) => setPetInfo({ ...petInfo, breed })}
                  placeholder="Start typing to search breeds..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex
                </label>
                <select
                  value={petInfo.sex}
                  onChange={(e) =>
                    setPetInfo({ ...petInfo, sex: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="neutered_male">Neutered Male</option>
                  <option value="spayed_female">Spayed Female</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep('vet')}
                disabled={!ownerInfo.name || !ownerInfo.email || !petInfo.name}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Select Veterinarian
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Vet & Appointment Type */}
        {step === 'vet' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Select Veterinarian & Service</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Veterinarian
              </label>
              <div className="grid grid-cols-1 gap-3">
                {veterinarians.map((vet) => (
                  <label
                    key={vet.id}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedVet === vet.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="veterinarian"
                      value={vet.id}
                      checked={selectedVet === vet.id}
                      onChange={(e) => setSelectedVet(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{vet.displayName || vet.name}</p>
                      <p className="text-sm text-gray-500">{vet.specialty}</p>
                    </div>
                    {vet.acceptsNewClients && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Accepting new clients
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Appointment Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select appointment type...</option>
                {appointmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.duration} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep('pet')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep('datetime')}
                disabled={!selectedVet || !selectedType}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Select Date & Time
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 'datetime' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Select Date & Time</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visit Type
                </label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="in-person">In-Person</option>
                  <option value="video">Video Call</option>
                  <option value="phone">Phone Call</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Times
              </label>
              {availableSlots.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No available slots for this date. Please select another date.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedTime === slot.time
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Visit
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Briefly describe the reason for your visit..."
              />
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep('vet')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep('confirm')}
                disabled={!selectedTime}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Confirm Booking
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Confirm Your Appointment</h2>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Pet:</span>
                <span className="font-medium">
                  {petInfo.name} ({petInfo.species})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Owner:</span>
                <span className="font-medium">{ownerInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Veterinarian:</span>
                <span className="font-medium">
                  {selectedVetData?.displayName || selectedVetData?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="font-medium">{selectedTypeData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time:</span>
                <span className="font-medium">
                  {format(new Date(selectedDate), 'MMMM d, yyyy')} at {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{modality}</span>
              </div>
              {reason && (
                <div>
                  <span className="text-gray-600">Reason:</span>
                  <p className="mt-1 text-sm">{reason}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep('datetime')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
