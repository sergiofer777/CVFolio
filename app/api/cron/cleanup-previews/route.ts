import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PREVIEW_TTL_HOURS = 24;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret && headerSecret === secret) return true;

  const bearer = request.headers.get("authorization");
  if (bearer && bearer === `Bearer ${secret}`) return true;

  return false;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized cron call" }, { status: 401 });
    }

    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - PREVIEW_TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { data: freeProfiles, error: profilesError } = await admin
      .from("profiles")
      .select("id")
      .eq("plan", "free");
    if (profilesError) throw profilesError;

    const freeUserIds = ((freeProfiles as Array<{ id: string }> | null) ?? []).map(
      (item) => item.id
    );
    if (freeUserIds.length === 0) {
      return NextResponse.json({
        ok: true,
        portfoliosRemoved: 0,
        uploadsRemoved: 0,
      });
    }

    const { data: stalePortfolios, error: portfoliosError } = await admin
      .from("portfolios")
      .select("id, upload_id")
      .in("user_id", freeUserIds)
      .eq("is_published", false)
      .lt("updated_at", cutoff);
    if (portfoliosError) throw portfoliosError;

    const staleRows =
      (stalePortfolios as Array<{ id: string; upload_id: string | null }> | null) ?? [];
    if (staleRows.length === 0) {
      return NextResponse.json({
        ok: true,
        portfoliosRemoved: 0,
        uploadsRemoved: 0,
      });
    }

    const portfolioIds = staleRows.map((row) => row.id);
    const uploadIds = staleRows
      .map((row) => row.upload_id)
      .filter((value): value is string => Boolean(value));

    if (uploadIds.length > 0) {
      const { data: uploads } = await admin
        .from("cv_uploads")
        .select("id, file_path")
        .in("id", uploadIds);

      const files =
        (uploads as Array<{ id: string; file_path: string }> | null)?.map(
          (upload) => upload.file_path
        ) ?? [];

      if (files.length > 0) {
        await admin.storage.from("cv-uploads").remove(files);
      }

      await admin.from("cv_uploads").delete().in("id", uploadIds);
    }

    await admin.from("portfolios").delete().in("id", portfolioIds);

    return NextResponse.json({
      ok: true,
      portfoliosRemoved: portfolioIds.length,
      uploadsRemoved: uploadIds.length,
      cutoff,
    });
  } catch (error) {
    console.error("[cron/cleanup-previews] error:", error);
    return NextResponse.json(
      { error: "No se pudo limpiar previews expiradas." },
      { status: 500 }
    );
  }
}
