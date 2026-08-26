import React from 'react';
import { Badge } from '@/components/ui/badge';
import { WORK_ORDER_STATUS_COLORS, APPROVAL_STATUS_COLORS, MOVEMENT_TYPE_COLORS, WORK_ORDER_STATUS_LABELS, APPROVAL_STATUS_LABELS, MOVEMENT_TYPE_LABELS } from '@/lib/constants';

interface StatusBadgeProps {
  status: string;
  type: 'workOrder' | 'approval' | 'movement';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
  let colorClass = 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-slate-200';
  let label = status;

  if (type === 'workOrder') {
    colorClass = WORK_ORDER_STATUS_COLORS[status] || colorClass;
    label = WORK_ORDER_STATUS_LABELS[status] || status;
  } else if (type === 'approval') {
    colorClass = APPROVAL_STATUS_COLORS[status] || colorClass;
    label = APPROVAL_STATUS_LABELS[status] || status;
  } else if (type === 'movement') {
    colorClass = MOVEMENT_TYPE_COLORS[status] || colorClass;
    label = MOVEMENT_TYPE_LABELS[status] || status;
  }

  return (
    <Badge className={`${colorClass} whitespace-nowrap`} variant="outline">
      {label}
    </Badge>
  );
};
