"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { teacherNav, studentNav } from "./nav";

/**
 * Hamburger button + slide-in drawer for navigation on small screens.
 * The desktop Sidebar is hidden below the `md` breakpoint, so this is the
 * only way to reach the menu on a phone.
 */
export function MobileNav({ role }: { role: "teacher" | "student" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = role === "teacher" ? teacherNav : studentNav;
  const home = role === "teacher" ? "/teacher" : "/student";

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock background scroll and let Esc close the drawer.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden mr-auto -ml-1 p-2 rounded-cozy text-wood-700 transition-colors hover:bg-cream-200"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="flex h-full w-64 max-w-[80vw] flex-col bg-cream-50 shadow-cozy-lg animate-fade-in">
            <div className="flex items-center justify-between border-b border-wood-100/70 px-5 py-5">
              <Link href={home} className="block">
                <h1 className="font-display text-2xl leading-none text-terracotta-700">
                  Stardrop
                </h1>
                <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-wide-label text-wood-500">
                  Game Design
                </p>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-2 rounded-cozy p-2 text-wood-500 transition-colors hover:bg-cream-200"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== home && pathname.startsWith(item.href));
                const Icon = item.icon;

                if (item.comingSoon) {
                  return (
                    <div
                      key={item.href}
                      className="flex cursor-not-allowed items-center gap-3 rounded-cozy px-3 py-2.5 text-wood-400"
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                      <span className="text-sm">{item.label}</span>
                      <span className="ml-auto text-[0.65rem] uppercase tracking-wide-label">
                        soon
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={[
                      "flex items-center gap-3 rounded-cozy px-3 py-2.5 text-sm transition-colors duration-150",
                      isActive
                        ? "bg-terracotta-100/70 font-semibold text-terracotta-800"
                        : "text-wood-700 hover:bg-cream-200 hover:text-wood-900",
                    ].join(" ")}
                  >
                    <Icon
                      className="h-4 w-4"
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Backdrop — tap anywhere outside the drawer to close. */}
          <button
            type="button"
            className="flex-1 bg-wood-900/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
}
