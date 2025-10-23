import { useState } from 'react';
import { toast } from 'react-toastify';
import { Shield, X, QrCode } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useAuthStore } from '../stores/authStore';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Input } from './ui/Input';

interface MfaSetupProps {
  onClose: () => void;
}

export default function MfaSetup({ onClose }: MfaSetupProps) {
  const [step, setStep] = useState<'init' | 'verify'>('init');
  const [qrCode, setQrCode] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signMessage } = useWallet();
  const { initializeMfa, enableMfa, user } = useAuthStore();

  const handleInitialize = async () => {
    try {
      setIsLoading(true);
      
      // Sign the enableMFA message
      const signature = await signMessage('enableMFA');
      
      // Initialize MFA setup
      const { qrCode } = await initializeMfa(signature);
      setQrCode(qrCode);
      setStep('verify');
      
      toast.info('Scan the QR code with your authenticator app');
    } catch (error) {
      console.error('MFA initialization error:', error);
      toast.error('Failed to initialize MFA setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsLoading(true);
      
      // Verify and enable MFA
      await enableMfa(verificationCode,);
      
      toast.success('MFA enabled successfully!');
      onClose();
    } catch (error) {
      console.error('MFA verification error:', error);
      toast.error('Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // If MFA is already enabled
  if (user?.mfa) {
    return (
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <Shield className="w-5 h-5 mr-2 text-green-500" />
              MFA Enabled
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Multi-factor authentication is already enabled for your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Setup Multi-Factor Authentication
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'init' ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enhance your account security by enabling two-factor authentication.
              You'll need an authenticator app like Google Authenticator or Authy.
            </p>
            <Button
              onClick={handleInitialize}
              variant="primary"
              loading={isLoading}
              className="w-full"
            >
              Begin Setup
            </Button>
          </>
        ) : (
          <>
            {/* QR Code Display */}
            <div className="flex justify-center p-4 bg-white rounded-lg">
              {qrCode ? (
                <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
                  <QrCode className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                1. Scan the QR code with your authenticator app
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                2. Enter the 6-digit verification code below
              </p>
            </div>

            <Input
              label="Verification Code"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />

            <div className="flex space-x-3">
              <Button
                onClick={() => setStep('init')}
                variant="ghost"
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handleVerify}
                variant="primary"
                loading={isLoading}
                disabled={verificationCode.length !== 6}
                className="flex-1"
              >
                Verify & Enable
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}