import { auth, isFirebaseConfigured } from './firebaseClient';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string;
  isAnonymous: boolean;
  avatarUrl?: string;
}

type AuthListener = (user: AppUser | null) => void;

class AuthService {
  private currentUser: AppUser | null = null;
  private listeners = new Set<AuthListener>();

  constructor() {
    // Default initial guest session for frictionless start
    this.currentUser = {
      uid: 'guest-operator-001',
      email: 'operator@aromaxai.local',
      displayName: 'Hardware Operator',
      isAnonymous: true
    };

    if (isFirebaseConfigured && auth) {
      onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Operator'),
            isAnonymous: user.isAnonymous
          };
        } else {
          // Revert to local guest
          this.currentUser = {
            uid: 'guest-operator-001',
            email: 'operator@aromaxai.local',
            displayName: 'Hardware Operator',
            isAnonymous: true
          };
        }
        this.notify();
      });
    }
  }

  getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) {
      try {
        l(this.currentUser);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    }
  }

  async signInAsGuest(): Promise<{ success: boolean; error?: string }> {
    if (isFirebaseConfigured && auth) {
      try {
        await signInAnonymously(auth);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }
    this.currentUser = {
      uid: `local-${Date.now()}`,
      email: 'guest@aromaxai.local',
      displayName: 'Guest Operator',
      isAnonymous: true
    };
    this.notify();
    return { success: true };
  }

  async signInWithEmail(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
    if (isFirebaseConfigured && auth) {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    // Local authentication fallback if Firebase is not connected yet
    this.currentUser = {
      uid: `user-${Date.now()}`,
      email,
      displayName: email.split('@')[0],
      isAnonymous: false
    };
    this.notify();
    return { success: true };
  }

  async signUpWithEmail(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
    if (isFirebaseConfigured && auth) {
      try {
        await createUserWithEmailAndPassword(auth, email, pass);
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: msg };
      }
    }

    this.currentUser = {
      uid: `user-${Date.now()}`,
      email,
      displayName: email.split('@')[0],
      isAnonymous: false
    };
    this.notify();
    return { success: true };
  }

  async logout(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    this.currentUser = {
      uid: 'guest-operator-001',
      email: 'operator@aromaxai.local',
      displayName: 'Hardware Operator',
      isAnonymous: true
    };
    this.notify();
  }
}

export const authService = new AuthService();
