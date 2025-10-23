import { ReactNode } from 'react';
import { Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated, logout } = useAuth();
  const { address, disconnect } = useWallet();

  const handleLogout = async () => {
    await logout();
    await disconnect();
  };

  return (
    <div className={cn(
      'min-h-screen transition-colors duration-300',
      isDark ? 'bg-dark-bg text-white' : 'bg-light-bg text-gray-900'
    )}>
      {/* Header */}
      <header className={cn(
        'border-b transition-colors duration-300',
        isDark ? 'border-dark-border bg-dark-card' : 'border-light-border bg-light-card'
      )}>
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 px-7 p-3 bg-poly-green rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">CAT</span>
              </div>
              <h1 className="text-xl font-bold">Message Signer</h1>
            </div>

            {/* Right side controls */}
            <div className="flex items-center space-x-4">
              {/* Address display */}
              {isAuthenticated && address && (
                <div className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-mono',
                  isDark ? 'bg-dark-bg' : 'bg-light-bg'
                )}>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
              )}

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isDark 
                    ? 'hover:bg-dark-bg text-cambridge-blue' 
                    : 'hover:bg-gray-100 text-gray-600'
                )}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Logout button */}
              {isAuthenticated && (
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className={cn(
        'mt-auto border-t transition-colors duration-300',
        isDark ? 'border-dark-border' : 'border-light-border'
      )}>
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className={cn(
            'text-center text-sm',
            isDark ? 'text-gray-400' : 'text-gray-600'
          )}>
            Web3 Message Signer & Verifier © 2025
          </p>
        </div>
      </footer>
    </div>
  );
}