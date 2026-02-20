import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ROOT_DOMAIN = (process.env.ROOT_DOMAIN ?? "webiculum.com").toLowerCase();
const APP_SUBDOMAIN = (process.env.APP_SUBDOMAIN ?? "app").toLowerCase();
const RESERVED_SUBDOMAINS = new Set([
  APP_SUBDOMAIN,
  "www",
  "api",
  "admin",
]);

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, "");
}

function extractTenantSubdomain(host: string): string | null {
  if (host === ROOT_DOMAIN) return null;

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = host.slice(0, -(ROOT_DOMAIN.length + 1));
    if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;
    if (subdomain.includes(".")) return null;
    return subdomain;
  }

  // Soporte local opcional: usuario.lvh.me / usuario.localhost
  if (host.endsWith(".lvh.me") || host.endsWith(".localhost")) {
    const subdomain = host.split(".")[0];
    if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;
    return subdomain;
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const host = normalizeHost(request.headers.get("host") ?? request.nextUrl.host);
  const tenant = extractTenantSubdomain(host);

  if (tenant) {
    const url = request.nextUrl.clone();
    url.pathname = `/p/${tenant}`;
    return NextResponse.rewrite(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
