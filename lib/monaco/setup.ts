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
// Stardrop cozy theme — terracotta keywords, sage strings,
// honey numbers, on cream background
// =============================================================
function defineStardropTheme(monaco: Monaco) {
  monaco.editor.defineTheme("stardrop-cozy", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "876043", fontStyle: "italic" },
      { token: "string", foreground: "476c40" },
      { token: "keyword", foreground: "c25831", fontStyle: "bold" },
      { token: "keyword.cs", foreground: "c25831", fontStyle: "bold" },
      { token: "number", foreground: "b66916" },
      { token: "type", foreground: "a1442b" },
      { token: "type.identifier", foreground: "a1442b" },
      { token: "identifier", foreground: "4c362a" },
      { token: "delimiter", foreground: "876043" },
      { token: "operator", foreground: "876043" },
    ],
    colors: {
      "editor.background": "#fefcf8",
      "editor.foreground": "#4c362a",
      "editor.lineHighlightBackground": "#fbf6ea",
      "editor.lineHighlightBorder": "#fbf6ea",
      "editorLineNumber.foreground": "#cdb088",
      "editorLineNumber.activeForeground": "#a17651",
      "editor.selectionBackground": "#f4d0b6",
      "editor.inactiveSelectionBackground": "#f6ecd1",
      "editor.findMatchBackground": "#f8de8c",
      "editor.findMatchHighlightBackground": "#fcefc8",
      "editorCursor.foreground": "#c25831",
      "editorIndentGuide.background1": "#f1e8db",
      "editorIndentGuide.activeBackground1": "#e1cfb3",
      "editorBracketMatch.background": "#f4d0b6",
      "editorBracketMatch.border": "#d56f3e",
      "editorSuggestWidget.background": "#fefcf8",
      "editorSuggestWidget.border": "#e1cfb3",
      "editorSuggestWidget.selectedBackground": "#fae9dd",
      "editorSuggestWidget.highlightForeground": "#c25831",
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