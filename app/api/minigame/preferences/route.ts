import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PreferenceRow = {
  share_scores?: boolean | null;
};

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  if (!err.message) return false;
  return /relation .* does not exist|table .* does not exist/i.test(err.message);
}

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("minigame_preferences")
      .select("share_scores")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return NextResponse.json({
          preferenceEnabled: false,
          consentChoice: null,
        });
      }
      throw error;
    }

    const row = data as PreferenceRow | null;
    return NextResponse.json({
      preferenceEnabled: true,
      consentChoice:
        typeof row?.share_scores === "boolean" ? row.share_scores : null,
    });
  } catch (error) {
    console.error("[minigame/preferences] GET error:", error);
    return NextResponse.json(
      { error: "Could not load minigame preference." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { shareScores?: unknown };
    if (typeof body.shareScores !== "boolean") {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: existing, error: existingError } = await admin
      .from("minigame_preferences")
      .select("share_scores")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      if (isMissingRelationError(existingError)) {
        return NextResponse.json({
          preferenceEnabled: false,
          consentChoice: body.shareScores,
        });
      }
      throw existingError;
    }

    const existingChoice = (existing as PreferenceRow | null)?.share_scores;
    if (typeof existingChoice === "boolean") {
      return NextResponse.json({
        preferenceEnabled: true,
        consentChoice: existingChoice,
      });
    }

    const { error: insertError } = await admin.from("minigame_preferences").insert({
      user_id: user.id,
      share_scores: body.shareScores,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      preferenceEnabled: true,
      consentChoice: body.shareScores,
    });
  } catch (error) {
    console.error("[minigame/preferences] POST error:", error);
    return NextResponse.json(
      { error: "Could not save minigame preference." },
      { status: 500 }
    );
  }
}
