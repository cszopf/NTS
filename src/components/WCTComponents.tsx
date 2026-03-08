import React from 'react';
import { LucideIcon } from 'lucide-react';

interface WCTCardProps {
  children: React.ReactNode;
  className?: string;
}

export const WCTCard: React.FC<WCTCardProps> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-[#A2B2C8]/20 p-6 md:p-8 ${className}`}>
    {children}
  </div>
);

interface WCTButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export const WCTButton: React.FC<WCTButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false,
  className = "",
  ...props 
}) => {
  const baseStyles = "px-8 py-4 rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#004EA8] text-white hover:bg-[#003d82]",
    secondary: "bg-[#64CCC9] text-white hover:bg-[#54b8b5]",
    outline: "border-2 border-[#004EA8] text-[#004EA8] hover:bg-[#004EA8]/5"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

interface WCTInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: LucideIcon;
}

export const WCTInput = React.forwardRef<HTMLInputElement, WCTInputProps>(
  ({ label, error, icon: Icon, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#A2B2C8] uppercase tracking-[1.5px] font-montserrat">
        {label}
      </label>
      <div className="relative">
        {Icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A2B2C8] pointer-events-none"><Icon className="w-5 h-5" /></div>}
        <input 
          ref={ref}
          className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-500' : 'border-[#A2B2C8]/30'} focus:outline-none focus:border-[#004EA8] bg-white text-[#004EA8] ${Icon ? 'pl-12' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
);
WCTInput.displayName = 'WCTInput';

interface WCTSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export const WCTSelect: React.FC<WCTSelectProps> = ({ label, options, error, className = "", ...props }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label className="text-sm font-medium text-[#A2B2C8] uppercase tracking-[1.5px] font-montserrat">
      {label}
    </label>
    <select 
      className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-500' : 'border-[#A2B2C8]/30'} focus:outline-none focus:border-[#004EA8] bg-white text-[#004EA8] appearance-none`}
      {...props}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
);

export const WCTStepIndicator: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => (
  <div className="flex gap-2 w-full mb-8">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <div 
        key={i} 
        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i + 1 <= currentStep ? 'bg-[#64CCC9]' : 'bg-[#A2B2C8]/20'}`}
      />
    ))}
  </div>
);

export const WCTAlert: React.FC<{ type: 'error' | 'warning' | 'info'; children: React.ReactNode }> = ({ type, children }) => {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    info: "bg-blue-50 border-blue-200 text-blue-700"
  };
  return (
    <div className={`p-4 rounded-xl border ${styles[type]} text-sm flex items-start gap-3`}>
      {children}
    </div>
  );
};

export const WCTSummaryRow: React.FC<{ label: string; value: string | number; isTotal?: boolean; details?: { label: string; value: number }[]; description?: string }> = ({ label, value, isTotal = false, details, description }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasDetails = (details && details.length > 0) || !!description;

  // Determine color based on value
  let valueColor = "text-[#004EA8]"; // Default blue
  if (typeof value === 'number') {
    if (value > 0) valueColor = "text-green-600";
    if (value < 0) valueColor = "text-red-600";
  }

  return (
    <div className={`${isTotal ? 'border-t border-[#A2B2C8]/20 mt-4 pt-6' : ''}`}>
      <div 
        className={`flex justify-between items-center py-3 ${hasDetails ? 'cursor-pointer hover:bg-black/5 rounded px-2 -mx-2 transition-colors' : ''}`}
        onClick={() => hasDetails && setIsOpen(!isOpen)}
      >
        <span className={`${isTotal ? 'text-lg font-bold text-[#004EA8]' : 'text-[#A2B2C8]'} font-nunito flex items-center gap-2`}>
          {hasDetails && (
            <span className={`text-[10px] transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
          )}
          {label}
        </span>
        <span className={`${isTotal ? 'text-2xl font-bold' : 'font-medium'} ${valueColor} font-nunito`}>
          {typeof value === 'number' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value) : value}
        </span>
      </div>
      {hasDetails && isOpen && (
        <div className="pl-8 pb-2 space-y-1">
          {description && (
            <div className="text-xs text-[#A2B2C8] italic mb-2 pr-4">
              {description}
            </div>
          )}
          {details && details.map((detail, idx) => (
            <div key={idx} className="flex justify-between text-sm text-[#A2B2C8]">
              <span>{detail.label}</span>
              <span className="text-red-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(-detail.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
