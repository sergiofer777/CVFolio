import Stripe from "stripe";

// Keep the server pinned to the latest API version supported by the installed stripe-node SDK.
export const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-02-24.acacia";

export function createStripeServerClient(apiKey: string): Stripe {
  return new Stripe(apiKey, {
    apiVersion: STRIPE_API_VERSION,
  });
}
