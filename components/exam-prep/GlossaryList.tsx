"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { CsvImport } from "@/components/exam-prep/CsvImport";
import {
  IconButton,
  SaveCancelButtons,
} from "@/components/exam-prep/EditControls";
import type { GlossaryTerm } from "@/lib/exam-prep";
import {
  createGlossaryTerm,
  updateGlossaryTerm,
  deleteGlossaryTerm,
  importGlossaryCsv,
} from "@/app/exam-prep/manage-actions";

const TEMPLATE = `term,definition
GameObject,The fundamental object in a Unity scene.
Transform,Stores a GameObject's position rotation and scale.
`;

function TermFields({ term }: { term?: GlossaryTerm }) {
  return (
    <>
      <div>
        <Label htmlFor="term">Term</Label>
        <Input
          id="term"
          name="term"
          defaultValue={term?.term ?? ""}
          required
        />
      </div>
      <div>
        <Label htmlFor="definition">Definition</Label>
        <Textarea
          id="definition"
          name="definition"
          rows={3}
          defaultValue={term?.definition ?? ""}
          required
        />
      </div>
    </>
  );
}

export function GlossaryList({
  terms,
  isTeacher,
}: {
  terms: GlossaryTerm[];
  isTeacher: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? terms.filter((t) =>
        `${t.term} ${t.definition}`.toLowerCase().includes(q)
      )
    : terms;

  return (
    <div className="space-y-4">
      {isTeacher && (
        <Card>
          {adding ? (
            <form
              action={async (fd) => {
                await createGlossaryTerm(fd);
                setAdding(false);
              }}
              className="space-y-3"
            >
              <TermFields />
              <SaveCancelButtons
                onCancel={() => setAdding(false)}
                saveLabel="Add term"
              />
            </form>
          ) : (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add term
            </Button>
          )}
          <div className="mt-4 pt-4 border-t border-wood-100">
            <p className="label-eyebrow mb-2">Bulk import</p>
            <CsvImport
              columns="term, definition"
              templateName="glossary-template.csv"
              templateContent={TEMPLATE}
              onImport={importGlossaryCsv}
            />
          </div>
        </Card>
      )}

      {terms.length === 0 ? (
        <Card>
          <p className="text-sm text-wood-500 text-center py-4">
            No terms yet.
          </p>
        </Card>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wood-400 pointer-events-none" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms…"
              className="pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <Card>
              <p className="text-sm text-wood-500 text-center py-4">
                No terms match &quot;{query}&quot;.
              </p>
            </Card>
          ) : (
            <Card padded={false} className="overflow-hidden">
              <ul className="divide-y divide-wood-100">
                {filtered.map((t) => (
                  <li key={t.id} className="px-5 py-3.5">
                    {isTeacher && editingId === t.id ? (
                      <form
                        action={async (fd) => {
                          await updateGlossaryTerm(t.id, fd);
                          setEditingId(null);
                        }}
                        className="space-y-3"
                      >
                        <TermFields term={t} />
                        <SaveCancelButtons
                          onCancel={() => setEditingId(null)}
                        />
                      </form>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-base text-wood-900">
                            {t.term}
                          </p>
                          <p className="text-sm text-wood-600 mt-0.5 leading-relaxed">
                            {t.definition}
                          </p>
                        </div>
                        {isTeacher && (
                          <div className="flex gap-0.5 flex-shrink-0">
                            <IconButton
                              onClick={() => setEditingId(t.id)}
                              title="Edit term"
                            >
                              <Pencil className="w-4 h-4" />
                            </IconButton>
                            <IconButton
                              onClick={() => {
                                if (confirm(`Delete "${t.term}"?`)) {
                                  deleteGlossaryTerm(t.id);
                                }
                              }}
                              title="Delete term"
                            >
                              <Trash2 className="w-4 h-4" />
                            </IconButton>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
