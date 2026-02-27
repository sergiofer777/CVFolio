import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isPaidPlan, resolvePlan, type ProfilePlan } from "@/lib/billing/access";
import { buildPublicPortfolioUrl } from "@/lib/billing/activation";
import { upsertCloudflareSubdomainRecord } from "@/lib/cloudflare/dns";

export const runtime = "nodejs";

const payloadSchema = z.object({
  slug: z.string().min(3).max(32),
});

const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "login",
  "signup",
  "upload",
  "checkout",
  "support",
  "help",
  "blog",
  "status",
  "mail",
  "ftp",
]);

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateSlug(slug: string): string | null {
  if (!slug) return "El subdominio no puede estar vacío.";
  if (slug.length < 3) return "El subdominio debe tener al menos 3 caracteres.";
  if (slug.length > 32) return "El subdominio debe tener como máximo 32 caracteres.";
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/.test(slug)) {
    return "Usa solo letras minúsculas, números y guiones (sin guion al inicio/final).";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return "Ese subdominio está reservado. Elige otro.";
  }
  return null;
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const nextSlug = normalizeSlug(parsed.data.slug);
    const validationError = validateSlug(nextSlug);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: currentProfileRaw, error: currentProfileError } = await admin
      .from("profiles")
      .select("username, plan")
      .eq("id", user.id)
      .maybeSingle();
    if (currentProfileError) throw currentProfileError;

    const currentProfile =
      (currentProfileRaw as { username?: string | null; plan?: ProfilePlan } | null) ??
      null;
    const plan = resolvePlan(currentProfile?.plan);
    if (!isPaidPlan(plan)) {
      return NextResponse.json(
        { error: "Necesitas un plan de pago para configurar subdominio." },
        { status: 402 }
      );
    }

    const currentSlug = currentProfile?.username?.toLowerCase().trim() ?? null;
    if (currentSlug === nextSlug) {
      return NextResponse.json({
        ok: true,
        slug: nextSlug,
        publicUrl: buildPublicPortfolioUrl(nextSlug),
      });
    }

    const { data: conflictProfile, error: conflictError } = await admin
      .from("profiles")
      .select("id")
      .eq("username", nextSlug)
      .neq("id", user.id)
      .maybeSingle();
    if (conflictError) throw conflictError;

    if (conflictProfile) {
      return NextResponse.json(
        { error: "Ese subdominio ya está en uso. Elige otro." },
        { status: 409 }
      );
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update({ username: nextSlug })
      .eq("id", user.id);
    if (updateError) throw updateError;

    try {
      await upsertCloudflareSubdomainRecord(nextSlug);
    } catch (dnsError) {
      console.error("[profile/public-slug] subdomain provision error:", dnsError);
    }

    return NextResponse.json({
      ok: true,
      slug: nextSlug,
      publicUrl: buildPublicPortfolioUrl(nextSlug),
      fallbackUrl: `/p/${nextSlug}`,
    });
  } catch (error) {
    console.error("[profile/public-slug] error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el subdominio." },
      { status: 500 }
    );
  }
}
