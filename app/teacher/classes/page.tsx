import Link from "next/link";
import { Users, Upload, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ClassesPage() {
  const supabase = await createClient();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, period_number, term, enrollments(count)")
    .order("period_number", { ascending: true, nullsFirst: false });

  return (
    <>
      <PageHeader
        eyebrow="Teacher"
        title="Classes"
        description="Your three Game Design sections and their rosters."
        action={
          <Link href="/teacher/classes/import">
            <Button>
              <Upload className="w-4 h-4" strokeWidth={2} />
              Import CSV
            </Button>
          </Link>
        }
      />

      {!classes || classes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No classes yet"
            description="Import a CSV roster to create your first class and student accounts."
            action={
              <Link href="/teacher/classes/import">
                <Button>
                  <Upload className="w-4 h-4" strokeWidth={2} />
                  Import your first CSV
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((c) => {
            const count =
              Array.isArray(c.enrollments) && c.enrollments[0]
                ? c.enrollments[0].count
                : 0;
            return (
              <Link
                key={c.id}
                href={`/teacher/classes/${c.id}`}
                className="block"
              >
                <Card hoverable className="group h-full">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {c.period_number && (
                        <p className="label-eyebrow mb-1.5">
                          Period {c.period_number}
                        </p>
                      )}
                      <h3 className="font-display text-xl text-wood-900 truncate">
                        {c.name}
                      </h3>
                      <p className="text-sm text-wood-600 mt-1">{c.term}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-display text-2xl text-terracotta-700">
                        {count}
                      </p>
                      <p className="text-[0.7rem] uppercase tracking-wide-label text-wood-500 font-semibold">
                        {count === 1 ? "student" : "students"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-terracotta-700 mt-4 pt-4 border-t border-wood-100">
                    <span>Roster &amp; settings</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

