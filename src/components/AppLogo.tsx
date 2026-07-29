import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({ 
  size = 'md', 
  showText = true,
  showSubtitle = true,
  className = '' 
}) => {
  const sizeClasses = {
    sm: {
      box: 'w-8 h-8 rounded-xl border-[1.5px]',
      icon: 'w-4 h-4',
      title: 'text-base tracking-wider',
      subtitle: 'text-[9px]'
    },
    md: {
      box: 'w-11 h-11 rounded-2xl border-2',
      icon: 'w-6 h-6',
      title: 'text-xl tracking-wider',
      subtitle: 'text-xs'
    },
    lg: {
      box: 'w-14 h-14 rounded-2xl border-2',
      icon: 'w-8 h-8',
      title: 'text-2xl tracking-wider',
      subtitle: 'text-xs'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Golden Squircle Logo Badge */}
      <div className={`${currentSize.box} bg-[#0F0F0F] border-[#EAB308] flex items-center justify-center text-[#FACC15] flex-shrink-0 shadow-lg shadow-amber-950/20`}>
        <svg className={`${currentSize.icon} text-[#FACC15]`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
          <path d="M9 12.5L11 14.5L15 9.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Brand Title & Subtitle */}
      {showText && (
        <div className="flex flex-col justify-center min-w-0">
          <span className={`font-black ${currentSize.title} text-white block leading-none tracking-wider font-sans`}>
            DEMANDS
          </span>
          {showSubtitle && (
            <span className={`text-slate-400 font-semibold tracking-tight block mt-1 truncate ${currentSize.subtitle}`}>
              Painel de Escritórios
            </span>
          )}
        </div>
      )}
    </div>
  );
};
