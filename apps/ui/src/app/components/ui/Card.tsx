import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        'dark:bg-dark-card dark:border-dark-border',
        'bg-light-card border-light-border',
        hover && 'hover:shadow-lg hover:scale-[1.01]',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4 border-b dark:border-dark-border border-light-border', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-4 border-t dark:border-dark-border border-light-border', className)}>
      {children}
    </div>
  );
}