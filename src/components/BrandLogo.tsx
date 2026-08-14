import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  tagline?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  tagline = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  }[size];

  const textSize = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-2xl sm:text-3xl',
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Sleek Vector App Icon */}
      <div className={`relative ${iconDimensions} shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 p-0.5 shadow-md flex items-center justify-center overflow-hidden border border-white/20 group`}>
        {/* Subtle inner gloss highlight */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/30 opacity-70 pointer-events-none" />
        
        {/* SVG Emblem */}
        <svg 
          viewBox="0 0 40 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5 drop-shadow-sm"
        >
          {/* House / Ledger Structure */}
          <path
            d="M6 16.5L20 6L34 16.5V31C34 32.6569 32.6569 34 31 34H9C7.34315 34 6 32.6569 6 31V16.5Z"
            fill="rgba(255, 255, 255, 0.15)"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Ledger binding line / Sub-meter dividing line */}
          <path
            d="M14 34V18"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.8"
            strokeDasharray="2 2"
          />
          {/* Rupee Symbol (₹) in foreground */}
          <path
            d="M18 13H27M18 16.5H26M18 13C21.5 13 24 14.2 24 16.8C24 19.5 21.5 20.5 18 20.5H16.5L25 30"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Electricity Spark Icon */}
          <path
            d="M11 15L8 20H13L10 26"
            stroke="#FBBF24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight text-[var(--ink)] leading-none ${textSize}`}>
              Kiraya<span className="text-[var(--primary)] font-extrabold">Bahi</span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
              PRO
            </span>
          </div>
          {tagline && (
            <span className="text-[10.5px] text-[var(--ink-soft)] font-medium leading-tight mt-0.5 hidden sm:block">
              Smart Rent & Sub-Meter Ledger
            </span>
          )}
        </div>
      )}
    </div>
  );
};
