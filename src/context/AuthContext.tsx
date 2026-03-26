import React from 'react';
import {
  User,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { getFirebaseAuthInstance, isFirebaseConfigured } from '../lib/firebase';
import { ensureUserProfileDocument } from '../lib/firestoreStore';

type AuthContextValue = {
  user: User | null;
  isAuthLoading: boolean;
  isFirebaseReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
}

function shouldUseRedirectFlow() {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod/i.test(userAgent);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsAuthLoading(false);
      return;
    }

    const auth = getFirebaseAuthInstance();
    if (!auth) {
      setIsAuthLoading(false);
      return;
    }

    let unsubscribe = () => undefined;

    void setPersistence(auth, browserLocalPersistence)
      .catch(() => undefined)
      .then(async () => {
        try {
          const redirectResult = await getRedirectResult(auth);
          if (redirectResult?.user) {
            await ensureUserProfileDocument(redirectResult.user);
          }
        } catch {
          // Redirect result errors are surfaced by the provider flow itself.
        }
      })
      .finally(() => {
        unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
          setUser(nextUser);

          if (nextUser) {
            try {
              await ensureUserProfileDocument(nextUser);
            } catch {
              // Profile sync is best-effort only.
            }
          }

          setIsAuthLoading(false);
        });
      });

    return () => unsubscribe();
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuthInstance();
    if (!auth) {
      throw new Error('Firebase Auth belum dikonfigurasi.');
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserProfileDocument(credential.user);
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    const auth = getFirebaseAuthInstance();
    if (!auth) {
      throw new Error('Firebase Auth belum dikonfigurasi.');
    }

    const provider = createGoogleProvider();

    if (shouldUseRedirectFlow()) {
      await signInWithRedirect(auth, provider);
      return;
    }

    const credential = await signInWithPopup(auth, provider);
    await ensureUserProfileDocument(credential.user);
  }, []);

  const signUp = React.useCallback(async (name: string, email: string, password: string) => {
    const auth = getFirebaseAuthInstance();
    if (!auth) {
      throw new Error('Firebase Auth belum dikonfigurasi.');
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password);

    if (name.trim()) {
      await updateProfile(credential.user, { displayName: name.trim() });
    }

    await ensureUserProfileDocument(credential.user);
  }, []);

  const signOutUser = React.useCallback(async () => {
    const auth = getFirebaseAuthInstance();
    if (!auth) {
      return;
    }

    await signOut(auth);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthLoading,
      isFirebaseReady: isFirebaseConfigured(),
      signIn,
      signInWithGoogle,
      signUp,
      signOutUser,
    }),
    [user, isAuthLoading, signIn, signInWithGoogle, signUp, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = React.useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  }

  return value;
}
