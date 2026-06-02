"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { demoNavFor } from "./demoNav";
import type { DemoRole } from "@/lib/demo/fixtures";

// Mirrors the real Sidebar, but every link points at /demo and the active
// state is computed against the demo routes.

export function DemoSidebar({ role }: { role: DemoRole }) {
  const pathname = usePathname();
  const items = demoNavFor(role);
  const home = role === "teacher" ? "/demo/teacher" : "/demo/student";

  return (
    <aside className="hidden md:flex w-60 flex-col bg-cream-50/80 backdrop-blur-sm border-r border-wood-100/70">
      <div className="px-6 py-6">
        <Link href={home} className="block">
          <h1 className="font-display text-2xl text-terracotta-700 leading-none">
            Stardrop
          </h1>
          <p className="text-[0.7rem] uppercase tracking-wide-label text-wood-500 mt-1.5 font-semibold">
            Game Design
          </p>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== home && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-cozy text-sm transition-colors duration-150",
                isActive
                  ? "bg-terracotta-100/70 text-terracotta-800 font-semibold"
                  : "text-wood-700 hover:bg-cream-200 hover:text-wood-900",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2 : 1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-5 border-t border-wood-100/70">
        <p className="text-[0.7rem] text-wood-400">Demo · sample data only</p>
      </div>
    </aside>
  );
}
