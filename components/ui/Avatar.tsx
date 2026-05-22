interface AvatarProps {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-24 h-24 text-2xl",
};

export function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = "md",
}: AvatarProps) {
  const sizeClasses = SIZE_CLASSES[size];

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={[
          "rounded-full object-cover flex-shrink-0 bg-cream-200",
          sizeClasses,
        ].join(" ")}
      />
    );
  }

  const first = (firstName ?? "").charAt(0);
  const last = (lastName ?? "").charAt(0);
  const initials = `${first}${last}`.toUpperCase() || "?";

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
