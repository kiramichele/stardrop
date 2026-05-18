interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: "sm" | "md";
}

export function Avatar({ firstName, lastName, size = "md" }: AvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const sizeClasses = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";

  return (
    <div
      className={[
        "flex items-center justify-center rounded-full bg-terracotta-100 text-terracotta-800 font-semibold flex-shrink-0",
        sizeClasses,
      ].join(" ")}
      aria-hidden
    >
      {initials}
    </div>
  );
}