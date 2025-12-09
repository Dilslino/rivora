import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  isLoading,
  disabled,
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden font-display tracking-wider uppercase font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed clip-path-slant";
  
  const variants = {
    primary: "bg-rivora-violet hover:bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.5)] border-l-4 border-rivora-cyan",
    secondary: "bg-rivora-panel hover:bg-slate-800 text-rivora-cyan border border-rivora-cyan/30",
    danger: "bg-rivora-red/10 hover:bg-rivora-red/20 text-rivora-red border border-rivora-red/50",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white"
  };

  const sizes = {
    sm: "px-4 py-1 text-sm",
    md: "px-6 py-3 text-lg",
    lg: "px-10 py-4 text-2xl w-full"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          PROCESSING
        </span>
      ) : children}
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-2 h-2 bg-white/30 transform rotate-45 translate-x-1 -translate-y-1"></div>
    </button>
  );
};