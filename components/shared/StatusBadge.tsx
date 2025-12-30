'use client';

import React from 'react';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800'
};

const statusVariantMap: Record<string, keyof typeof variantStyles> = {
  active: 'success',
  completed: 'success',
  pending: 'warning',
  'in-progress': 'info',
  cancelled: 'error',
  failed: 'error',
  new: 'info',
  contacted: 'info',
  qualified: 'success',
  negotiating: 'warning',
  won: 'success',
  lost: 'error',
  open: 'info',
  closed: 'default',
  scheduled: 'warning',
  approved: 'success',
  rejected: 'error'
};

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  const statusLower = status.toLowerCase();
  const autoVariant = statusVariantMap[statusLower] || 'default';
  const finalVariant = variant || autoVariant;
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[finalVariant]}`}
    >
      {status}
    </span>
  );
}