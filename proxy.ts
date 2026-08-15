import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedPage = createRouteMatcher(["/manage(.*)"]);

// /api/manage is intentionally NOT protected here — auth.protect() redirects
// unauthenticated requests to Clerk's hosted accounts.dev sign-in even for
// API/fetch callers, which is exactly the leak this app avoids everywhere
// else. The route handlers do their own auth check via getOrLinkUser() and
// return a clean 401 JSON response instead.
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedPage(req)) {
    await auth.protect({ unauthenticatedUrl: new URL("/login", req.url).toString() });
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
