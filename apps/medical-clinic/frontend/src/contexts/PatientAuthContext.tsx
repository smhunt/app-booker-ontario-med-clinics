import { useClerkContext } from './ClerkContext';

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
  clerkAvailable: boolean;
}

/**
 * Hook for patient authentication via Clerk
 * Use this for patient-facing features (booking, viewing appointments)
 * Staff/admin auth uses the separate AuthContext with JWT
 * Returns safe defaults when Clerk is not available
 */
export function usePatientAuth(): PatientAuthState {
  const { isAvailable, isSignedIn, isLoaded, user, openSignIn, signOut, getToken } = useClerkContext();

  if (!isAvailable) {
    return {
      isSignedIn: false,
      isLoaded: true,
      patient: null,
      signIn: () => console.warn('Clerk not available'),
      signOut: () => Promise.resolve(),
      getToken: () => Promise.resolve(null),
      clerkAvailable: false,
    };
  }

  return {
    isSignedIn,
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
    clerkAvailable: true,
  };
}
