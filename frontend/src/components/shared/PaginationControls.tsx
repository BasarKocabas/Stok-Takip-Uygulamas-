import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  pagination?: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationProps> = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-slate-100">
      <div className="text-xs text-slate-500">
        Toplam <span className="font-semibold text-slate-800">{pagination.total}</span> kayıttan{' '}
        <span className="font-semibold text-slate-800">{(pagination.page - 1) * pagination.limit + 1}</span> -{' '}
        <span className="font-semibold text-slate-800">
          {Math.min(pagination.page * pagination.limit, pagination.total)}
        </span>{' '}
        arası gösteriliyor
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="h-8 px-2 text-xs"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Önceki
        </Button>
        <span className="text-xs font-medium text-slate-600 px-2">
          {pagination.page} / {pagination.pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.pages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="h-8 px-2 text-xs"
        >
          Sonraki <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
