import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isPaidPlan, type ProfilePlan } from "@/lib/billing/access";
import { isBillingEnforcementEnabled } from "@/lib/billing/config";

export const runtime = "nodejs";

const requestDomainSchema = z.object({
  domain: z.string().min(4).max(253),
  notes: z.string().max(500).optional(),
});

function normalizeDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, "");
  return withoutProtocol.split("/")[0] ?? "";
}

function isValidDomain(value: string): boolean {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value);
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  if (!err.message) return false;
  return /relation .* does not exist|table .* does not exist/i.test(err.message);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("domain_requests")
      .select(
        "id, requested_domain, status, provider, price_cents, currency, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) {
        const { data: profile } = await admin
          .from("profiles")
          .select("custom_domain")
          .eq("id", user.id)
          .maybeSingle();

        const customDomain =
          (profile as { custom_domain?: string | null } | null)?.custom_domain ??
          null;
        return NextResponse.json({
          requests: customDomain
            ? [{ requested_domain: customDomain, status: "pending" }]
            : [],
          storageReady: false,
        });
      }
      throw error;
    }

    return NextResponse.json({ requests: data ?? [], storageReady: true });
  } catch (error) {
    console.error("[domains/custom][GET] error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las solicitudes de dominio." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestDomainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: profileRaw, error: profileError } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const plan =
      ((profileRaw as { plan?: ProfilePlan } | null)?.plan ?? "free") as ProfilePlan;
    if (isBillingEnforcementEnabled() && !isPaidPlan(plan)) {
      return NextResponse.json(
        {
          error:
            "Necesitas un plan de pago para solicitar compra de dominio personalizado.",
        },
        { status: 402 }
      );
    }

    const normalizedDomain = normalizeDomain(parsed.data.domain);
    if (!isValidDomain(normalizedDomain)) {
      return NextResponse.json(
        { error: "Dominio no válido. Ejemplo correcto: miweb.com" },
        { status: 400 }
      );
    }

    const payload = {
      user_id: user.id,
      requested_domain: normalizedDomain,
      status: "pending",
      provider: "manual",
      notes: parsed.data.notes ?? null,
      currency: "EUR",
    };

    const { data, error } = await admin
      .from("domain_requests")
      .insert(payload)
      .select("id, requested_domain, status, created_at")
      .single();

    if (error) {
      if (!isMissingRelationError(error)) {
        throw error;
      }

      const { error: fallbackError } = await admin
        .from("profiles")
        .update({ custom_domain: normalizedDomain })
        .eq("id", user.id);
      if (fallbackError) throw fallbackError;

      return NextResponse.json(
        {
          request: {
            requested_domain: normalizedDomain,
            status: "pending",
          },
          storageReady: false,
          message:
            "Solicitud guardada en perfil. Crea la tabla domain_requests para flujo completo.",
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ request: data, storageReady: true }, { status: 201 });
  } catch (error) {
    console.error("[domains/custom][POST] error:", error);
    return NextResponse.json(
      { error: "No se pudo registrar la solicitud de dominio." },
      { status: 500 }
    );
  }
}
