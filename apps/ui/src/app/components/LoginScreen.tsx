import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Wallet, Shield, LogIn } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import DynamicOTPLogin from './DynamicOTPLogin';
import MfaEntry from './MfaEntry';

type LoginMode = 'choice' | 'dynamic-otp' | 'walletconnect';

export default function LoginScreen() {
  const [loginMode, setLoginMode] = useState<LoginMode>('choice');
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState<boolean>(false);
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

  // Debug loginMode changes
  useEffect(() => {
    console.log('LoginScreen - loginMode changed to:', loginMode);
  }, [loginMode]);

  const { login, checkSession } = useAuth();
  const { address, isConnected, signMessage, connectWalletConnect } =
    useWallet();

  console.log('LoginScreen render:', {
    isConnected,
    address,
    loginMode,
    isLoading,
    mfaRequired,
    hasAttemptedLogin,
  });

  const completeLogin = useCallback(async () => {
    console.log('completeLogin called', {
      address,
      isLoading,
      loginMode,
      hasAttemptedLogin,
    });

    if (!address) {
      console.log('No address available for login');
      return;
    }

    // Prevent multiple login attempts
    if (isLoading || hasAttemptedLogin) {
      console.log('Already processing or attempted login, skipping');
      return;
    }

    try {
      setIsLoading(true);
      setHasAttemptedLogin(true);

      console.log('Completing login for address:', address);

      // Sign the login message
      const signature = await signMessage('login');

      if (!signature) {
        throw new Error('Failed to get signature');
      }

      // Authenticate with backend
      const mfaNeeded = await login(address, signature);

      console.log('mfaNeeded', mfaNeeded);

      if (!mfaNeeded) {
        toast.success('Successfully logged in!');
      } else {
        setMfaRequired(true);
      }
    } catch (error: any) {
      console.error('Login completion error:', error);

      // Don't show error for user rejection
      if (
        !error.message?.includes('reject') &&
        !error.message?.includes('denied')
      ) {
        toast.error(error.message || 'Failed to complete login');
      }

      // Reset to choice screen on error
      setLoginMode('choice');
      setHasAttemptedLogin(false);
    } finally {
      setIsLoading(false);
    }
  }, [address, isLoading, hasAttemptedLogin, signMessage, login]);

  // Auto-complete login when wallet is connected
  useEffect(() => {
    const shouldAutoLogin =
      isConnected &&
      address &&
      (loginMode === 'walletconnect' || loginMode === 'dynamic-otp') &&
      !mfaRequired &&
      !hasAttemptedLogin;

    if (shouldAutoLogin) {
      console.log('Scheduling auto-login', { loginMode, address, isConnected });
      // Add a small delay to ensure wallet is fully ready
      const timer = setTimeout(() => {
        console.log('Executing auto-login');
        completeLogin();
      }, 800);
      return () => {
        console.log('Clearing auto-login timer');
        clearTimeout(timer);
      };
    }
  }, [
    isConnected,
    address,
    loginMode,
    mfaRequired,
    hasAttemptedLogin,
    completeLogin,
  ]);

  const handleDynamicOTPSuccess = async () => {
    // The OTP login was successful, wallet should be connected
    // The useEffect above will handle completing the login
    console.log('Dynamic OTP login successful, wallet connected');
  };

  const handleMfaSuccess = async () => {
    // The MFA was successful
    console.log('MFA login successful');
    await checkSession();
  };

  const handleEmailLogin = () => {
    console.log('Switching to email login mode');
    setHasAttemptedLogin(false);
    // Simply switch to the OTP login mode - no need to call connectDynamic
    setLoginMode('dynamic-otp');
  };

  const handleWalletConnectLogin = async () => {
    try {
      setIsLoading(true);
      setHasAttemptedLogin(false);
      setLoginMode('walletconnect');

      // Call connectWalletConnect first
      connectWalletConnect();

      // Open Web3Modal
      try {
        const { useWeb3Modal } = await import('@web3modal/wagmi/react');
        const { open } = useWeb3Modal();
        await open();
        console.log('Web3Modal opened');
      } catch (err) {
        console.error('Web3Modal error:', err);
        toast.error('WalletConnect is not properly configured.');
        setLoginMode('choice');
        setHasAttemptedLogin(false);
      }
    } catch (error) {
      console.error('WalletConnect login error:', error);
      toast.error('Failed to connect with WalletConnect.');
      setLoginMode('choice');
      setHasAttemptedLogin(false);
    } finally {
      console.log('finally, web3modal');
      setIsLoading(false);
    }
  };

  // Reset mode if disconnected - but give it time to reconnect after modal closes
  useEffect(() => {
    const isActiveLoginMode =
      loginMode === 'walletconnect' || loginMode === 'dynamic-otp';

    if (!isConnected && isActiveLoginMode && hasAttemptedLogin) {
      // Only reset if we've already attempted login and failed
      console.log(
        'Wallet disconnected after login attempt, resetting to choice',
      );
      const resetTimer = setTimeout(() => {
        setLoginMode('choice');
        setHasAttemptedLogin(false);
      }, 1000);
      return () => clearTimeout(resetTimer);
    }
  }, [isConnected, loginMode, hasAttemptedLogin]);

  // Show MFA Flow
  if (mfaRequired) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
        <MfaEntry
          onSuccess={handleMfaSuccess}
          onBack={() => {
            console.log('Going back to login choices from MFA');
            setMfaRequired(false);
            setLoginMode('choice');
            setHasAttemptedLogin(false);
          }}
        />
      </div>
    );
  }

  // Show OTP login flow
  if (loginMode === 'dynamic-otp') {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
        <DynamicOTPLogin
          onSuccess={handleDynamicOTPSuccess}
          onBack={() => {
            console.log('Going back to login choices from OTP');
            setLoginMode('choice');
            setHasAttemptedLogin(false);
          }}
        />
      </div>
    );
  }

  // Show login completion screen if wallet is connected
  if (
    isConnected &&
    address &&
    (loginMode === 'walletconnect' || loginMode === 'dynamic-otp')
  ) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-slide-up">
          <CardContent className="space-y-6 py-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-poly-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-poly-green" />
              </div>
              <h2 className="text-2xl font-bold">Completing Login</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isLoading
                  ? 'Please sign the message in your wallet...'
                  : 'Preparing authentication...'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-gray-100 dark:bg-dark-bg rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Connected Wallet
                </p>
                <p className="font-mono text-sm">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>

              {isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poly-green"></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default: Show login options
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-slide-up">
        <CardContent className="space-y-6 py-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-poly-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-poly-green" />
            </div>
            <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose your preferred login method
            </p>
          </div>

          <div className="space-y-3">
            {import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID !==
              'your_dynamic_environment_id_here' && (
              <>
                <Button
                  onClick={handleEmailLogin}
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  className="w-full"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Login with Email (Dynamic)
                </Button>
              </>
            )}

            {import.meta.env.VITE_WALLETCONNECT_PROJECT_ID !==
              'your_walletconnect_project_id_here' && (
              <>
                <Button
                  onClick={handleWalletConnectLogin}
                  variant="secondary"
                  size="lg"
                  loading={isLoading}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Login with WalletConnect
                </Button>
              </>
            )}
          </div>

          {import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID !==
            'your_dynamic_environment_id_here' && (
            <>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-2 text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Why email login?
                  </p>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li>✓ No wallet setup required</li>
                    <li>✓ Secure Web3 authentication</li>
                    <li>✓ Your email creates a wallet address</li>
                  </ul>
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  By connecting, you agree to sign a message to verify wallet
                  ownership
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
