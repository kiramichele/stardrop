"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea, Select } from "@/components/ui/Input";
import { CsvImport } from "@/components/exam-prep/CsvImport";
import {
  IconButton,
  SaveCancelButtons,
} from "@/components/exam-prep/EditControls";
import { EXAM_CATEGORIES, type ExamQuestion } from "@/lib/exam-prep";
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  importQuestionsCsv,
} from "@/app/exam-prep/manage-actions";

const LETTERS = ["a", "b", "c", "d"];
const LETTER_LABEL = ["A", "B", "C", "D"];

const TEMPLATE = `question,choice_a,choice_b,choice_c,choice_d,correct,explanation,category,code
Which method runs once per frame?,Awake(),Start(),Update(),FixedUpdate(),c,Update() is called every frame.,Scripting & C#,
What does this code print?,5,10,15,Error,b,x starts at 5 then adds 5.,Scripting & C#,"int x = 5; x += 5; Debug.Log(x);"
`;

function QuestionFields({ q }: { q?: ExamQuestion }) {
  const choices = q?.choices ?? ["", "", "", ""];
  const correctLetter = q ? LETTERS[q.correctIndex] : "a";
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="question">Question</Label>
        <Textarea
          id="question"
          name="question"
          rows={2}
          defaultValue={q?.question ?? ""}
          required
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LETTERS.map((letter, i) => (
          <div key={letter}>
            <Label htmlFor={`choice_${letter}`}>
              Choice {LETTER_LABEL[i]}
            </Label>
            <Input
              id={`choice_${letter}`}
              name={`choice_${letter}`}
              defaultValue={choices[i] ?? ""}
              required
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="correct">Correct answer</Label>
          <Select id="correct" name="correct" defaultValue={correctLetter}>
            {LETTERS.map((letter, i) => (
              <option key={letter} value={letter}>
                Choice {LETTER_LABEL[i]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            list="exam-prep-categories"
            defaultValue={q?.category ?? "General"}
          />
          <datalist id="exam-prep-categories">
            {EXAM_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <Label htmlFor="explanation">
          Explanation{" "}
          <span className="text-wood-500 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="explanation"
          name="explanation"
          rows={2}
          defaultValue={q?.explanation ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="code">
          Code snippet{" "}
          <span className="text-wood-500 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="code"
          name="code"
          rows={4}
          defaultValue={q?.code ?? ""}
          placeholder="Leave blank for a question with no code part"
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

export function QuestionManager({
  questions,
}: {
  questions: ExamQuestion[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        {adding ? (
          <form
            action={async (fd) => {
              await createQuestion(fd);
              setAdding(false);
            }}
            className="space-y-3"
          >
            <QuestionFields />
            <SaveCancelButtons
              onCancel={() => setAdding(false)}
              saveLabel="Add question"
            />
          </form>
        ) : (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add question
          </Button>
        )}
        <div className="mt-4 pt-4 border-t border-wood-100">
          <p className="label-eyebrow mb-2">Bulk import</p>
          <CsvImport
            columns="question, choice_a, choice_b, choice_c, choice_d, correct, explanation, category, code (optional)"
            templateName="questions-template.csv"
            templateContent={TEMPLATE}
            onImport={importQuestionsCsv}
          />
        </div>
      </Card>

      {questions.length === 0 ? (
        <Card>
          <p className="text-sm text-wood-500 text-center py-4">
            No questions yet.
          </p>
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <ul className="divide-y divide-wood-100">
            {questions.map((q) => (
              <li key={q.id} className="p-4">
                {editingId === q.id ? (
                  <form
                    action={async (fd) => {
                      await updateQuestion(q.id, fd);
                      setEditingId(null);
                    }}
                    className="space-y-3"
                  >
                    <QuestionFields q={q} />
                    <SaveCancelButtons onCancel={() => setEditingId(null)} />
                  </form>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-wood-900">
                        {q.question}
                      </p>
                      <p className="text-xs text-wood-500 mt-1">
                        {q.category}
                        <span className="text-wood-300"> · </span>
                        <span className="text-sage-700">
                          Correct: {LETTER_LABEL[q.correctIndex]}){" "}
                          {q.choices[q.correctIndex]}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <IconButton
                        onClick={() => setEditingId(q.id)}
                        title="Edit question"
                      >
                        <Pencil className="w-4 h-4" />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          if (confirm("Delete this question?")) {
                            deleteQuestion(q.id);
                          }
                        }}
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
