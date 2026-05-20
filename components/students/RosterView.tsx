"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";

export type RosterStudent = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string | null;
};

export type RosterGroup = {
  key: string;
  label: string;
  students: RosterStudent[];
};

export function RosterView({ groups }: { groups: RosterGroup[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = q
    ? groups
        .map((g) => ({
          ...g,
          students: g.students.filter((s) =>
            `${s.firstName} ${s.lastName} ${s.username}`
              .toLowerCase()
              .includes(q)
          ),
        }))
        .filter((g) => g.students.length > 0)
    : groups;

  if (groups.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Import a roster CSV from the Classes page to add students."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wood-400 pointer-events-none" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search students…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-wood-500 text-center py-4">
            No students match &quot;{query}&quot;.
          </p>
        </Card>
      ) : (
        filtered.map((g) => (
          <section key={g.key}>
            <h2 className="font-display text-xl text-wood-800 mb-3">
              {g.label}{" "}
              <span className="text-sm text-wood-400">
                ({g.students.length})
              </span>
            </h2>
            <Card padded={false} className="overflow-hidden">
              <ul className="divide-y divide-wood-100">
                {g.students.map((s) => (
                  <li key={s.id} className="p-1.5">
                    <Link
                      href={`/teacher/students/${s.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-cozy hover:bg-cream-200 transition-colors"
                    >
                      <Avatar
                        firstName={s.firstName}
                        lastName={s.lastName}
                        avatarUrl={s.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-wood-900 truncate">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-wood-500 font-mono truncate">
                          {s.username}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
