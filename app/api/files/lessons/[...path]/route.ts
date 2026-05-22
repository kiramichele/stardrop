import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Proxy route for HTML files in the `lessons` Supabase Storage bucket.
 *
 * Why we need this: loading the Supabase public URL directly in an
 * <iframe> trips modern browsers' cross-origin policies (the iframe
 * gets "blocked:origin" in DevTools, "Domains, protocols and ports
 * must match" in console). Serving through our own domain makes it
 * same-origin from the page's perspective, sidesteps all of it, and
 * gives us explicit control over the Content-Type response header.
 *
 * Path mapping:
 *   /api/files/lessons/foo.html        -> storage path "foo.html"
 *   /api/files/lessons/assignments/x.html -> storage path "assignments/x.html"
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const storagePath = path.join("/");

  // Only serve .html for now (lesson/assignment files). Anything else 404s
  // so the route can't be abused as a generic file proxy.
  if (!storagePath.toLowerCase().endsWith(".html")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("lessons")
    .download(storagePath);

  if (error || !data) {
    return new NextResponse("File not found", { status: 404 });
  }

  const html = await data.text();

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      // Belt-and-suspenders: explicitly allow embedding from any origin
      // (in practice we only embed from our own pages, but no need to
      // restrict). Also opt out of MIME sniffing weirdness.
      "X-Content-Type-Options": "nosniff",
    },
  });
}