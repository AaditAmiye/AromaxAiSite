import React from 'react';

interface AromaxLogoProps {
  /** Size in pixels (default: 24) */
  size?: number;
  /** Custom class for styling */
  className?: string;
  /** Display variant: 'icon' (just symbol), 'full' (symbol + wordmark), or 'badge' (contained in dark pill/circle) */
  variant?: 'icon' | 'full' | 'badge';
  /** Color theme for icon */
  color?: string;
}

/**
 * Official Aromax AI Logo Component
 * Precision vector recreation of the Aromax AI emblem and wordmark.
 */
export const AromaxLogo: React.FC<AromaxLogoProps> = ({
  size = 24,
  className = '',
  variant = 'icon',
  color = 'currentColor'
}) => {
  // Official Aromax AI "A" Mark Path
  // Mathematical geometric proportion with rounded corners and clean negative space
  const iconSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Aromax AI Logo"
    >
      <path
        d="M50 14L86 86H68.5L60.5 70H39.5L31.5 86H14L50 14ZM50 37L61.5 59H38.5L50 37Z"
        fill={color}
        fillRule="evenodd"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'icon') {
    return iconSvg;
  }

  if (variant === 'badge') {
    return (
      <div
        className={`w-8 h-8 rounded-full ios-glass flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs border border-white/80 dark:border-white/10 select-none ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg
          width={Math.round(size * 0.58)}
          height={Math.round(size * 0.58)}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M50 14L86 86H68.5L60.5 70H39.5L31.5 86H14L50 14ZM50 37L61.5 59H38.5L50 37Z"
            fill="currentColor"
            fillRule="evenodd"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  // variant === 'full'
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs border border-black/[0.06] dark:border-white/10">
        <svg
          width={18}
          height={18}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 14L86 86H68.5L60.5 70H39.5L31.5 86H14L50 14ZM50 37L61.5 59H38.5L50 37Z"
            fill="currentColor"
            fillRule="evenodd"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex items-center tracking-[0.06em] font-bold text-[15px] text-[#1D1D1F] dark:text-[#F4F4F5] leading-none">
        <span>AROMAX</span>
        <span className="text-[#34C759] ml-0.5">AI</span>
      </div>
    </div>
  );
};
