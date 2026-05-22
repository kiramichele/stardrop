"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { CodeEditor } from "@/components/editor/CodeEditor";
import {
  IconButton,
  SaveCancelButtons,
} from "@/components/exam-prep/EditControls";
import type { CodeExample } from "@/lib/exam-prep";
import {
  createCodeExample,
  updateCodeExample,
  deleteCodeExample,
} from "@/app/exam-prep/manage-actions";

function ExampleForm({
  example,
  code,
  onCodeChange,
  onSubmit,
  onCancel,
  saveLabel,
}: {
  example?: CodeExample;
  code: string;
  onCodeChange: (value: string) => void;
  onSubmit: (fd: FormData) => Promise<void>;
  onCancel: () => void;
  saveLabel: string;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          defaultValue={example?.title ?? ""}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={example?.description ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          name="category"
          defaultValue={example?.category ?? "General"}
        />
      </div>
      <div>
        <Label>Code — type or paste your C#</Label>
        <CodeEditor value={code} onChange={onCodeChange} height="320px" />
        <input type="hidden" name="code" value={code} />
      </div>
      <SaveCancelButtons onCancel={onCancel} saveLabel={saveLabel} />
    </form>
  );
}

export function CodeExampleManager({
  examples,
}: {
  examples: CodeExample[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");

  function startAdd() {
    setEditingId(null);
    setCode("");
    setAdding(true);
  }
  function startEdit(ex: CodeExample) {
    setAdding(false);
    setCode(ex.code);
    setEditingId(ex.id);
  }
  function reset() {
    setAdding(false);
    setEditingId(null);
    setCode("");
  }

  return (
    <div className="space-y-4">
      <Card>
        {adding ? (
          <ExampleForm
            code={code}
            onCodeChange={setCode}
            onSubmit={async (fd) => {
              await createCodeExample(fd);
              reset();
            }}
            onCancel={reset}
            saveLabel="Add example"
          />
        ) : (
          <Button size="sm" onClick={startAdd}>
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add code example
          </Button>
        )}
      </Card>

      {examples.length === 0 ? (
        <Card>
          <p className="text-sm text-wood-500 text-center py-4">
            No code examples yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {examples.map((ex) => (
            <Card
              key={ex.id}
              padded={editingId === ex.id}
              className="overflow-hidden"
            >
              {editingId === ex.id ? (
                <ExampleForm
                  example={ex}
                  code={code}
                  onCodeChange={setCode}
                  onSubmit={async (fd) => {
                    await updateCodeExample(ex.id, fd);
                    reset();
                  }}
                  onCancel={reset}
                  saveLabel="Save"
                />
              ) : (
                <>
                  <div className="p-4 pb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg text-wood-900">
                          {ex.title}
                        </h3>
                        <span className="flex-shrink-0 text-[0.65rem] uppercase tracking-wide-label font-semibold px-2 py-0.5 rounded-cozy bg-cream-200 text-wood-600">
                          {ex.category}
                        </span>
                      </div>
                      {ex.description && (
                        <p className="text-sm text-wood-600 mt-0.5">
                          {ex.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <IconButton
                        onClick={() => startEdit(ex)}
                        title="Edit example"
                      >
                        <Pencil className="w-4 h-4" />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          if (confirm(`Delete "${ex.title}"?`)) {
                            deleteCodeExample(ex.id);
                          }
                        }}
                        title="Delete example"
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </div>
                  <pre className="bg-cream-50 border-t border-wood-200 p-4 overflow-x-auto text-sm font-mono text-wood-900 leading-relaxed">
                    {ex.code}
                  </pre>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
