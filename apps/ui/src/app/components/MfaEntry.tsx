import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Mail, Shield, ArrowLeft, Check } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { useAuth } from '../contexts/AuthContext';

interface DynamicOTPLoginProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function MfaEntry({ onSuccess, onBack }: DynamicOTPLoginProps) {
  const [mfaSuccess, setMfaSuccess] = useState<boolean>(false);
  const [mfaCode, setMfaCode] = useState<string>('');
  const [mfaLoading, setMfaLoading] = useState<boolean>(false);

  const { mfaBonusPhrase, verifyMfa, checkSession } = useAuth(); // If bonus phrase is present, user should be prompted for an additional MFA Code

    console.log({mfaBonusPhrase})

  // Handle successful connection
  useEffect(() => {
    if (mfaSuccess) {
      // Successfully connected after OTP verification
      checkSession()
      onSuccess();
    }
  }, [mfaSuccess, onSuccess]);

  const handleOtpChange = (value: string) => {
    const formattedValue = value.replace(/\D/g, '').slice(0, 6);
    setMfaCode(formattedValue);
  
    // Auto-submit when 6 digits are entered
    if (formattedValue.length === 6) {
      handleVerifyOTP(formattedValue); // ✅ Pass the value directly
    }
  };
  
  const handleVerifyOTP = async (codeToVerify?: string) => {
    const code = codeToVerify || mfaCode; // Use passed value or state
    
    if (code.length !== 6) {
      console.log(code)
      console.log('hit', code.length)
      toast.error('Please enter a valid 6-digit code');
      return;
    }
  
    try {
      console.log({mfaCode: code, mfaBonusPhrase})
      setMfaLoading(true);
      let response = (await verifyMfa(code)); // Use the code parameter
      setMfaLoading(false);
        console.log(response)
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Invalid verification code');
      setMfaLoading(false);
      setMfaCode('');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="animate-slide-up">
        <CardContent className="space-y-6 py-8">
          {/* Header */}
          <div className="space-y-4">
            <button
              onClick={onBack}
              className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              disabled={mfaLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to options
            </button>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-poly-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-poly-green" />
              </div>
              <h2 className="text-2xl font-bold">2FA Code Entry</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                'Enter your 2FA Authentication Code'
              </p>
            </div>
          </div>

          {/* Email/OTP Form */}
          <div className="space-y-4">
            {/* OTP Input */}
            <div className="space-y-2">
              <Input
                label="Verification Code"
                type="text"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => handleOtpChange(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && mfaCode.length === 6) {
                    handleVerifyOTP();
                  }
                }}
                disabled={mfaLoading}
                maxLength={6}
                autoFocus
                className="text-center text-lg font-mono tracking-wider"
              />

              {/* OTP Input Helper */}
              <div className="flex justify-center">
                <div className="flex space-x-1">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i < mfaCode.length
                          ? 'bg-poly-green'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Verify Button */}
            <Button
              onClick={() => handleVerifyOTP()}
              variant="primary"
              size="lg"
              loading={mfaLoading}
              disabled={mfaCode.length !== 6 || mfaLoading}
              className="w-full"
            >
              {mfaLoading ? (
                'Verifying...'
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Verify Code
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
