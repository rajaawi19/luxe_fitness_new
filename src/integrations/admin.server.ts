import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" as any });
}

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function requireAdmin() {
  const auth = getRequestHeader("authorization");
  if (!auth) throw new Error("Not signed in");
  const userClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data } = await userClient.auth.getUser();
  if (!data.user) throw new Error("Not signed in");

  const admin = getServiceClient();
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const isAdmin = roles?.some((r: any) => r.role === "admin");
  if (!isAdmin) throw new Error("Admin access required");

  return { user: data.user, admin };
}

async function logAudit(adminUserId: string, action: string, target: string | null, details: Record<string, any> = {}) {
  try {
    const admin = getServiceClient();
    await admin.from("admin_audit_log").insert({
      admin_user_id: adminUserId,
      action,
      target,
      details,
    });
  } catch (e) {
    console.error("audit log error:", e);
  }
}

// ───────────────────────── Overview metrics ─────────────────────────

export const getAdminOverview = createServerFn({ method: "POST" })
  .handler(async () => {
    const { admin } = await requireAdmin();
    const stripe = getStripe();

    // Pull active subs (paginate up to 200 for v1)
    const subs: Stripe.Subscription[] = [];
    for await (const s of stripe.subscriptions.list({ status: "all", limit: 100 })) {
      subs.push(s);
      if (subs.length >= 500) break;
    }

    const active = subs.filter((s) => ["active", "trialing"].includes(s.status));
    const pastDue = subs.filter((s) => s.status === "past_due");
    const canceled = subs.filter((s) => s.status === "canceled");

    // MRR = sum of plan amounts on active subs (assume monthly; convert yearly)
    let mrrCents = 0;
    const planCounts: Record<string, number> = {};
    for (const s of active) {
      const item = s.items.data[0];
      const amt = item?.price.unit_amount ?? 0;
      const interval = item?.price.recurring?.interval ?? "month";
      const monthly = interval === "year" ? Math.round(amt / 12) : amt;
      mrrCents += monthly;
      const plan = (s.metadata?.plan as string) ?? item?.price.nickname ?? "Unknown";
      planCounts[plan] = (planCounts[plan] ?? 0) + 1;
    }

    // 30/90 day windows for revenue + churn
    const now = Math.floor(Date.now() / 1000);
    const day30 = now - 30 * 86400;
    const day90 = now - 90 * 86400;

    // Revenue: paid invoices in last 90 days
    const invoices: Stripe.Invoice[] = [];
    for await (const inv of stripe.invoices.list({ created: { gte: day90 }, limit: 100 })) {
      invoices.push(inv);
      if (invoices.length >= 500) break;
    }

    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const revenue30Cents = paidInvoices
      .filter((i) => i.created >= day30)
      .reduce((sum, i) => sum + (i.amount_paid ?? 0), 0);
    const revenue90Cents = paidInvoices.reduce((sum, i) => sum + (i.amount_paid ?? 0), 0);

    // Daily revenue for last 30 days
    const dailyRevenue: { date: string; cents: number }[] = [];
    const dayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date((now - i * 86400) * 1000).toISOString().slice(0, 10);
      dayMap.set(d, 0);
    }
    for (const inv of paidInvoices) {
      if (inv.created < day30) continue;
      const d = new Date(inv.created * 1000).toISOString().slice(0, 10);
      if (dayMap.has(d)) dayMap.set(d, (dayMap.get(d) ?? 0) + (inv.amount_paid ?? 0));
    }
    for (const [date, cents] of dayMap) dailyRevenue.push({ date, cents });

    // Churn (last 30d) = canceled in last 30 / (active at start of period)
    const canceled30 = canceled.filter((s) => s.canceled_at && s.canceled_at >= day30).length;
    const denom = active.length + canceled30;
    const churnRate = denom > 0 ? canceled30 / denom : 0;

    // Member counts from DB
    const { count: totalMembers } = await admin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "member");

    return {
      mrrCents,
      currency: active[0]?.items.data[0]?.price.currency ?? "inr",
      activeSubscriptions: active.length,
      pastDueSubscriptions: pastDue.length,
      canceledLast30: canceled30,
      churnRate,
      revenue30Cents,
      revenue90Cents,
      planCounts,
      dailyRevenue,
      totalMembers: totalMembers ?? 0,
    };
  });

