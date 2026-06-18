import type { Monaco } from "@monaco-editor/react";
import type { editor, languages, Position } from "monaco-editor";
import {
  UNITY_TYPES,
  UNITY_SNIPPETS,
  COMMON_VARIABLES,
  CSHARP_KEYWORDS,
  type UnityMember,
} from "./unity-api";

// Track if we've already registered to avoid double-registration on HMR
let registered = false;

export function setupMonaco(monaco: Monaco) {
  defineStardropTheme(monaco);
  if (!registered) {
    registerUnityCompletions(monaco);
    registered = true;
  }
}

// =============================================================
// Stardrop tech theme — emerald keywords, teal strings, amber
// numbers, deep navy identifiers on a clean white surface.
// =============================================================
function defineStardropTheme(monaco: Monaco) {
  monaco.editor.defineTheme("stardrop-cozy", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "3a5475", fontStyle: "italic" },
      { token: "string", foreground: "0d9488" },
      { token: "keyword", foreground: "059669", fontStyle: "bold" },
      { token: "keyword.cs", foreground: "059669", fontStyle: "bold" },
      { token: "number", foreground: "d97706" },
      { token: "type", foreground: "047857" },
      { token: "type.identifier", foreground: "047857" },
      { token: "identifier", foreground: "15243a" },
      { token: "delimiter", foreground: "3a5475" },
      { token: "operator", foreground: "3a5475" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#15243a",
      "editor.lineHighlightBackground": "#f5f9fd",
      "editor.lineHighlightBorder": "#f5f9fd",
      "editorLineNumber.foreground": "#9eb2cc",
      "editorLineNumber.activeForeground": "#4f6c8d",
      "editor.selectionBackground": "#a7f3d0",
      "editor.inactiveSelectionBackground": "#e8f1f9",
      "editor.findMatchBackground": "#fde68a",
      "editor.findMatchHighlightBackground": "#fef3c7",
      "editorCursor.foreground": "#059669",
      "editorIndentGuide.background1": "#e4ecf5",
      "editorIndentGuide.activeBackground1": "#c9d6e6",
      "editorBracketMatch.background": "#a7f3d0",
      "editorBracketMatch.border": "#10b981",
      "editorSuggestWidget.background": "#ffffff",
      "editorSuggestWidget.border": "#c9d6e6",
      "editorSuggestWidget.selectedBackground": "#d1fae5",
      "editorSuggestWidget.highlightForeground": "#059669",
    },
  });
}

// =============================================================
// Custom completion provider for C# with Unity awareness
// =============================================================
function registerUnityCompletions(monaco: Monaco) {
  monaco.languages.registerCompletionItemProvider("csharp", {
    triggerCharacters: ["."],
    provideCompletionItems: (model: editor.ITextModel, position: Position) => {
      const lineText = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineText.slice(0, position.column - 1);

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Are we after a dot? Check for `identifier.` or `identifier. partialWord`
      const dotMatch = textBeforeCursor.match(
        /([A-Za-z_][A-Za-z0-9_]*)\.\s*([A-Za-z_][A-Za-z0-9_]*)?$/
      );

      if (dotMatch) {
        const identifier = dotMatch[1];

        // Is identifier a known type name? (static member access)
        const typeMatch = UNITY_TYPES.find((t) => t.name === identifier);
        if (typeMatch) {
          return {
            suggestions: typeMatch.staticMembers.map((m) =>
              memberToCompletion(m, monaco, range)
            ),
          };
        }

        // Is identifier a common variable name we can infer a type for?
        const inferredTypeName = COMMON_VARIABLES[identifier];
        if (inferredTypeName) {
          const inferredType = UNITY_TYPES.find(
            (t) => t.name === inferredTypeName
          );
          if (inferredType) {
            return {
              suggestions: inferredType.instanceMembers.map((m) =>
                memberToCompletion(m, monaco, range)
              ),
            };
          }
        }

        // Unknown identifier before dot — return no suggestions rather than
        // dumping unrelated completions (less noisy)
        return { suggestions: [] };
      }

      // Top-level completions: types + snippets + keywords
      const suggestions: languages.CompletionItem[] = [
        // Unity types
        ...UNITY_TYPES.map((t) => ({
          label: t.name,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: t.name,
          documentation: t.documentation
            ? { value: t.documentation }
            : undefined,
          detail: "Unity type",
          range,
        })),
        // Lifecycle method snippets
        ...UNITY_SNIPPETS.map((s) => ({
          label: s.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: s.insertText,
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: { value: s.documentation },
          detail: "Unity snippet",
          range,
        })),
        // C# keywords
        ...CSHARP_KEYWORDS.map((k) => ({
          label: k,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: k,
          range,
        })),
      ];

      return { suggestions };
    },
  });
}

function memberToCompletion(
  member: UnityMember,
  monaco: Monaco,
  range: languages.CompletionItem["range"]
): languages.CompletionItem {
  const kindMap: Record<string, languages.CompletionItemKind> = {
    method: monaco.languages.CompletionItemKind.Method,
    property: monaco.languages.CompletionItemKind.Property,
    field: monaco.languages.CompletionItemKind.Field,
    event: monaco.languages.CompletionItemKind.Event,
    enum: monaco.languages.CompletionItemKind.EnumMember,
    class: monaco.languages.CompletionItemKind.Class,
  };

  const insertText = member.insertText ?? member.name;
  const isSnippet = insertText.includes("${");

  return {
    label: member.name,
    kind: kindMap[member.kind] ?? monaco.languages.CompletionItemKind.Text,
    insertText,
    insertTextRules: isSnippet
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    detail: member.signature ?? member.name,
    documentation: member.documentation
      ? { value: member.documentation }
      : undefined,
    range,
  };
}