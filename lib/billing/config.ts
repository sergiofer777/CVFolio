export function isBillingEnforcementEnabled(): boolean {
  const value =
    process.env.BILLING_ENFORCEMENT_ENABLED ??
    process.env.NEXT_PUBLIC_BILLING_ENFORCEMENT_ENABLED;

  // Enforce by default. Set explicit "false" to disable temporarily.
  if (value === undefined) return true;
  return value === "true";
}

export function isBillingSoftMode(): boolean {
  return !isBillingEnforcementEnabled();
}

export function isBillingMockPaymentsEnabled(): boolean {
  const value =
    process.env.BILLING_MOCK_PAYMENTS_ENABLED ??
    process.env.NEXT_PUBLIC_BILLING_MOCK_PAYMENTS_ENABLED;

  // Mock checkout by default until Stripe is connected.
  if (value === undefined) return true;
  return value === "true";
}