// ───────────────────────── Members list ─────────────────────────

export const listAdminMembers = createServerFn({ method: "POST" })
  .inputValidator((input: { search?: string; limit?: number }) => input ?? {})
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin();
    const stripe = getStripe();

    // Pull subscriptions and group by customer/email
    const subs: Stripe.Subscription[] = [];
    for await (const s of stripe.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] })) {
      subs.push(s);
      if (subs.length >= 300) break;
    }

    const members = subs.map((s) => {
      const customer = s.customer as Stripe.Customer;
      const item = s.items.data[0];
      return {
        subscriptionId: s.id,
        customerId: typeof customer === "string" ? customer : customer.id,
        email: typeof customer === "string" ? null : customer.email,
        name: typeof customer === "string" ? null : customer.name,
        plan: (s.metadata?.plan as string) ?? item?.price.nickname ?? "Custom",
        status: s.status,
        amountCents: item?.price.unit_amount ?? 0,
        currency: item?.price.currency ?? "inr",
        cancelAtPeriodEnd: s.cancel_at_period_end,
        currentPeriodEnd: (s as any).current_period_end
          ? new Date((s as any).current_period_end * 1000).toISOString()
          : null,
        created: new Date(s.created * 1000).toISOString(),
        comp: s.metadata?.comp === "true",
      };
    });

    const q = (data.search ?? "").trim().toLowerCase();
    const filtered = q
      ? members.filter((m) =>
          [m.email, m.name, m.plan, m.status].filter(Boolean).join(" ").toLowerCase().includes(q)
        )
      : members;

    // Also fetch DB roles to flag admins
    const { data: adminRoles } = await admin.from("user_roles").select("user_id, role");

    return { members: filtered.slice(0, data.limit ?? 100), adminUserCount: adminRoles?.filter((r: any) => r.role === "admin").length ?? 0 };
  });

// ───────────────────────── Invoices + CSV ─────────────────────────

export const listAdminInvoices = createServerFn({ method: "POST" })
  .inputValidator((input: { days?: number; status?: string }) => input ?? {})
  .handler(async ({ data }) => {
    await requireAdmin();
    const stripe = getStripe();

    const days = data.days ?? 90;
    const since = Math.floor(Date.now() / 1000) - days * 86400;

    const invoices: Stripe.Invoice[] = [];
    for await (const inv of stripe.invoices.list({
      created: { gte: since },
      limit: 100,
      expand: ["data.customer"],
    })) {
      invoices.push(inv);
      if (invoices.length >= 500) break;
    }

    const filtered = data.status && data.status !== "all"
      ? invoices.filter((i) => i.status === data.status)
      : invoices;

    return {
      invoices: filtered.map((inv) => {
        const customer = inv.customer as Stripe.Customer | null;
        return {
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amountPaid: inv.amount_paid,
          amountDue: inv.amount_due,
          currency: inv.currency,
          created: new Date(inv.created * 1000).toISOString(),
          customerEmail: typeof customer === "object" ? customer?.email ?? null : null,
          customerName: typeof customer === "object" ? customer?.name ?? null : null,
          hostedInvoiceUrl: inv.hosted_invoice_url,
          invoicePdf: inv.invoice_pdf,
        };
      }),
    };
  });

// ───────────────────────── Refund ─────────────────────────

