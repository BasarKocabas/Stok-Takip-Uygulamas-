import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type LoadingSkeletonProps = {
  variant?: 'list' | 'detail' | 'dashboard';
  className?: string;
};

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'list', className = '' }) => {
  const lines = variant === 'dashboard' ? 5 : variant === 'detail' ? 4 : 7;

  return (
    <div aria-busy="true" aria-label="Yükleniyor" className={`space-y-4 ${className}`}>
      {variant === 'dashboard' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className={`mb-3 h-5 ${index % 3 === 0 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
    </div>
  );
};
