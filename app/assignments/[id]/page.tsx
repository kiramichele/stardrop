import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

// Role-aware deep link for an assignment — the URL teachers paste into
// Canvas. Sends students to the student view and teachers to the teacher
// view. Login is required (middleware bounces anonymous visitors to /login).
export default async function AssignmentRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const base =
    user.role === "teacher" ? "/teacher/assignments" : "/student/assignments";
  redirect(`${base}/${id}`);
}