export const refundInvoice = createServerFn({ method: "POST" })
  .inputValidator((input: { invoiceId: string; reason?: string }) => input)
  .handler(async ({ data }) => {
    const { user } = await requireAdmin();
    const stripe = getStripe();

    const invoice = await stripe.invoices.retrieve(data.invoiceId) as any;
    const paymentIntent = invoice.payment_intent;
    if (!paymentIntent) throw new Error("Invoice has no payment to refund");

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent as string,
      reason: "requested_by_customer",
      metadata: { admin_user_id: user.id, note: data.reason ?? "" },
    });

    await logAudit(user.id, "invoice.refund", data.invoiceId, {
      refundId: refund.id,
      amount: refund.amount,
      reason: data.reason,
    });

    return { refundId: refund.id, amount: refund.amount, status: refund.status };
  });

// ───────────────────────── Comp membership ─────────────────────────

export const compMembership = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; days: number; planLabel: string }) => input)
  .handler(async ({ data }) => {
    const { user } = await requireAdmin();
    const stripe = getStripe();

    // Get or create customer
    const existing = await stripe.customers.list({ email: data.email, limit: 1 });
    const customer = existing.data[0] ?? (await stripe.customers.create({ email: data.email }));

    // Create a 100% off coupon for the duration, attach via subscription with $0 price
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: "once",
      max_redemptions: 1,
    });

    // Create a product first (Stripe requires product, not inline product_data, for sub items)
    const product = await stripe.products.create({
      name: `RKDF ${data.planLabel} (Comp)`,
    });

    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: "inr",
            recurring: { interval: "month" },
            product: product.id,
            unit_amount: 0,
          },
        },
      ],
      trial_end: Math.floor(Date.now() / 1000) + data.days * 86400,
      metadata: {
        comp: "true",
        plan: data.planLabel,
        granted_by: user.id,
      },
      discounts: [{ coupon: coupon.id }],
    });

    await logAudit(user.id, "membership.comp", customer.id, {
      email: data.email,
      days: data.days,
      plan: data.planLabel,
      subscriptionId: sub.id,
    });

    return { subscriptionId: sub.id, customerId: customer.id };
  });

// ───────────────────────── Audit log ─────────────────────────

export const listAuditLog = createServerFn({ method: "POST" })
  .inputValidator((input: { limit?: number }) => input ?? {})
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin();
    const { data: rows, error } = await admin
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return { entries: rows ?? [] };
  });

// ───────────────────────── Analytics funnel ─────────────────────────

export const getFunnelAnalytics = createServerFn({ method: "POST" })
  .inputValidator((input: { days?: number }) => input ?? {})
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin();
    const days = data.days ?? 30;
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();

    const { data: events, error } = await admin
      .from("analytics_events")
      .select("event, properties, session_id, user_id, created_at")
      .gte("created_at", since)
      .limit(10000);
    if (error) throw new Error(error.message);

    const sessions = new Set<string>();
    const eventCounts: Record<string, number> = {};
    const planViews: Record<string, number> = {};
    const planCheckouts: Record<string, number> = {};
    const planConversions: Record<string, number> = {};

    for (const e of events ?? []) {
      if (e.session_id) sessions.add(e.session_id);
      eventCounts[e.event] = (eventCounts[e.event] ?? 0) + 1;
      const props = (e.properties ?? {}) as Record<string, any>;
      if (e.event === "plan_viewed" && props.plan) planViews[props.plan] = (planViews[props.plan] ?? 0) + 1;
      if (e.event === "checkout_started" && props.plan) planCheckouts[props.plan] = (planCheckouts[props.plan] ?? 0) + 1;
      if (e.event === "checkout_completed" && props.plan) planConversions[props.plan] = (planConversions[props.plan] ?? 0) + 1;
    }

    const plans = Array.from(new Set([...Object.keys(planViews), ...Object.keys(planCheckouts), ...Object.keys(planConversions)]));
    const planFunnel = plans.map((plan) => {
      const v = planViews[plan] ?? 0;
      const c = planCheckouts[plan] ?? 0;
      const co = planConversions[plan] ?? 0;
      return {
        plan,
        viewed: v,
        checkoutStarted: c,
        completed: co,
        viewToCheckout: v ? c / v : 0,
        checkoutToCompleted: c ? co / c : 0,
        overall: v ? co / v : 0,
      };
    });

    return {
      totalSessions: sessions.size,
      totalEvents: events?.length ?? 0,
      eventCounts,
      planFunnel,
    };
  });

