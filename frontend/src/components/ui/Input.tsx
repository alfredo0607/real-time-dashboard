import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-aws-dark"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 ${
            error
              ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200"
              : "border-surface-border bg-white focus:border-aws-orange focus:ring-aws-orange/20"
          } placeholder:text-gray-400 disabled:bg-surface disabled:text-gray-400 ${className}`}
        />
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
