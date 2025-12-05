import React, { createContext, useContext, ReactNode } from 'react';
import {
  ClerkProvider,
  useUser,
  useClerk,
  useAuth,
  SignIn as ClerkSignIn,
  UserButton as ClerkUserButton,
} from '@clerk/clerk-react';

interface ClerkContextValue {
  isAvailable: boolean;
  isSignedIn: boolean;
  isLoaded: boolean;
  user: ReturnType<typeof useUser>['user'] | null;
  openSignIn: () => void;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const ClerkContext = createContext<ClerkContextValue>({
  isAvailable: false,
  isSignedIn: false,
  isLoaded: true,
  user: null,
  openSignIn: () => {},
  signOut: () => Promise.resolve(),
  getToken: () => Promise.resolve(null),
});

// Inner component that uses Clerk hooks
function ClerkInnerProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const { openSignIn, signOut } = useClerk();
  const { getToken } = useAuth();

  return (
    <ClerkContext.Provider
      value={{
        isAvailable: true,
        isSignedIn: isSignedIn ?? false,
        isLoaded,
        user: user ?? null,
        openSignIn,
        signOut,
        getToken,
      }}
    >
      {children}
    </ClerkContext.Provider>
  );
}

// Fallback provider when Clerk isn't available
function ClerkFallbackProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkContext.Provider
      value={{
        isAvailable: false,
        isSignedIn: false,
        isLoaded: true,
        user: null,
        openSignIn: () => console.warn('Clerk not available'),
        signOut: () => Promise.resolve(),
        getToken: () => Promise.resolve(null),
      }}
    >
      {children}
    </ClerkContext.Provider>
  );
}

interface OptionalClerkProviderProps {
  publishableKey: string | undefined;
  children: ReactNode;
}

// Error boundary specifically for Clerk
class ClerkErrorBoundary extends React.Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Clerk error:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function OptionalClerkProvider({ publishableKey, children }: OptionalClerkProviderProps) {
  if (!publishableKey) {
    console.warn('Clerk not configured - running without pet owner auth');
    return <ClerkFallbackProvider>{children}</ClerkFallbackProvider>;
  }

  return (
    <ClerkErrorBoundary fallback={<ClerkFallbackProvider>{children}</ClerkFallbackProvider>}>
      <ClerkProvider
        publishableKey={publishableKey}
        afterSignOutUrl="/"
      >
        <ClerkInnerProvider>{children}</ClerkInnerProvider>
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
}

export function useClerkContext() {
  return useContext(ClerkContext);
}

// Safe wrapper components that gracefully handle Clerk not being available
// These should be used instead of importing directly from @clerk/clerk-react

interface SafeComponentProps {
  children?: ReactNode;
}

/**
 * Safe SignIn component - shows fallback when Clerk is unavailable
 */
export function SignIn(props: React.ComponentProps<typeof ClerkSignIn> & { fallback?: ReactNode }) {
  const { isAvailable } = useClerkContext();

  if (!isAvailable) {
    return props.fallback ? <>{props.fallback}</> : (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          Pet owner sign-in is currently unavailable. You can still book as a guest.
        </p>
      </div>
    );
  }

  return <ClerkSignIn {...props} />;
}

/**
 * Safe SignedIn component - only renders children when Clerk is available AND user is signed in
 */
export function SignedIn({ children }: SafeComponentProps) {
  const { isAvailable, isSignedIn } = useClerkContext();

  if (!isAvailable || !isSignedIn) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Safe SignedOut component - renders children when Clerk unavailable OR user is signed out
 */
export function SignedOut({ children }: SafeComponentProps) {
  const { isAvailable, isSignedIn } = useClerkContext();

  // When Clerk isn't available, treat as "signed out"
  if (!isAvailable || !isSignedIn) {
    return <>{children}</>;
  }

  return null;
}

/**
 * Safe UserButton component - shows nothing when Clerk is unavailable
 */
export function UserButton(props: React.ComponentProps<typeof ClerkUserButton>) {
  const { isAvailable } = useClerkContext();

  if (!isAvailable) {
    return null;
  }

  return <ClerkUserButton {...props} />;
}
