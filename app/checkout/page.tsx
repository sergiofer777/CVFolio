import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmbeddedCheckoutScreen } from "@/components/billing/embedded-checkout";

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string; portfolioId?: string }>;
}

function isCheckoutPlan(value: string | undefined): value is "publish" | "studio" {
  return value === "publish" || value === "studio";
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const plan = params.plan;
  const portfolioId = params.portfolioId;

  if (!isCheckoutPlan(plan)) {
    redirect("/#precios");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/checkout?plan=${plan}${portfolioId ? `&portfolioId=${portfolioId}` : ""}`;
    redirect(`/login?redirectTo=${encodeURIComponent(next)}`);
  }

  return <EmbeddedCheckoutScreen plan={plan} portfolioId={portfolioId} />;
}
