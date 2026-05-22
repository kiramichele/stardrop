import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-terracotta-500 text-white hover:bg-terracotta-600 active:bg-terracotta-700 shadow-soft",
  secondary:
    "bg-cream-50 text-wood-800 border border-wood-200 hover:bg-cream-100 hover:border-wood-300 active:bg-cream-200",
  ghost: "text-wood-700 hover:bg-cream-200 active:bg-cream-300",
  danger:
    "bg-terracotta-700 text-white hover:bg-terracotta-800 active:bg-terracotta-900 shadow-soft",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className = "", ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-cozy font-medium",
          "transition-colors duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-inherit",
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);