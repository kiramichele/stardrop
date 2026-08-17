"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Carries the server-side "is ElevenLabs (speech-to-text) configured?" flag
 * to client components anywhere in the tree, so the dictation mic button can
 * hide itself when the integration isn't set up — without every surface
 * threading the boolean through its props.
 *
 * Set once in the root layout from isSttConfigured().
 */
const DictationContext = createContext(false);

export function DictationProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <DictationContext.Provider value={enabled}>
      {children}
    </DictationContext.Provider>
  );
}

export function useDictationEnabled(): boolean {
  return useContext(DictationContext);
}

/**
 * Same underlying flag as dictation — isSttConfigured() is literally
 * isTtsConfigured() under another name in lib/tts.ts, one ElevenLabs key
 * powers both directions. Exported under its own name so a read-aloud
 * button reads as checking "read-aloud enabled," not "dictation enabled."
 */
export const useReadAloudEnabled = useDictationEnabled;
