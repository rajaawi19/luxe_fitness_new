import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PLANS = {
  Basic: { amount: 99900, name: "RKDF Basic Membership" },
  Premium: { amount: 199900, name: "RKDF Premium Membership" },
  Elite: { amount: 499900, name: "RKDF Elite Membership" },
} as const;

export type PlanName = keyof typeof PLANS;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" as any });
}

async function getUserFromRequest() {
  const auth = getRequestHeader("authorization");
  if (!auth) return null;
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: { plan: PlanName; origin: string }) => {
    if (!(input.plan in PLANS)) throw new Error("Invalid plan");
    return input;
  })
  .handler(async ({ data }) => {
    const stripe = getStripe();
    const user = await getUserFromRequest();
    if (!user) throw new Error("You must be signed in to checkout");

    const plan = PLANS[data.plan];
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "inr",
            recurring: { interval: "month" },
            product_data: { name: plan.name },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
      ],
      metadata: { user_id: user.id, plan: data.plan },
      subscription_data: { metadata: { user_id: user.id, plan: data.plan } },
      success_url: `${data.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}/membership`,
    });

    return { url: session.url };
  });

export const getMembershipStatus = createServerFn({ method: "POST" })
  .handler(async () => {
    const stripe = getStripe();
    const user = await getUserFromRequest();
    if (!user) throw new Error("You must be signed in");
    if (!user.email) return { active: false as const };

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return { active: false as const };

    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 5,
    });

    const sub =
      subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status)) ??
      subs.data.find((s) => s.cancel_at_period_end) ??
      subs.data[0];

    if (!sub) return { active: false as const, customerId: customer.id };

    return {
      active: ["active", "trialing"].includes(sub.status),
      customerId: customer.id,
      subscriptionId: sub.id,
      status: sub.status,
      plan: (sub.metadata?.plan as PlanName) ?? null,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: (sub as any).current_period_end
        ? new Date((sub as any).current_period_end * 1000).toISOString()
        : null,
    };
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .inputValidator((input: { origin: string }) => input)
  .handler(async ({ data }) => {
    const stripe = getStripe();
    const user = await getUserFromRequest();
    if (!user?.email) throw new Error("You must be signed in");

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) throw new Error("No billing account found. Subscribe to a plan first.");

    const portal = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${data.origin}/dashboard`,
    });
    return { url: portal.url };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .inputValidator((input: { subscriptionId: string }) => input)
  .handler(async ({ data }) => {
    const stripe = getStripe();
    const user = await getUserFromRequest();
    if (!user) throw new Error("You must be signed in");

    const sub = await stripe.subscriptions.retrieve(data.subscriptionId);
    if (sub.metadata?.user_id && sub.metadata.user_id !== user.id) {
      throw new Error("Not authorized for this subscription");
    }

    const updated = await stripe.subscriptions.update(data.subscriptionId, {
      cancel_at_period_end: true,
    });
    return {
      status: updated.status,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      currentPeriodEnd: (updated as any).current_period_end
        ? new Date((updated as any).current_period_end * 1000).toISOString()
        : null,
    };
  });

export const resumeSubscription = createServerFn({ method: "POST" })
  .inputValidator((input: { subscriptionId: string }) => input)
  .handler(async ({ data }) => {
    const stripe = getStripe();
    const user = await getUserFromRequest();
    if (!user) throw new Error("You must be signed in");

    const sub = await stripe.subscriptions.retrieve(data.subscriptionId);
    if (sub.metadata?.user_id && sub.metadata.user_id !== user.id) {
      throw new Error("Not authorized for this subscription");
    }

    const updated = await stripe.subscriptions.update(data.subscriptionId, {
      cancel_at_period_end: false,
    });
    return { status: updated.status, cancelAtPeriodEnd: updated.cancel_at_period_end };
  });

export const listInvoices = createServerFn({ method: "POST" })
  .handler(async () => {
    const stripe = getStripe();
    const user = await getUserFromRequest();
    if (!user?.email) throw new Error("You must be signed in");

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return { invoices: [] };

    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 24,
    });

    return {
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amountPaid: inv.amount_paid,
        amountDue: inv.amount_due,
        currency: inv.currency,
        created: new Date(inv.created * 1000).toISOString(),
        periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
        periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
        hostedInvoiceUrl: inv.hosted_invoice_url,
        invoicePdf: inv.invoice_pdf,
        description: inv.lines.data[0]?.description ?? null,
      })),
    };
  });

export const verifyCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: { sessionId: string }) => input)
  .handler(async ({ data }) => {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
      expand: ["subscription"],
    });

    const sub = session.subscription as Stripe.Subscription | null;
    const periodEnd = sub
      ? new Date((sub as any).current_period_end * 1000).toISOString()
      : null;

    return {
      paid: session.payment_status === "paid",
      status: session.status,
      plan: (session.metadata?.plan as PlanName) ?? null,
      email: session.customer_details?.email ?? null,
      amountTotal: session.amount_total,
      currency: session.currency,
      currentPeriodEnd: periodEnd,
      subscriptionStatus: sub?.status ?? null,
    };
  });
