import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmbeddedCheckoutScreen } from "@/components/billing/embedded-checkout";
import { buildPageMetadata } from "@/lib/seo/metadata";

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string; portfolioId?: string }>;
}

export const metadata: Metadata = buildPageMetadata({
  title: "Checkout",
  description:
    "Secure annual checkout for Webiculum Pro and Studio plans. Activate publishing, custom subdomain, and advanced website features.",
  path: "/checkout",
  keywords: [
    "webiculum checkout",
    "webiculum pro",
    "webiculum studio",
    "portfolio website subscription",
  ],
  imagePath: "/template-previews/ivan-top.png",
  imageAlt: "Webiculum checkout preview",
  noIndex: true,
});

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
