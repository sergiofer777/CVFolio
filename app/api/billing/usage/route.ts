import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ProfilePlan } from "@/lib/billing/access";
import { consumeUsage, getUsageSnapshot } from "@/lib/billing/quotas";

const consumeSchema = z.object({
  metric: z.enum(["generation", "chat_iteration"]),
});

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
    const { data: profileRaw, error: profileError } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const plan =
      ((profileRaw as { plan?: ProfilePlan } | null)?.plan ?? "free") as ProfilePlan;
    const usage = await getUsageSnapshot({
      admin,
      userId: user.id,
      plan,
    });

    return NextResponse.json({ usage });
  } catch (error) {
    console.error("[billing/usage][GET] error:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el uso de tu plan." },
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
    const parsed = consumeSchema.safeParse(body);
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
    const consumeResult = await consumeUsage({
      admin,
      userId: user.id,
      plan,
      metric: parsed.data.metric,
    });

    if (!consumeResult.allowed) {
      return NextResponse.json(
        { error: consumeResult.reason ?? "Límite alcanzado", usage: consumeResult },
        { status: 402 }
      );
    }

    return NextResponse.json({ usage: consumeResult });
  } catch (error) {
    console.error("[billing/usage][POST] error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el uso del plan." },
      { status: 500 }
    );
  }
}
