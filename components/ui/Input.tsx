import {
  forwardRef,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

const baseField =
  "w-full px-3 py-2 rounded-cozy border border-wood-200 bg-white text-wood-900 placeholder:text-wood-400 transition-all duration-150 focus:outline-none focus:border-terracotta-400 focus:shadow-focus-warm disabled:bg-cream-100 disabled:cursor-not-allowed";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...props }, ref) {
  return (
    <input ref={ref} className={[baseField, className].join(" ")} {...props} />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={[baseField, "resize-y min-h-[5rem]", className].join(" ")}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className = "", ...props }, ref) {
  return (
    <select
      ref={ref}
      className={[baseField, "appearance-none pr-9 bg-no-repeat", className].join(
        " "
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23876043'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")",
        backgroundPosition: "right 0.65rem center",
        backgroundSize: "1.1rem",
      }}
      {...props}
    />
  );
});

export function Label({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={[
        "block text-sm font-medium text-wood-700 mb-1.5",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function FieldHint({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={["text-xs text-wood-500 mt-1.5", className].join(" ")} {...props} />
  );
}

export function FieldError({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={[
        "text-sm text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded-cozy px-3 py-2",
        className,
      ].join(" ")}
      {...props}
    />
  );
}