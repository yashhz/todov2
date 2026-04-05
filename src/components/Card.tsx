import React, { type ReactNode } from 'react';
import './Card.css';

export interface CardProps {
  statusType?: 'dot' | 'ring' | 'segments' | 'habit' | 'none';
  statusColor?: string;
  statusValue?: number;
  segmentValues?: boolean[]; // length 7
  progressValue?: number; // 0 to 1
  showBorderSegments?: boolean;
  isCompleted?: boolean;
  title: string;
  subtitle?: string;
  metadata?: Array<{ label: string; value: string | ReactNode }>;
  actions?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  onStatusClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  statusType = 'none',
  statusColor,
  statusValue,
  segmentValues,
  progressValue,
  showBorderSegments = false,
  isCompleted = false,
  title,
  subtitle,
  metadata,
  actions,
  children,
  onClick,
  onStatusClick,
  className = '',
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (showBorderSegments && containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setDimensions({ width, height });
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [showBorderSegments]);

  const renderBorderSegments = () => {
    if (!showBorderSegments) return null;
    if (!segmentValues && progressValue === undefined) return null;

    const { width, height } = dimensions;
    const r = 12; // radius matching var(--radius-md)
    const sw = 3; // stroke width increased for visibility
    const off = sw / 2; // offset to prevent clipping
    
    // Adjusted dimensions for the path to stay within the box
    const w = width - sw;
    const h = height - sw;

    // Path for a rounded rectangle starting from the START of the top-left arc
    const pathData = `
      M ${off},${r + off}
      A ${r},${r} 0 0 1 ${r + off},${off}
      H ${w - r + off} 
      A ${r},${r} 0 0 1 ${w + off},${r + off} 
      V ${h - r + off} 
      A ${r},${r} 0 0 1 ${w - r + off},${h + off} 
      H ${r + off} 
      A ${r},${r} 0 0 1 ${off},${h - r + off} 
      V ${r + off}
      Z
    `;
    
    return (
      <svg className="card__border-svg" width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
        <path
          d={pathData}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={sw}
        />
        {/* Continuous Progress - One long line */}
        {progressValue !== undefined && (
          <path
            d={pathData}
            pathLength="100"
            fill="none"
            stroke={statusColor || 'var(--accent-primary)'}
            strokeWidth={sw}
            strokeDasharray={`${progressValue * 100} 100`}
            strokeLinecap="round"
            className="card__border-segment card__border-segment--continuous"
            style={{ 
              color: statusColor || 'var(--accent-primary)',
              transition: 'stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease',
            }}
          />
        )}

        {/* Legacy segments - if no progressValue */}
        {progressValue === undefined && segmentValues && segmentValues.map((val, i) => {
          if (!val) return null;
          const totalSegments = 7;
          const segmentLength = (100 / totalSegments) - 1; // 1% gap
          const dashArray = `${segmentLength} ${100 - segmentLength}`;
          const dashOffset = -((100 / totalSegments) * i);

          return (
            <g key={i}>
              <path
                d={pathData}
                pathLength="100"
                fill="none"
                stroke={statusColor || 'var(--accent-primary)'}
                strokeWidth={sw}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="card__border-segment"
                style={{ 
                  transition: 'stroke 0.3s ease, stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' 
                }}
              />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div 
      className={`card ${showBorderSegments ? 'card--with-border-segments' : ''} ${isCompleted ? 'card--completed' : ''} ${className}`} 
      onClick={onClick}
      ref={containerRef}
    >
      {renderBorderSegments()}
      <div className="card__body">
        <div className="card__header">
          <div className="card__header-left">
            {statusType === 'dot' && (
              <div
                className="card__status-dot"
                style={{ backgroundColor: statusColor }}
                onClick={onStatusClick}
              />
            )}
            {statusType === 'habit' && (
              <div
                className={`card__status-habit ${isCompleted ? 'card__status-habit--done' : ''}`}
                style={isCompleted ? { backgroundColor: statusColor, borderColor: statusColor } : {}}
                onClick={onStatusClick}
              >
                {isCompleted && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            )}
            {statusType === 'ring' && statusValue !== undefined && (
              <div className="card__status-ring" onClick={onStatusClick}>
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke={statusColor || 'var(--accent-primary)'}
                    strokeWidth="2.5"
                    strokeDasharray={`${(statusValue / 100) * 62.83} 62.83`}
                    strokeLinecap="round"
                    transform="rotate(-90 12 12)"
                    style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                  />
                </svg>
              </div>
            )}
            {statusType === 'segments' && segmentValues && (
              <div className="card__status-segments" onClick={onStatusClick}>
                <svg width="28" height="28" viewBox="0 0 28 28">
                  {/* Background circle */}
                  <circle
                    cx="14"
                    cy="14"
                    r="11"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="2.5"
                  />
                  {/* 7 Segments */}
                  {Array.from({ length: 7 }).map((_, i) => {
                    const angle = (i * 360) / 7;
                    const gap = 4; // degrees
                    const arcLength = (360 / 7) - gap;
                    const circumference = 2 * Math.PI * 11;
                    const dashArray = `${(arcLength / 360) * circumference} ${circumference}`;
                    
                    return (
                      <circle
                        key={i}
                        cx="14"
                        cy="14"
                        r="11"
                        fill="none"
                        stroke={segmentValues[i] ? (statusColor || 'var(--accent-primary)') : 'transparent'}
                        strokeWidth="2.5"
                        strokeDasharray={dashArray}
                        strokeLinecap="round"
                        transform={`rotate(${-90 + angle + gap / 2} 14 14)`}
                        style={{ transition: 'stroke 0.3s ease-out' }}
                      />
                    );
                  })}
                  {/* Center Dot if today is done */}
                  {segmentValues[6] && (
                    <circle
                      cx="14"
                      cy="14"
                      r="4"
                      fill={statusColor || 'var(--accent-primary)'}
                    />
                  )}
                </svg>
              </div>
            )}
            <div className="card__title-group">
              <h3 className="card__title">{title}</h3>
              {subtitle && <p className="card__subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>

        {children && <div className="card__content">{children}</div>}
      </div>

      {metadata && metadata.length > 0 && (
        <div className="card__metadata">
          {metadata.map((item, index) => (
            <React.Fragment key={index}>
              <span className="card__meta-item">
                {item.label && (
                  <span className="card__meta-label">{item.label}</span>
                )}
                <span className="card__meta-value">{item.value}</span>
              </span>
              {index < metadata.length - 1 && (
                <span className="card__meta-separator">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
