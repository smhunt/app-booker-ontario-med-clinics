import { useState, useEffect, useMemo } from 'react';
import { useClerkContext } from '../contexts/ClerkContext';
import { createAccountApi } from '../lib/api';
import type { FamilyMember, FamilyRelationship } from '../types';

interface FamilyMemberSelectorProps {
  selectedMemberId: string | null;
  onSelect: (member: FamilyMember) => void;
  onAddNew?: () => void;
}

const RELATIONSHIP_LABELS: Record<FamilyRelationship, string> = {
  self: 'Myself',
  child: 'Child',
  spouse: 'Spouse',
  parent: 'Parent',
  sibling: 'Sibling',
  grandparent: 'Grandparent',
  guardian: 'Guardian',
  other: 'Other',
};

export function FamilyMemberSelector({
  selectedMemberId,
  onSelect,
  onAddNew,
}: FamilyMemberSelectorProps) {
  const { getToken, isSignedIn, isLoaded } = useClerkContext();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const accountApi = useMemo(() => createAccountApi(getToken), [getToken]);

  // Load family members when signed in
  useEffect(() => {
    if (isSignedIn && isLoaded) {
      loadFamilyMembers();
    }
  }, [isSignedIn, isLoaded]);

  const loadFamilyMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const { familyMembers: members } = await accountApi.getFamilyMembers();
      setFamilyMembers(members);

      // Auto-select "self" if no member is selected and we have members
      if (!selectedMemberId && members.length > 0) {
        const selfMember = members.find((m) => m.relationship === 'self');
        if (selfMember) {
          onSelect(selfMember);
        }
      }
    } catch (err) {
      console.error('Failed to load family members', err);
      setError('Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="spinner" aria-label="Loading..." />
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Don't show selector if not signed in
  }

  if (loading) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-center py-4">
          <div className="spinner" aria-label="Loading family members..." />
          <span className="ml-2 text-gray-600">Loading family members...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-300 rounded-lg p-4 bg-red-50">
        <p className="text-red-800 text-sm">{error}</p>
        <button
          onClick={loadFamilyMembers}
          className="text-red-600 text-sm underline mt-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Who is this appointment for?
      </label>

      {familyMembers.length === 0 ? (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 text-center">
          <p className="text-gray-600 mb-3">
            No family members found. Add yourself to get started.
          </p>
          {onAddNew && (
            <button
              onClick={onAddNew}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              + Add Family Member
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {familyMembers.map((member) => {
              const age = calculateAge(member.dateOfBirth);
              const isSelected = selectedMemberId === member.id;

              return (
                <button
                  key={member.id}
                  onClick={() => onSelect(member)}
                  className={`
                    p-4 text-left border-2 rounded-lg transition-all
                    ${
                      isSelected
                        ? 'border-primary-600 bg-primary-50 shadow-md'
                        : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-lg
                        ${isSelected ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}
                      `}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {member.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {RELATIONSHIP_LABELS[member.relationship]}
                        {member.relationship !== 'self' && ` • ${age} years old`}
                      </div>
                      {member.chronicConditions.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {member.chronicConditions.join(', ')}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="text-primary-600">
                        <svg
                          className="w-6 h-6"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {onAddNew && (
            <button
              onClick={onAddNew}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-all text-sm font-medium"
            >
              + Add another family member
            </button>
          )}
        </>
      )}
    </div>
  );
}

// Component for adding a new family member
interface AddFamilyMemberFormProps {
  onSuccess: (member: FamilyMember) => void;
  onCancel: () => void;
}

export function AddFamilyMemberForm({ onSuccess, onCancel }: AddFamilyMemberFormProps) {
  const { getToken } = useClerkContext();
  const accountApi = useMemo(() => createAccountApi(getToken), [getToken]);

  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    relationship: 'child' as FamilyRelationship,
    gender: 'prefer_not_to_say' as 'male' | 'female' | 'nonbinary' | 'prefer_not_to_say',
    postalCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.dateOfBirth) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { familyMember } = await accountApi.createFamilyMember({
        name: formData.name,
        dateOfBirth: formData.dateOfBirth,
        relationship: formData.relationship,
        gender: formData.gender,
        postalCode: formData.postalCode || undefined,
      });
      onSuccess(familyMember);
    } catch (err) {
      setError('Failed to add family member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <h3 className="font-semibold text-gray-900 mb-4">Add Family Member</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., Emma Smith"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationship *
            </label>
            <select
              value={formData.relationship}
              onChange={(e) =>
                setFormData({ ...formData, relationship: e.target.value as FamilyRelationship })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="self">Myself</option>
              <option value="child">Child</option>
              <option value="spouse">Spouse</option>
              <option value="parent">Parent</option>
              <option value="sibling">Sibling</option>
              <option value="grandparent">Grandparent</option>
              <option value="guardian">Guardian</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gender: e.target.value as typeof formData.gender,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="nonbinary">Non-binary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., N0M 2A0"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Family Member'}
          </button>
        </div>
      </form>
    </div>
  );
}
