import { useState } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';

interface DisconnectedWalletProps {
  onReconnect: () => void;
}

export default function DisconnectedWallet({ onReconnect }: DisconnectedWalletProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { logout, user } = useAuth();

  const handleLogoutAndReconnect = async () => {
    try {
      setIsLoading(true);
      
      // First logout from backend
      await logout();
      
      // Then prompt to reconnect
      onReconnect();
      
      toast.info('Please reconnect your wallet to continue');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if logout fails, allow reconnection
      onReconnect();
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueWithoutWallet = async () => {
    try {
      setIsLoading(true);
      await logout();
      toast.info('Session cleared. Please login again.');
    } catch (error) {
      console.error('Error clearing session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold">Wallet Disconnected</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your session is active but your wallet is disconnected.
            </p>
          </div>

          {user && (
            <div className="p-3 bg-gray-100 dark:bg-dark-bg rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Active Session</p>
              <p className="font-mono text-sm">
                {user.address.slice(0, 6)}...{user.address.slice(-4)}
              </p>
            </div>
          )}

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              To continue using the application, you need to reconnect your wallet and authenticate again.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleLogoutAndReconnect}
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Reconnect Wallet
            </Button>

            <Button
              onClick={handleContinueWithoutWallet}
              variant="ghost"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Clear Session & Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}