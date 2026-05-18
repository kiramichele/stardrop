import Link from "next/link";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import ImportForm from "./ImportForm";

export default async function ImportPage() {
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, term")
    .order("name", { ascending: true });

  return (
    <>
      <Link
        href="/teacher/classes"
        className="inline-flex items-center gap-1.5 text-sm text-wood-600 hover:text-terracotta-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to classes
      </Link>

      <PageHeader
        eyebrow="Roster import"
        title="Import students from CSV"
        description="Generate usernames and passwords in bulk. Re-running the same file is safe — duplicates are skipped."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ImportForm classes={classes ?? []} />
        </div>

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-wood-500" strokeWidth={1.75} />
            <h3 className="font-display text-lg text-wood-900">CSV format</h3>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="label-eyebrow mb-1">Required columns</dt>
              <dd className="text-wood-700 font-mono text-xs leading-relaxed">
                first_name<br />
                last_name<br />
                real_email
              </dd>
            </div>
            <div>
              <dt className="label-eyebrow mb-1">Optional columns</dt>
              <dd className="text-wood-700 font-mono text-xs leading-relaxed">
                student_id<br />
                section
              </dd>
            </div>
            <div>
              <dt className="label-eyebrow mb-1">How sections work</dt>
              <dd className="text-wood-600 text-xs leading-relaxed">
                Include a <code className="text-terracotta-700 font-mono">section</code> column
                to import multiple classes at once. Or skip it and pick one
                existing class to import into.
              </dd>
            </div>
          </dl>
          <a
            href="/roster-template.csv"
            download
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-terracotta-700 hover:text-terracotta-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download template
          </a>
        </Card>
      </div>
    </>
  );
}