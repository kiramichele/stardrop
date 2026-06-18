import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function StarHubRootPage() {
  const user = await requireUser();
  redirect(`/starhub/${user.username}`);
}
