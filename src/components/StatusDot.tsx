import React from 'react';
import './StatusDot.css';

export interface StatusDotProps {
  size?: number;
  color?: string;
  status?: 'active' | 'paused' | 'error' | 'neutral';
  pulse?: boolean;
}

const STATUS_COLORS = {
  active: 'var(--color-success)',
  paused: 'rgba(255, 255, 255, 0.3)',
  error: 'var(--color-danger)',
  neutral: 'rgba(255, 255, 255, 0.3)',
};

export const StatusDot: React.FC<StatusDotProps> = ({
  size = 8,
  color,
  status,
  pulse = false,
}) => {
  const dotColor = color || (status ? STATUS_COLORS[status] : STATUS_COLORS.neutral);

  return (
    <div
      className={`status-dot ${pulse ? 'status-dot--pulse' : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: dotColor,
      }}
    />
  );
};
