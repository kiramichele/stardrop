import { classColorStyle } from "@/lib/class-colors";

/**
 * Small solid dot in a class's tag color — the at-a-glance period marker.
 * Falls back to a neutral dot when no color is set. Server-renderable.
 */
export function ClassColorDot({
  color,
  className = "",
}: {
  color: string | null | undefined;
  className?: string;
}) {
  const style = classColorStyle(color);
  return (
    <span
      className={[
        "inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full",
        style ? style.dot : "bg-wood-300",
        className,
      ].join(" ")}
      aria-hidden
    />
  );
}
