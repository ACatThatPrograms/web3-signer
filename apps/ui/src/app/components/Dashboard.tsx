import { useState } from 'react';
import { toast } from 'react-toastify';
import { FileSignature, Package, History, Shield, AlertTriangle } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../contexts/MessageContext';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Input } from './ui/Input';
import MessageHistory from './MessageHistory';
import MfaSetup from './MfaSetup';
import { cn } from '../lib/utils';

type SigningMode = 'single' | 'batch';

interface SignedMessage {
  message: string;
  signature: string;
  createdAt: Date;
}

export default function Dashboard() {
  const [mode, setMode] = useState<SigningMode>('single');
  const [message, setMessage] = useState('');
  const [batchMessages, setBatchMessages] = useState<SignedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const { address, signMessage, isConnected } = useWallet();
  const { logout, user } = useAuth();
  const { refreshMessages, addOptimisticMessage } = useMessages();
  const dynamicContext = useDynamicContext();

  // Get wallet address from either source
  const walletAddress = address || dynamicContext.primaryWallet?.address;
  const isWalletConnected = isConnected || !!dynamicContext.primaryWallet;

  // Manual logout handler
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // No reload - let App component handle navigation
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // If no wallet connected, show error state (DON'T auto-logout)
  if (!isWalletConnected || !walletAddress) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-bold">Wallet Not Connected</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your session is active but your wallet is disconnected.
            </p>
            
            {user && (
              <div className="p-3 bg-gray-100 dark:bg-dark-bg rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Session Address</p>
                <p className="font-mono text-sm">
                  {user.address.slice(0, 6)}...{user.address.slice(-4)}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Button 
                onClick={handleLogout}
                variant="primary"
                loading={isLoggingOut}
                className="w-full"
              >
                Logout & Reconnect
              </Button>
              <p className="text-xs text-gray-500">
                Click above to logout and reconnect your wallet
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If wrong wallet connected, show error state (DON'T auto-logout)
  if (user && user.address.toLowerCase() !== walletAddress.toLowerCase()) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Wrong Wallet</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The connected wallet doesn't match your session.
            </p>
            
            <div className="space-y-3">
              <div className="p-3 bg-gray-100 dark:bg-dark-bg rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Session Wallet</p>
                <p className="font-mono text-sm">
                  {user.address.slice(0, 6)}...{user.address.slice(-4)}
                </p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-dark-bg rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Connected Wallet</p>
                <p className="font-mono text-sm">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleLogout}
              variant="primary"
              loading={isLoggingOut}
              className="w-full"
            >
              Logout & Use Correct Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSingleSign = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message to sign');
      return;
    }

    try {
      setIsLoading(true);
      
      const signature = await signMessage(message);
      
      const response = await api.post('/verify-signature', {
        message,
        signature,
      });

      if (response.data.isValid) {
        toast.success('Message signed and verified successfully!');
        
        // Add optimistic update and refresh messages
        addOptimisticMessage({
          message,
          signature,
          signer: walletAddress,
          valid: true,
        });
        
        setMessage('');
      } else {
        toast.error('Signature verification failed');
      }
    } catch (error: any) {
      console.error('Single sign error:', error);
      if (!error.message?.includes('reject') && !error.message?.includes('cancel')) {
        toast.error(error.message || 'Failed to sign message');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToBatch = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message to sign');
      return;
    }

    try {
      setIsLoading(true);
      
      const signature = await signMessage(message);
      
      const signedMessage: SignedMessage = {
        message,
        signature,
        createdAt: new Date(),
      };
      
      setBatchMessages([...batchMessages, signedMessage]);
      setMessage('');
      toast.success('Message added to batch');
    } catch (error: any) {
      console.error('Batch add error:', error);
      if (!error.message?.includes('reject') && !error.message?.includes('cancel')) {
        toast.error(error.message || 'Failed to sign message');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateBatch = async () => {
    if (batchMessages.length === 0) {
      toast.error('No messages in batch to validate');
      return;
    }

    try {
      setIsLoading(true);
      
      const batch = batchMessages.map(({ message, signature }) => ({
        message,
        signature,
      }));
      
      const response = await api.post('/verify-signature-multi', batch);

      if (response.data.success) {
        toast.success(`All ${batchMessages.length} messages verified successfully!`);
        
        // Refresh messages to show the new batch in history
        await refreshMessages();
        
        setBatchMessages([]);
      } else {
        toast.error('Batch verification failed');
      }
    } catch (error: any) {
      console.error('Batch validation error:', error);
      toast.error(error.response?.data?.error || 'Failed to validate batch');
    } finally {
      setIsLoading(false);
    }
  };

  const removeBatchMessage = (index: number) => {
    setBatchMessages(batchMessages.filter((_, i) => i !== index));
    toast.info('Message removed from batch');
  };

  // Normal dashboard content
  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg p-1 bg-gray-100 dark:bg-dark-card">
          <button
            onClick={() => setMode('single')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200',
              mode === 'single'
                ? 'bg-poly-green text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <FileSignature className="w-4 h-4 inline mr-2" />
            Single Sign
          </button>
          <button
            onClick={() => setMode('batch')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200',
              mode === 'batch'
                ? 'bg-poly-green text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Batch Sign
          </button>
        </div>
      </div>

      {/* MFA Setup Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowMfaSetup(!showMfaSetup)}
          variant="ghost"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Shield size={16} />
          <span>{showMfaSetup ? 'Hide' : 'Setup'} MFA</span>
        </Button>
      </div>

      {/* MFA Setup Modal */}
      {showMfaSetup && (
        <MfaSetup onClose={() => setShowMfaSetup(false)} />
      )}

      {/* Signing Interface */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center">
            {mode === 'single' ? (
              <>
                <FileSignature className="w-5 h-5 mr-2" />
                Single Message Signing
              </>
            ) : (
              <>
                <Package className="w-5 h-5 mr-2" />
                Batch Message Signing
              </>
            )}
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Message to Sign"
            placeholder="Enter your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                mode === 'single' ? handleSingleSign() : handleAddToBatch();
              }
            }}
          />

          {mode === 'single' ? (
            <Button
              onClick={handleSingleSign}
              variant="primary"
              size="lg"
              loading={isLoading}
              disabled={!message.trim()}
              className="w-full"
            >
              Sign & Verify
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleAddToBatch}
                variant="secondary"
                size="lg"
                loading={isLoading}
                disabled={!message.trim()}
                className="w-full"
              >
                Add Signature to Batch
              </Button>

              {batchMessages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Batch Messages ({batchMessages.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {batchMessages.map((msg, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-bg rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{msg.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {msg.createdAt.toLocaleTimeString()}
                          </p>
                        </div>
                        <button
                          onClick={() => removeBatchMessage(index)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleValidateBatch}
                variant="primary"
                size="lg"
                loading={isLoading}
                disabled={batchMessages.length === 0}
                className="w-full"
              >
                Validate All Signatures ({batchMessages.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center">
            <History className="w-5 h-5 mr-2" />
            Message History
          </h3>
        </CardHeader>
        <CardContent>
          <MessageHistory />
        </CardContent>
      </Card>
    </div>
  );
}