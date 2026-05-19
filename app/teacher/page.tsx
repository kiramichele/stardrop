"use client";

import { useEffect, useState } from "react";
import { Clipboard, Keyboard, Eye, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CodeEditor, type PasteEvent } from "@/components/editor/CodeEditor";

const STARTER_CODE = `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public float speed = 5f;

    void Start()
    {
        Debug.Log("Player ready");
    }

    void Update()
    {
        float horizontal = Input.GetAxis("Horizontal");
        transform.Translate(Vector3.right * horizontal * speed * Time.deltaTime);
    }
}
`;

const STORAGE_KEY = "stardrop:sandbox:code";

export default function SandboxPage() {
  const [code, setCode] = useState(STARTER_CODE);
  const [pastes, setPastes] = useState<PasteEvent[]>([]);
  const [keystrokes, setKeystrokes] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load saved code from localStorage on mount
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setCode(saved);
    setHydrated(true);
  }, []);

  // Save code to localStorage on every change
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, code);
  }, [code, hydrated]);

  function reset() {
    setCode(STARTER_CODE);
    setPastes([]);
    setKeystrokes(0);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  const totalPasted = pastes.reduce((sum, p) => sum + p.length, 0);
  const pasteRatio =
    code.length > 0 ? Math.round((totalPasted / code.length) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Sandbox · dev"
        title="Code editor"
        description="Test the Monaco editor with Unity autocomplete. Try typing 'transform.', 'Debug.', or 'Vector3.' to see suggestions. Your work auto-saves locally."
        action={
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
            Reset
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor — 2/3 */}
        <div className="lg:col-span-2">
          <CodeEditor
            value={code}
            onChange={setCode}
            onPaste={(e) => setPastes((prev) => [...prev, e])}
            onKeystroke={() => setKeystrokes((k) => k + 1)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            height="65vh"
          />
        </div>

        {/* Tracking panel — 1/3 */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-display text-lg text-wood-900 mb-4">
              Live tracking
            </h3>
            <dl className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-wood-600">
                  <Keyboard className="w-4 h-4" strokeWidth={1.75} />
                  Keystrokes
                </dt>
                <dd className="font-display text-lg text-wood-900">
                  {keystrokes}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-wood-600">
                  <Clipboard className="w-4 h-4" strokeWidth={1.75} />
                  Paste events
                </dt>
                <dd className="font-display text-lg text-wood-900">
                  {pastes.length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-wood-600">
                  <Clipboard className="w-4 h-4" strokeWidth={1.75} />
                  Chars pasted
                </dt>
                <dd className="font-display text-lg text-wood-900">
                  {totalPasted}
                </dd>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-wood-100">
                <dt className="flex items-center gap-2 text-wood-600">
                  <Eye className="w-4 h-4" strokeWidth={1.75} />
                  Focused
                </dt>
                <dd
                  className={[
                    "text-xs font-semibold uppercase tracking-wide-label",
                    isFocused ? "text-sage-700" : "text-wood-400",
                  ].join(" ")}
                >
                  {isFocused ? "Yes" : "No"}
                </dd>
              </div>
            </dl>

            {code.length > 0 && (
              <div className="mt-5 pt-4 border-t border-wood-100">
                <p className="label-eyebrow mb-2">Paste ratio</p>
                <div className="flex items-baseline gap-2">
                  <p className="font-display text-3xl text-terracotta-700">
                    {pasteRatio}%
                  </p>
                  <p className="text-xs text-wood-500">
                    of code came from pastes
                  </p>
                </div>
                <div className="mt-2 h-2 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className={[
                      "h-full transition-all duration-300",
                      pasteRatio > 50
                        ? "bg-terracotta-500"
                        : pasteRatio > 25
                          ? "bg-honey-500"
                          : "bg-sage-500",
                    ].join(" ")}
                    style={{ width: `${Math.min(pasteRatio, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </Card>

          {pastes.length > 0 && (
            <Card>
              <h3 className="font-display text-base text-wood-900 mb-3">
                Recent pastes
              </h3>
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {pastes
                  .slice(-5)
                  .reverse()
                  .map((p, i) => (
                    <li
                      key={i}
                      className="text-xs bg-cream-100 rounded-cozy p-2"
                    >
                      <div className="flex items-center justify-between text-wood-500 mb-1">
                        <span>{p.length} chars</span>
                        <span>
                          {new Date(p.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="font-mono text-wood-700 line-clamp-3 whitespace-pre-wrap break-all">
                        {p.content}
                      </pre>
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          <Card className="bg-cream-100 border-wood-200">
            <h3 className="font-display text-base text-wood-900 mb-2">
              Try it
            </h3>
            <ul className="text-xs text-wood-700 space-y-1.5 list-disc list-inside marker:text-wood-400">
              <li>
                Type <code className="text-terracotta-700">transform.</code> to
                see Transform members
              </li>
              <li>
                Type <code className="text-terracotta-700">Debug.</code> for
                logging methods
              </li>
              <li>
                Type <code className="text-terracotta-700">Vector3.</code> for
                static helpers
              </li>
              <li>
                Type <code className="text-terracotta-700">Start</code> for
                the lifecycle snippet
              </li>
              <li>Paste some code to see paste tracking</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}