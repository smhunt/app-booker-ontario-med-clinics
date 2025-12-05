import { useUser, useClerk, useAuth } from '@clerk/clerk-react';

export interface PatientInfo {
  id: string;
  email: string | undefined;
  phone: string | undefined;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
}

export interface PatientAuthState {
  isSignedIn: boolean;
  isLoaded: boolean;
  patient: PatientInfo | null;
  signIn: () => void;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

/**
 * Hook for patient authentication via Clerk
 * Use this for patient-facing features (booking, viewing appointments)
 * Staff/admin auth uses the separate AuthContext with JWT
 */
export function usePatientAuth(): PatientAuthState {
  const { isSignedIn, isLoaded, user } = useUser();
  const { openSignIn, signOut } = useClerk();
  const { getToken } = useAuth();

  return {
    isSignedIn: isSignedIn ?? false,
    isLoaded,
    patient: user
      ? {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          phone: user.primaryPhoneNumber?.phoneNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
        }
      : null,
    signIn: () => openSignIn(),
    signOut: () => signOut(),
    getToken: () => getToken(),
  };
}
