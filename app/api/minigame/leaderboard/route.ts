import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID_GAMES = new Set(["snake", "runner", "skills", "flappy"]);

type LeaderboardRow = {
  id?: string;
  user_id?: string | null;
  display_name?: string | null;
  game_type?: string | null;
  score?: number | null;
  updated_at?: string | null;
};

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

function normalizeGameType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return VALID_GAMES.has(normalized) ? normalized : null;
}

function normalizeScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.max(0, Math.floor(value));
  return normalized;
}

async function loadLeaderboard(admin: any, gameType: string) {
  const { data, error } = await admin
    .from("minigame_scores")
    .select("display_name, score, updated_at")
    .eq("game_type", gameType)
    .order("score", { ascending: false })
    .order("updated_at", { ascending: true })
    .limit(5);

  if (error) {
    if (isMissingRelationError(error)) {
      return { leaderboardEnabled: false, entries: [] };
    }
    throw error;
  }

  const rows = (data as LeaderboardRow[] | null) ?? [];

  return {
    leaderboardEnabled: true,
    entries: rows.map((row, index) => ({
      rank: index + 1,
      displayName: row.display_name?.trim() || "Jugador",
      score: typeof row.score === "number" ? row.score : 0,
    })),
  };
}

async function buildDisplayName(params: {
  admin: any;
  userId: string;
  fallbackEmail?: string | null;
  fallbackName?: string | null;
}): Promise<string> {
  const { data } = await params.admin
    .from("profiles")
    .select("username")
    .eq("id", params.userId)
    .maybeSingle();

  const username = (data as { username?: string } | null)?.username?.trim();
  if (username) return username;

  const fullName = params.fallbackName?.trim();
  if (fullName) return fullName;

  const emailPrefix = params.fallbackEmail?.split("@")?.[0]?.trim();
  if (emailPrefix) return emailPrefix;

  return "Jugador";
}

async function getUserSharePreference(params: {
  admin: any;
  userId: string;
}): Promise<boolean | null> {
  const { data, error } = await params.admin
    .from("minigame_preferences")
    .select("share_scores")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }

  const row = data as PreferenceRow | null;
  return typeof row?.share_scores === "boolean" ? row.share_scores : null;
}

export async function GET(request: NextRequest) {
  try {
    const gameType = normalizeGameType(request.nextUrl.searchParams.get("game"));
    if (!gameType) {
      return NextResponse.json({ error: "Invalid game type" }, { status: 400 });
    }

    const admin = createAdminClient();
    const leaderboard = await loadLeaderboard(admin, gameType);
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("[minigame/leaderboard] GET error:", error);
    return NextResponse.json(
      { error: "Could not load leaderboard." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      gameType?: unknown;
      score?: unknown;
    };

    const gameType = normalizeGameType(body.gameType);
    const score = normalizeScore(body.score);

    if (!gameType || score === null) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const admin = createAdminClient();
    let saved = false;
    let consentChoice: boolean | null = null;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      consentChoice = await getUserSharePreference({
        admin,
        userId: user.id,
      });

      if (consentChoice === true) {
        const displayName = await buildDisplayName({
          admin,
          userId: user.id,
          fallbackEmail: user.email ?? null,
          fallbackName:
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : null,
        });

        const { data: existing, error: existingError } = await admin
          .from("minigame_scores")
          .select("id, score")
          .eq("user_id", user.id)
          .eq("game_type", gameType)
          .maybeSingle();

        if (existingError && !isMissingRelationError(existingError)) {
          throw existingError;
        }

        if (!isMissingRelationError(existingError)) {
          const existingRow = existing as LeaderboardRow | null;
          const previousScoreRaw = existingRow?.score;
          const previousScore =
            typeof previousScoreRaw === "number" ? previousScoreRaw : null;

          if (!existing) {
            const { error: insertError } = await admin.from("minigame_scores").insert({
              user_id: user.id,
              display_name: displayName,
              game_type: gameType,
              score,
              updated_at: new Date().toISOString(),
            });

            if (insertError) throw insertError;
            saved = true;
          } else if (previousScore === null || score > previousScore) {
            const { error: updateError } = await admin
              .from("minigame_scores")
              .update({
                display_name: displayName,
                score,
                updated_at: new Date().toISOString(),
              })
              .eq("id", (existing as LeaderboardRow).id);

            if (updateError) throw updateError;
            saved = true;
          }
        }
      }
    }

    const leaderboard = await loadLeaderboard(admin, gameType);
    return NextResponse.json({
      ...leaderboard,
      saved,
      consentChoice,
    });
  } catch (error) {
    console.error("[minigame/leaderboard] POST error:", error);
    return NextResponse.json(
      { error: "Could not update leaderboard." },
      { status: 500 }
    );
  }
}
