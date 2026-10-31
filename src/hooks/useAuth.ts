import { useState, useEffect } from 'react';
import { authService, AppUser } from '../services/firebase/authService';

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(authService.getCurrentUser());

  useEffect(() => {
    const unsubscribe = authService.subscribe((u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  return {
    user,
    isAuthenticated: Boolean(user),
    signInAsGuest: () => authService.signInAsGuest(),
    signInWithEmail: (email: string, pass: string) => authService.signInWithEmail(email, pass),
    signUpWithEmail: (email: string, pass: string) => authService.signUpWithEmail(email, pass),
    logout: () => authService.logout()
  };
}
