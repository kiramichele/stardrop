import { Mail } from "lucide-react";
import { requireFullTeacher } from "@/lib/auth";
import {
  getClassOptionsForDigest,
  getParentDigestHistory,
} from "@/lib/parent-digest-server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ParentDigestForm } from "@/components/students/ParentDigestForm";

export default async function ParentDigestPage() {
  await requireFullTeacher();

  const [classes, history] = await Promise.all([
    getClassOptionsForDigest(),
    getParentDigestHistory(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Families"
        title="Parent digest"
        description="Write a weekly or bi-weekly update and send it straight to parent/guardian emails on file."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ParentDigestForm classes={classes} />
        </div>

        <div>
          <h2 className="font-display text-lg text-wood-800 mb-3">
            Past sends
          </h2>
          {history.length === 0 ? (
            <Card>
              <EmptyState
                icon={Mail}
                title="Nothing sent yet"
                description="Your sent digests show up here, newest first."
              />
            </Card>
          ) : (
            <Card padded={false} className="overflow-hidden">
              <ul className="divide-y divide-wood-100">
                {history.map((h) => (
                  <li key={h.id} className="p-4">
                    <p className="font-medium text-wood-900 truncate">
                      {h.subject}
                    </p>
                    <p className="text-xs text-wood-500 mt-0.5">
                      {new Date(h.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {h.sentByName && ` · ${h.sentByName}`}
                    </p>
                    <p className="text-xs text-wood-500 mt-1">
                      {h.recipientCount}{" "}
                      {h.recipientCount === 1 ? "parent" : "parents"} ·{" "}
                      {h.classLabels ? h.classLabels.join(", ") : "All classes"}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
