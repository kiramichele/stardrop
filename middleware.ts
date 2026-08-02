import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if expired — required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginPage = path === "/login";
  // Public, shareable pages — the links teachers post to Canvas so anyone
  // (e.g. an admin without an account) can view directions/slides read-only.
  // These match only the share routes: the "/slideshows" list (no trailing
  // slash) and "/teacher|/student" views stay protected.
  const isPublicLesson = path.startsWith("/lessons/");
  const isPublicAssignment = path.startsWith("/assignments/");
  const isPublicSlideshow = path.startsWith("/slideshows/");
  // The HTML files those public pages embed in an iframe are served from the
  // `lessons` storage bucket (lesson / assignment-prompt / slideshow HTML) via
  // this proxy. Let it through so the embedded activity/slides load without a
  // login. Private files (submissions, devlogs, discussion) are NOT whitelisted.
  const isPublicLessonFile = path.startsWith("/api/files/lessons/");
  // Temporary: public diagnostic for PISTON_URL wiring.
  const isDebug = path.startsWith("/api/debug/");
  // The interactive demo — fully self-contained sample data, no auth.
  const isDemo = path === "/demo" || path.startsWith("/demo/");
  const isPublic =
    path === "/" ||
    isLoginPage ||
    isPublicLesson ||
    isPublicAssignment ||
    isPublicSlideshow ||
    isPublicLessonFile ||
    isDebug ||
    isDemo;

  // Not signed in + accessing protected route -> /login, remembering where
  // they were headed so we can bounce them back after they sign in.
  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Signed in + on /login -> straight to their destination (or the dashboard)
  if (user && isLoginPage) {
    const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next ?? "/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - image files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};