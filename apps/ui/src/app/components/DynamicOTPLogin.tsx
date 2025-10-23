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

export default function DynamicOTPLogin({
  onSuccess,
  onBack,
}: DynamicOTPLoginProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [successPrompt, setSuccessPrompt] = useState(false);

  const {
    email,
    setEmail,
    otp,
    setOtp,
    isEmailLoading,
    isOtpLoading,
    sendEmailOTP,
    verifyEmailOTP,
    resendEmailOTP,
    address,
    isConnected,
  } = useWallet();

  // Handle successful connection
  useEffect(() => {
    if (isConnected && address && otpSent) {
      // Successfully connected after OTP verification
      onSuccess();
      if (!successPrompt) {
        toast.info("Please wait for additional login signature prompt.")
        setSuccessPrompt(true)
      }
    }
  }, [isConnected, address, otpSent, onSuccess]);



  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      await sendEmailOTP();
      setOtpSent(true);
      setResendTimer(30); // 30 second cooldown for resend
      toast.success(`Verification code sent to ${email}`);
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send verification code');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      await verifyEmailOTP();
      toast.success('Email code verified successfully!');
      // The useEffect above will handle the success callback
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Invalid verification code');
      setOtp(''); // Clear the OTP field on error
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) {
      return; // Still in cooldown period
    }

    try {
      await resendEmailOTP();
      setResendTimer(30); // Reset cooldown
      toast.success('Verification code resent successfully');
      setOtp(''); // Clear the OTP field
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      toast.error(error.message || 'Failed to resend verification code');
    }
  };

  const handleChangeEmail = () => {
    setOtpSent(false);
    setOtp('');
    setEmail('');
    setResendTimer(0);
  };

  // Format OTP input for better UX
  const handleOtpChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const formattedValue = value.replace(/\D/g, '').slice(0, 6);
    setOtp(formattedValue);

    // Auto-submit when 6 digits are entered //TODO:fix race condition here
    // if (formattedValue.length === 6) {
    //   handleVerifyOTP();
    // }
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
              disabled={isEmailLoading || isOtpLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to options
            </button>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-poly-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-poly-green" />
              </div>
              <h2 className="text-2xl font-bold">Email Verification</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {!otpSent
                  ? 'Enter your email to receive a verification code'
                  : `Enter the 6-digit code sent to ${email}`}
              </p>
            </div>
          </div>

          {/* Email/OTP Form */}
          <div className="space-y-4">
            {!otpSent ? (
              <>
                {/* Email Input */}
                <div className="space-y-2">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && email && email.includes('@')) {
                        handleSendOTP();
                      }
                    }}
                    disabled={isEmailLoading}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    We'll send a verification code to this email
                  </p>
                </div>

                {/* Send OTP Button */}
                <Button
                  onClick={handleSendOTP}
                  variant="primary"
                  size="lg"
                  loading={isEmailLoading}
                  disabled={!email || !email.includes('@') || isEmailLoading}
                  className="w-full"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Send Verification Code
                </Button>
              </>
            ) : (
              <>
                {/* Email Display */}
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Sending code to:
                      </p>
                      <p className="text-sm font-medium text-black">{email}</p>
                    </div>
                    <button
                      onClick={handleChangeEmail}
                      className="text-sm text-poly-green hover:text-poly-green/80 transition-colors"
                      disabled={isOtpLoading}
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* OTP Input */}
                <div className="space-y-2">
                  <Input
                    label="Verification Code"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => handleOtpChange(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && otp.length === 6) {
                        handleVerifyOTP();
                      }
                    }}
                    disabled={isOtpLoading}
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
                            i < otp.length
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
                  onClick={handleVerifyOTP}
                  variant="primary"
                  size="lg"
                  loading={isOtpLoading}
                  disabled={otp.length !== 6 || isOtpLoading}
                  className="w-full"
                >
                  {isOtpLoading ? (
                    'Verifying...'
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Verify Code
                    </>
                  )}
                </Button>

                {/* Resend Code */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Didn't receive the code?{' '}
                    {resendTimer > 0 ? (
                      <span className="text-gray-500">
                        Resend in {resendTimer}s
                      </span>
                    ) : (
                      <button
                        onClick={handleResendOTP}
                        className="text-poly-green hover:text-poly-green/80 font-medium transition-colors"
                        disabled={isEmailLoading || resendTimer > 0}
                      >
                        Resend code
                      </button>
                    )}
                  </p>
                </div>

                {/* Help Text */}
                <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Check your spam folder if you don't see the email
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Security Notice */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              🔒 Your email is secured with Dynamic's Web3 authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
