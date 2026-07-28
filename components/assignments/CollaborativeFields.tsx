"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Label, Input } from "@/components/ui/Input";
import {
  GROUP_MODE_LABELS,
  type CollabConfig,
  type GroupMode,
} from "@/lib/groups";

const MODES: GroupMode[] = ["random", "manual", "choice"];

/**
 * The "Collaborative" config block for a coding assignment's create/edit
 * form. Submits: collaborative, group_mode, max_group_size, allow_solo.
 * When unchecked, the sub-fields aren't rendered (so they don't submit) and
 * the server stores collaborative = false.
 */
export function CollaborativeFields({ initial }: { initial?: CollabConfig }) {
  const [on, setOn] = useState(initial?.collaborative ?? false);
  const checkbox =
    "w-4 h-4 rounded border-wood-300 text-terracotta-500 focus:ring-terracotta-400";

  return (
    <div className="rounded-cozy border border-wood-200 bg-cream-50 p-3">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          name="collaborative"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
          className={`${checkbox} mt-0.5`}
        />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium text-wood-900">
            <Users className="w-4 h-4 text-terracotta-700" strokeWidth={1.75} />
            Collaborative (group work)
          </span>
          <span className="block text-xs text-wood-500">
            Students work in groups. Applies to Code assignments.
          </span>
        </span>
      </label>

      {on && (
        <div className="mt-3 space-y-3 pl-6">
          <div>
            <Label className="text-xs mb-1">How are groups formed?</Label>
            <div className="space-y-1.5">
              {MODES.map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2 text-sm cursor-pointer text-wood-800"
                >
                  <input
                    type="radio"
                    name="group_mode"
                    value={m}
                    defaultChecked={(initial?.groupMode ?? "random") === m}
                    className="w-4 h-4 border-wood-300 text-terracotta-500 focus:ring-terracotta-400"
                  />
                  {GROUP_MODE_LABELS[m]}
                </label>
              ))}
            </div>
          </div>

          <div className="w-44">
            <Label htmlFor="max_group_size" className="text-xs">
              Max students per group
            </Label>
            <Input
              id="max_group_size"
              name="max_group_size"
              type="number"
              min="1"
              defaultValue={initial?.maxGroupSize ?? 3}
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer text-wood-800">
            <input
              type="checkbox"
              name="allow_solo"
              defaultChecked={initial?.allowSolo ?? false}
              className={checkbox}
            />
            Allow students to work solo instead of joining a group
          </label>

          <label className="flex items-center gap-2 text-sm cursor-pointer text-wood-800">
            <input
              type="checkbox"
              name="leader_submits_only"
              defaultChecked={initial?.leaderSubmitsOnly ?? false}
              className={checkbox}
            />
            Only the group leader (creator) can submit
          </label>
        </div>
      )}
    </div>
  );
}
