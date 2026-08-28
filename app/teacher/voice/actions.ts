"use server";

import { requireTeacher } from "@/lib/auth";
import {
  getVoicePresenceForGroups,
  type VoicePresenceEntry,
} from "@/lib/voice-server";

/**
 * Lightweight polling target for the overview page: given the group ids
 * it already loaded once (server-rendered, static structure), just ask
 * Daily who's currently present in each — no need to re-fetch
 * assignments/groups/members every 12s along with it.
 */
export async function getVoicePresenceForGroupIds(
  groupIds: string[]
): Promise<Record<string, VoicePresenceEntry[]>> {
  await requireTeacher();
  const presence = await getVoicePresenceForGroups(groupIds);
  return Object.fromEntries(presence);
}
