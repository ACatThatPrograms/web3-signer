import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { useDynamicContext, useConnectWithOtp } from '@dynamic-labs/sdk-react-core';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { toast } from 'react-toastify';

interface WalletContextType {
  // Wallet state
  address: string | null;
  isConnected: boolean;
  connectionType: 'dynamic' | 'walletconnect' | null;
  
  // Dynamic email auth (using useConnectWithOtp hook)
  email: string;
  setEmail: (email: string) => void;
  otp: string;
  setOtp: (otp: string) => void;
  isEmailLoading: boolean;
  isOtpLoading: boolean;
  sendEmailOTP: () => Promise<void>;
  verifyEmailOTP: () => Promise<void>;
  resendEmailOTP: () => Promise<void>;
  
  // Connection methods
  connectDynamic: () => void;
  connectWalletConnect: () => void;
  
  // Common operations
  signMessage: (message: string) => Promise<string>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectionType, setConnectionType] = useState<'dynamic' | 'walletconnect' | null>(null);
  const [email, setEmail] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  
  // Get contexts - these are stable references
  const dynamicContext = useDynamicContext();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { signMessageAsync: wagmiSignMessage } = useSignMessage();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  
  // Use the Dynamic OTP hook for headless email authentication
  const { 
    connectWithEmail, 
    verifyOneTimePassword
  } = useConnectWithOtp();

  // Separate loading states for better UX
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  // Debug logging
  console.log('WalletContext state:', {
    connectionType,
    email,
    hasConnectWithEmail: !!connectWithEmail,
    hasVerifyOneTimePassword: !!verifyOneTimePassword,
    dynamicPrimaryWallet: dynamicContext.primaryWallet?.address,
    wagmiAddress,
    wagmiConnected
  });

  // Compute address and connection state - memoized for stability
  const address = useMemo(() => {
    if (dynamicContext.primaryWallet?.address) {
      return dynamicContext.primaryWallet.address;
    }
    if (wagmiConnected && wagmiAddress) {
      return wagmiAddress;
    }
    return null;
  }, [dynamicContext.primaryWallet?.address, wagmiConnected, wagmiAddress]);

  const isConnected = useMemo(() => {
    return !!(dynamicContext.primaryWallet || (wagmiConnected && wagmiAddress));
  }, [dynamicContext.primaryWallet, wagmiConnected, wagmiAddress]);

  // Send OTP to email using the headless approach
  const sendEmailOTP = useCallback(async () => {
    console.log('sendEmailOTP called with email:', email);
    
    if (!email || !email.includes('@')) {
      const error = 'Please provide a valid email address';
      console.error(error);
      throw new Error(error);
    }

    if (!connectWithEmail) {
      const error = 'Dynamic email authentication is not available. Please check your Dynamic configuration.';
      console.error(error);
      throw new Error(error);
    }

    try {
      setIsEmailLoading(true);
      console.log('Calling connectWithEmail with:', email);
      
      await connectWithEmail(email);
      
      setConnectionType('dynamic');
      // Clear any existing OTP
      setOtp('');
      
      console.log('OTP sent successfully');
    } catch (error: any) {
      console.error('Failed to send OTP:', error);
      throw new Error(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsEmailLoading(false);
    }
  }, [email, connectWithEmail]);

  // Verify the OTP code
  const verifyEmailOTP = useCallback(async () => {
    console.log('verifyEmailOTP called with OTP:', otp);
    
    if (!otp || otp.length < 6) {
      const error = 'Please enter a valid 6-digit code';
      console.error(error);
      throw new Error(error);
    }

    if (!email) {
      const error = 'No email address set for verification';
      console.error(error);
      throw new Error(error);
    }

    if (!verifyOneTimePassword) {
      const error = 'OTP verification is not available. Please check your Dynamic configuration.';
      console.error(error);
      throw new Error(error);
    }

    try {
      setIsOtpLoading(true);
      console.log('Calling verifyOneTimePassword for email:', email);
      
      await verifyOneTimePassword(otp);
      
      console.log('OTP verified successfully');
      
      // Clear the email and OTP after successful verification
      setEmail('');
      setOtp('');
      
    } catch (error: any) {
      console.error('Failed to verify OTP:', error);
      
      // Check for specific error types
      if (error.message?.includes('expired')) {
        throw new Error('OTP code has expired. Please request a new one.');
      } else if (error.message?.includes('invalid')) {
        throw new Error('Invalid OTP code. Please try again.');
      } else {
        throw new Error(error.message || 'Failed to verify OTP. Please try again.');
      }
    } finally {
      setIsOtpLoading(false);
    }
  }, [otp, email, verifyOneTimePassword]);

  // Resend OTP to the same email
  const resendEmailOTP = useCallback(async () => {
    console.log('resendEmailOTP called for email:', email);
    
    if (!email) {
      const error = 'No email address set for resending OTP';
      console.error(error);
      throw new Error(error);
    }

    if (!connectWithEmail) {
      const error = 'Dynamic email authentication is not available';
      console.error(error);
      throw new Error(error);
    }

    try {
      setIsEmailLoading(true);
      console.log('Resending OTP to:', email);
      
      // Call connectWithEmail again to resend the OTP
      await connectWithEmail(email);
      
      // Clear the OTP field for new entry
      setOtp('');
      
      console.log('OTP resent successfully');
    } catch (error: any) {
      console.error('Failed to resend OTP:', error);
      throw new Error(error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setIsEmailLoading(false);
    }
  }, [email, connectWithEmail]);

  // Connection methods
  const connectDynamic = useCallback(() => {
    console.log('connectDynamic called');
    setConnectionType('dynamic');
    // Dynamic SDK UI or email flow will handle the actual connection
  }, []);

  const connectWalletConnect = useCallback(() => {
    console.log('connectWalletConnect called');
    setConnectionType('walletconnect');
    // Web3Modal will handle the actual connection
  }, []);

  // Sign message with whatever wallet is connected
  const signMessage = useCallback(async (message: string): Promise<string> => {
    // Try Dynamic wallet first
    if (dynamicContext.primaryWallet) {
      console.log('Signing with Dynamic wallet');
      try {
        const signature = await dynamicContext.primaryWallet.signMessage(message);
        if (!signature) throw new Error('No signature returned');
        return signature;
      } catch (error: any) {
        console.error('Dynamic signing error:', error);
        if (error.message?.includes('denied') || error.message?.includes('rejected')) {
          throw new Error('User rejected signature request');
        }
        throw error;
      }
    }
    
    // Try Wagmi wallet
    if (wagmiSignMessage && wagmiAddress) {
      console.log('Signing with Wagmi wallet');
      try {
        const signature = await wagmiSignMessage({ message });
        if (!signature) throw new Error('No signature returned');
        return signature;
      } catch (error: any) {
        console.error('Wagmi signing error:', error);
        if (error.message?.includes('denied') || error.message?.includes('rejected')) {
          throw new Error('User rejected signature request');
        }
        throw error;
      }
    }
    
    throw new Error('No wallet connected for signing');
  }, [dynamicContext.primaryWallet, wagmiSignMessage, wagmiAddress]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      console.log('Disconnecting wallet');
      
      // Disconnect Dynamic
      if (dynamicContext.primaryWallet && dynamicContext.handleLogOut) {
        await dynamicContext.handleLogOut();
      }
      
      // Disconnect Wagmi
      if (wagmiDisconnect) {
        await wagmiDisconnect();
      }
      
      // Clear state
      setConnectionType(null);
      setEmail('');
      setOtp('');
      
      console.log('Wallet disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [dynamicContext.primaryWallet, dynamicContext.handleLogOut, wagmiDisconnect]);

  // Create stable context value
  const value = useMemo<WalletContextType>(() => ({
    // State
    address,
    isConnected,
    connectionType,
    
    // Dynamic email auth
    email,
    setEmail,
    otp,
    setOtp,
    isEmailLoading,
    isOtpLoading,
    sendEmailOTP,
    verifyEmailOTP,
    resendEmailOTP,
    
    // Connection methods
    connectDynamic,
    connectWalletConnect,
    
    // Operations
    signMessage,
    disconnect,
  }), [
    address,
    isConnected,
    connectionType,
    email,
    otp,
    isEmailLoading,
    isOtpLoading,
    sendEmailOTP,
    verifyEmailOTP,
    resendEmailOTP,
    connectDynamic,
    connectWalletConnect,
    signMessage,
    disconnect,
  ]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}