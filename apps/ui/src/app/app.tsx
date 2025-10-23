import { useState, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { WagmiProvider, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { http } from 'viem';
import { createWeb3Modal } from '@web3modal/wagmi/react';
import { walletConnect } from 'wagmi/connectors';
import 'react-toastify/dist/ReactToastify.css';

import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';
import { MessageProvider } from './contexts/MessageContext';
import Layout from './components/Layout';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import { useAuthStore } from './stores/authStore';

const queryClient = new QueryClient();

// Get environment variables
const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';
const dynamicEnvironmentId =
  import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID || 'YOUR_ENVIRONMENT_ID';

// Wagmi configuration for WalletConnect
const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: false,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
  },
});

// Initialize Web3Modal
if (walletConnectProjectId !== 'YOUR_PROJECT_ID') {
  createWeb3Modal({
    wagmiConfig,
    projectId: walletConnectProjectId,
    enableAnalytics: false,
    enableOnramp: false,
  });
}

// Dynamic configuration
const dynamicConfig = {
  environmentId: dynamicEnvironmentId,
  walletConnectors: [EthereumWalletConnectors],
  eventsCallbacks: {
    onAuthFlowOpen: () => {
      console.log('Dynamic auth flow opened');
    },
    onAuthFlowClose: () => {
      console.log('Dynamic auth flow closed');
    },
    onAuthSuccess: (user: any) => {
      console.log('Dynamic auth success:', user);
    },
  },
};

// Inner app component that has access to auth context
function AppContent() {
  const { isAuthenticated, checkSession, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const hasCheckedSession = useRef(false);

  useEffect(() => {
    // Only check session once on mount
    if (!hasCheckedSession.current) {
      hasCheckedSession.current = true;

      const initAuth = async () => {
        try {
          await checkSession();
        } catch (error) {
          console.error('Session check failed:', error);
        } finally {
          setIsLoading(false);
        }
      };

      initAuth();
    }
  }, []); // Empty deps - only run once

  // Debug logging
  useEffect(() => {
    console.log('App State:', {
      isLoading,
      isAuthenticated,
      user: user?.address,
      hasCheckedSession: hasCheckedSession.current,
    });
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-pulse-slow">
          <div className="w-16 h-16 border-4 border-poly-green border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Show warning if environment variables are not set
  if (
    dynamicEnvironmentId === 'YOUR_ENVIRONMENT_ID' &&
    walletConnectProjectId === 'YOUR_PROJECT_ID'
  ) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-lg p-8">
          <h1 className="text-2xl font-bold mb-4 text-red-400">
            ⚠️ Configuration Required
          </h1>
          <p className="mb-6 text-gray-300">
            Please set up your environment variables before using the app.
          </p>
          <div className="space-y-4">
            <div className="bg-gray-900 p-4 rounded">
              <p className="font-mono text-sm mb-2">
                Create a .env.local file in apps/ui/ with:
              </p>
              <pre className="text-xs text-green-400">
                {`VITE_API_URL=http://localhost:3001
VITE_DYNAMIC_ENVIRONMENT_ID=your_dynamic_id
VITE_WALLETCONNECT_PROJECT_ID=your_wc_project_id`}
              </pre>
            </div>
            <div className="text-sm text-gray-400">
              <p>
                • Get Dynamic ID from:{' '}
                <a
                  href="https://app.dynamic.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  app.dynamic.xyz
                </a>
              </p>
              <p>
                • Get WalletConnect ID from:{' '}
                <a
                  href="https://cloud.walletconnect.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  cloud.walletconnect.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>{isAuthenticated && user ? <Dashboard /> : <LoginScreen />}</Layout>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <DynamicContextProvider settings={dynamicConfig}>
          <ThemeProvider>
            <AuthProvider>
              <WalletProvider>
                <MessageProvider>
                  <AppContent />
                  <ToastContainer
                    position="bottom-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="dark"
                    className="z-50"
                  />
                </MessageProvider>
              </WalletProvider>
            </AuthProvider>
          </ThemeProvider>
        </DynamicContextProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;
