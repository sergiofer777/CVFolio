import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits, resolvePlan, type ProfilePlan } from "@/lib/billing/access";
import { UploadPageClient } from "@/components/upload/upload-page-client";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=%2Fupload");
  }

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan = resolvePlan(
    ((profileRaw as { plan?: ProfilePlan } | null)?.plan ?? "free") as ProfilePlan
  );
  const limit = getPlanLimits(plan).generationLimit;

  if (limit !== null) {
    const { count } = await supabase
      .from("portfolios")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", user.id);

    if ((count ?? 0) >= limit) {
      const { data: latestPortfolio } = await supabase
        .from("portfolios")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const latestPortfolioId = (latestPortfolio as { id?: string } | null)?.id;
      const query = new URLSearchParams({
        limit: "generation",
        from: "upload",
      });
      if (latestPortfolioId) query.set("portfolioId", latestPortfolioId);
      redirect(`/dashboard?${query.toString()}`);
    }
  }

  return <UploadPageClient />;
}
