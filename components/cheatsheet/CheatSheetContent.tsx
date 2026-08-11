import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  CSHARP_SECTIONS,
  UNITY_LIFECYCLE_SECTION,
  TIPS_SECTION,
  type CheatEntry,
  type CheatSection,
} from "@/lib/cheatsheet-content";
import { UNITY_TYPES, type UnityType } from "@/lib/monaco/unity-api";

/** Turn one UNITY_TYPES entry into cheat-sheet entries — static members
 * first (ClassName.Member), then instance members (instance.member). Kept
 * as live data from unity-api.ts (the editor's own autocomplete source)
 * rather than copied, so this can't drift from what the editor suggests. */
function unityTypeToSection(t: UnityType): CheatSection {
  const entries: CheatEntry[] = [
    ...t.staticMembers.map((m) => ({
      term: m.name,
      signature: m.signature ?? `${t.name}.${m.name}`,
      description: m.documentation ?? "",
    })),
    ...t.instanceMembers.map((m) => ({
      term: m.name,
      signature: m.signature ?? m.name,
      description: m.documentation ?? "",
    })),
  ];
  return {
    id: `unity-${t.name.toLowerCase()}`,
    title: t.name,
    intro: t.documentation,
    entries,
  };
}

const UNITY_TYPE_SECTIONS = UNITY_TYPES.filter(
  (t) => t.name !== "MonoBehaviour" && t.name !== "KeyCode"
).map(unityTypeToSection);

const TOC_GROUPS: { label: string; sections: CheatSection[] }[] = [
  { label: "C# basics", sections: CSHARP_SECTIONS },
  {
    label: "Unity",
    sections: [UNITY_LIFECYCLE_SECTION, ...UNITY_TYPE_SECTIONS],
  },
  { label: "Tips", sections: [TIPS_SECTION] },
];

export function CheatSheetContent() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[14rem_1fr] gap-8">
      <nav className="hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-2 space-y-5">
          {TOC_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="label-eyebrow text-wood-500 mb-1.5">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block text-sm text-wood-600 hover:text-terracotta-700 py-0.5 truncate"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="space-y-10 min-w-0">
        {TOC_GROUPS.map((group) => (
          <div key={group.label} className="space-y-8">
            <h2 className="font-display text-2xl text-wood-900 border-b border-wood-200 pb-2">
              {group.label}
            </h2>
            {group.sections.map((section) => (
              <SectionBlock key={section.id} section={section} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: CheatSection }) {
  return (
    <section id={section.id} className="scroll-mt-4">
      <h3 className="font-display text-lg text-wood-900 mb-1">
        {section.title}
      </h3>
      {section.intro && (
        <p className="text-sm text-wood-600 mb-3 max-w-prose">
          {section.intro}
        </p>
      )}
      <Card padded={false} className="overflow-hidden">
        <ul className="divide-y divide-wood-100">
          {section.entries.map((entry, i) => (
            <li key={`${entry.term}-${i}`} className="p-4">
              <p className="font-mono text-sm font-semibold text-terracotta-700">
                {entry.term}
              </p>
              {entry.signature && (
                <pre className="mt-1.5 bg-cream-100 border border-wood-100 rounded-cozy px-3 py-2 text-xs font-mono text-wood-800 overflow-x-auto whitespace-pre-wrap">
                  {entry.signature}
                </pre>
              )}
              {entry.description && (
                <p className="text-sm text-wood-700 mt-2 leading-relaxed">
                  {entry.description}
                </p>
              )}
              {entry.example && (
                <pre className="mt-2 bg-wood-900 text-cream-50 rounded-cozy px-3 py-2.5 text-xs font-mono overflow-x-auto whitespace-pre">
                  {entry.example}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

/** Small back-to-top link for the bottom of a long reference page. */
export function BackToTop() {
  return (
    <Link
      href="#top"
      className="inline-flex items-center gap-1 text-sm text-wood-500 hover:text-terracotta-700 transition-colors"
    >
      Back to top
    </Link>
  );
}
