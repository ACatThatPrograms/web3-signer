import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2 rounded-lg border transition-colors duration-200',
            'dark:bg-dark-bg dark:border-dark-border dark:text-white',
            'bg-white border-gray-300 text-gray-900',
            'focus:outline-none focus:ring-2 focus:ring-poly-green focus:ring-offset-2',
            'dark:focus:ring-offset-dark-card',
            'placeholder:text-gray-500 dark:placeholder:text-gray-400',
            error && 'border-red-500 dark:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';