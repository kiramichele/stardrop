import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  hoverable?: boolean;
}

export function Card({
  padded = true,
  hoverable = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "bg-cream-50 rounded-cozy-lg border border-wood-100/70 shadow-cozy",
        padded ? "p-6" : "",
        hoverable
          ? "transition-shadow duration-200 hover:shadow-cozy-lg cursor-pointer"
          : "",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function CardHeader({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["mb-4 flex items-start justify-between gap-4", className].join(
        " "
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className = "",
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={["font-display text-xl text-wood-900", className].join(" ")}
      {...props}
    />
  );
}

export function CardDescription({
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={["text-sm text-wood-600 mt-1", className].join(" ")}
      {...props}
    />
  );
}