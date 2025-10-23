import { createContext, useContext, ReactNode } from 'react';
import { Message, useAuthStore, User } from '../stores/authStore';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  messages: Message[];
  mfaRequired: boolean;
  mfaBonusPhrase: string | null;
  login: (address: string, signature: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearSession: () => void;
  verifyMfa: (code: string) => Promise<void>;
  initializeMfa: (signature: string) => Promise<{ qrCode: string }>;
  enableMfa: (code: string) => Promise<void>;
}



const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authStore = useAuthStore();

  return (
    <AuthContext.Provider value={authStore}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}