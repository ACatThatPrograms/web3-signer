import { create } from 'zustand';
import { api } from '../lib/api';

// Type definitions
export interface User {
  id: string;
  address: string;
  role: string;
  mfa: boolean;
  awaiting_mfa: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: number;
  message: string;
  signature: string;
  signer: string;
  valid: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

interface BaseResponse {
  error: string;
  status: number;
  success: boolean;
}

interface AuthResponse extends BaseResponse {
  user?: User;
  messages?: Message[];
  mfa?: boolean;
  mfa_bonus_phrase?: string;
}

export interface AuthStore {
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

export const useAuthStore = create<AuthStore>((set, get) => ({
  isAuthenticated: false,
  user: null,
  messages: [],
  mfaRequired: false,
  mfaBonusPhrase: null,

  // Returns true if MFA is needed
  login: async (address: string, signature: string): Promise<boolean> => {
    try {
      const response = await api.post<AuthResponse>('/auth', {
        message: 'login',
        signature,
        address,
      });

      if (response.data.mfa) {
        set({ 
          mfaRequired: true, 
          mfaBonusPhrase: response.data.mfa_bonus_phrase 
        });
        // Let the component handle the toast
        return true;
      }

      set({
        isAuthenticated: true,
        user: response.data.user,
        messages: response.data.messages || [],
      });

      return false
      
      // Don't show toast here - let the component handle it
    } catch (error: any) {
      // Let the component handle error toasts
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
      set({
        isAuthenticated: false,
        user: null,
        messages: [],
        mfaRequired: false,
        mfaBonusPhrase: null,
      });
      // Don't show toast here - let the component handle it
    } catch (error: any) {
      // Even if backend logout fails, clear local state
      set({
        isAuthenticated: false,
        user: null,
        messages: [],
        mfaRequired: false,
        mfaBonusPhrase: null,
      });
      console.error('Logout error:', error);
    }
  },

  clearSession: () => {
    // Clear local session state without calling backend
    set({
      isAuthenticated: false,
      user: null,
      messages: [],
      mfaRequired: false,
      mfaBonusPhrase: null,
    });
  },

  checkSession: async () => {
    try {
      const response = await api.get<AuthResponse>('/auth');
      const currentState = get();
      
      if (response.data.success && response.data.user) {
        // Only update if not already authenticated or user changed
        if (!currentState.isAuthenticated || currentState.user?.id !== response.data.user.id) {
          set({
            isAuthenticated: true,
            user: response.data.user,
            messages: response.data.messages || [],
          });
        }
      } else {
        // Only update if currently authenticated
        if (currentState.isAuthenticated) {
          set({
            isAuthenticated: false,
            user: null,
            messages: [],
          });
        }
      }
    } catch (error) {
      const currentState = get();
      // Only clear if currently authenticated
      if (currentState.isAuthenticated) {
        set({
          isAuthenticated: false,
          user: null,
          messages: [],
        });
      }
    }
  },

  verifyMfa: async (code: string) => {
    try {
      const { mfaBonusPhrase } = get();
      if (!mfaBonusPhrase) {
        throw new Error('MFA bonus phrase not found');
      }

      const response = await api.post<AuthResponse>('/auth/mfa', {
        mfa_code: code,
        mfa_bonus_phrase: mfaBonusPhrase,
      });

      set({
        isAuthenticated: true,
        user: response.data.user,
        messages: response.data.messages || [],
        mfaRequired: false,
        mfaBonusPhrase: null,
      });

      // Don't show toast here - let the component handle it
    } catch (error: any) {
      throw error;
    }
  },

  initializeMfa: async (signature: string) => {
    try {
      const response = await api.post<{ qrCode: string }>('/auth/mfa/initialize', {
        signature,
        message: "enableMFA"
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  enableMfa: async (code: string) => {
    try {
      await api.post('/auth/mfa/verify', {
        mfa_code: code,
      });
      
      const { user } = get();
      if (user) {
        set({
          user: { ...user, mfa: true },
        });
      }
      
      // Don't show toast here - let the component handle it
    } catch (error: any) {
      throw error;
    }
  },
}));