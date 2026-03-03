export const PRO_PRICE_CENTS = 999;
export const STUDIO_PRICE_CENTS = 2499;
export const STUDIO_UPGRADE_FROM_PRO_CENTS = Math.max(
  STUDIO_PRICE_CENTS - PRO_PRICE_CENTS,
  0
);

export const PRO_PRICE_EUR = PRO_PRICE_CENTS / 100;
export const STUDIO_PRICE_EUR = STUDIO_PRICE_CENTS / 100;
export const STUDIO_UPGRADE_FROM_PRO_EUR = STUDIO_UPGRADE_FROM_PRO_CENTS / 100;

export function formatEuro(amount: number, locale: "es" | "en" = "es"): string {
  const value =
    locale === "en" ? amount.toFixed(2) : amount.toFixed(2).replace(".", ",");
  return `${value} €`;
}
