import { getCurrentUser } from "@/lib/auth";
import { asProfile } from "@/lib/profile";
import { AppShell } from "@/components/layout/AppShell";

export default async function SlideshowsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // A slideshow detail page (/slideshows/<id>) is publicly shareable, so a
  // logged-out visitor gets the bare page (it renders its own header). The
  // /slideshows list stays behind the middleware auth gate, so `user` is
  // always present there and the full app shell renders.
  const user = await getCurrentUser();
  if (!user) return <>{children}</>;
  return <AppShell user={asProfile(user)}>{children}</AppShell>;
}