// ───────────────────────── User accounts (auth) ─────────────────────────

export const listAuthUsers = createServerFn({ method: "POST" })
  .inputValidator((input: { search?: string; page?: number }) => input ?? {})
  .handler(async ({ data }) => {
    const { admin } = await requireAdmin();
    const page = data.page ?? 1;
    const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);

    const { data: roles } = await admin.from("user_roles").select("user_id, role");
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get((r as any).user_id) ?? [];
      arr.push((r as any).role);
      roleMap.set((r as any).user_id, arr);
    }

    const q = (data.search ?? "").trim().toLowerCase();
    const users = list.users
      .map((u) => ({
        id: u.id,
        email: u.email ?? null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        emailConfirmedAt: u.email_confirmed_at ?? null,
        roles: roleMap.get(u.id) ?? [],
      }))
      .filter((u) => (q ? (u.email ?? "").toLowerCase().includes(q) : true));

    return { users, total: list.users.length };
  });

export const createAuthUser = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string; isAdmin?: boolean }) => input)
  .handler(async ({ data }) => {
    const { user, admin } = await requireAdmin();
    if (!data.email || !data.password) throw new Error("Email and password required");
    if (data.password.length < 8) throw new Error("Password must be at least 8 characters");

    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("User creation failed");

    const role = data.isAdmin ? "admin" : "member";
    await admin.from("user_roles").insert({ user_id: created.user.id, role }).select();

    await logAudit(user.id, "user.create", created.user.id, {
      email: data.email,
      role,
    });

    return { id: created.user.id, email: created.user.email };
  });

export const deleteAuthUser = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }) => {
    const { user, admin } = await requireAdmin();
    if (data.userId === user.id) throw new Error("You cannot delete your own account");

    // Clean up roles first (FK-safe even though there's no FK)
    await admin.from("user_roles").delete().eq("user_id", data.userId);

    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    await logAudit(user.id, "user.delete", data.userId, {});

    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; redirectTo?: string }) => input)
  .handler(async ({ data }) => {
    const { user, admin } = await requireAdmin();

    // Look up the user's email
    const { data: target, error: getErr } = await admin.auth.admin.getUserById(data.userId);
    if (getErr) throw new Error(getErr.message);
    const email = target.user?.email;
    if (!email) throw new Error("User has no email on file");

    // Generate a secure recovery link (does not change the password itself).
    // The link, when opened, lets the user set a new password via the standard
    // Supabase recovery flow.
    const { data: link, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: data.redirectTo ? { redirectTo: data.redirectTo } : undefined,
    });
    if (error) throw new Error(error.message);

    await logAudit(user.id, "user.password_reset", data.userId, { email });

    return {
      ok: true,
      email,
      actionLink: link.properties?.action_link ?? null,
    };
  });

export const setUserAdminRole = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; makeAdmin: boolean }) => input)
  .handler(async ({ data }) => {
    const { user, admin } = await requireAdmin();
    if (data.userId === user.id && !data.makeAdmin) {
      throw new Error("You cannot remove your own admin role");
    }
    if (data.makeAdmin) {
      await admin.from("user_roles").insert({ user_id: data.userId, role: "admin" }).select();
    } else {
      await admin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    }
    await logAudit(user.id, data.makeAdmin ? "role.grant_admin" : "role.revoke_admin", data.userId, {});
    return { ok: true };
  });

// ───────────────────────── Role check (client-callable) ─────────────────────────

export const checkIsAdmin = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      await requireAdmin();
      return { isAdmin: true };
    } catch {
      return { isAdmin: false };
    }
  });
