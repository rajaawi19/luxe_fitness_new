import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Crown,
  Download,
  ExternalLink,
  Gift,
  KeyRound,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  checkIsAdmin,
  compMembership,
  createAuthUser,
  deleteAuthUser,
  getAdminOverview,
  getFunnelAnalytics,
  listAdminInvoices,
  listAdminMembers,
  listAuditLog,
  listAuthUsers,
  refundInvoice,
  resetUserPassword,
  setUserAdminRole,
} from "@/integrations/admin.server";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — RKDF Gym" }] }),
  component: AdminPage,
});

type Overview = Awaited<ReturnType<typeof getAdminOverview>>;
type Members = Awaited<ReturnType<typeof listAdminMembers>>;
type Invoices = Awaited<ReturnType<typeof listAdminInvoices>>;
type Audit = Awaited<ReturnType<typeof listAuditLog>>;
type Funnel = Awaited<ReturnType<typeof getFunnelAnalytics>>;
type AuthUsers = Awaited<ReturnType<typeof listAuthUsers>>;

function fmt(amount: number, currency = "inr") {
  const n = (amount ?? 0) / 100;
  try {
    return new Intl.NumberFormat(currency === "inr" ? "en-IN" : "en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency.toUpperCase()} ${n.toFixed(2)}`;
  }
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

async function withAuth<T>(fn: (auth: string) => Promise<T>): Promise<T | null> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return null;
  return fn(`Bearer ${sess.session.access_token}`);
}

function AdminPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [members, setMembers] = useState<Members | null>(null);
  const [invoices, setInvoices] = useState<Invoices | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [funnel, setFunnel] = useState<Funnel | null>(null);

  const [memberSearch, setMemberSearch] = useState("");
  const [invStatus, setInvStatus] = useState<"all" | "paid" | "open" | "void" | "uncollectible">("all");
  const [invDays, setInvDays] = useState(90);
  const [refunding, setRefunding] = useState<string | null>(null);

  // Comp form
  const [compEmail, setCompEmail] = useState("");
  const [compDays, setCompDays] = useState(30);
  const [compPlan, setCompPlan] = useState("Basic");
  const [compLoading, setCompLoading] = useState(false);

  // User accounts
  const [authUsers, setAuthUsers] = useState<AuthUsers | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserAdmin, setNewUserAdmin] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);
  const [resettingPw, setResettingPw] = useState<string | null>(null);

  const reloadAll = useCallback(async () => {
    const calls = [
      withAuth((a) => getAdminOverview({ headers: { Authorization: a } } as any)).then(setOverview),
      withAuth((a) => listAdminMembers({ data: { search: memberSearch }, headers: { Authorization: a } } as any)).then(setMembers),
      withAuth((a) => listAdminInvoices({ data: { days: invDays, status: invStatus }, headers: { Authorization: a } } as any)).then(setInvoices),
      withAuth((a) => listAuditLog({ data: { limit: 50 }, headers: { Authorization: a } } as any)).then(setAudit),
      withAuth((a) => getFunnelAnalytics({ data: { days: 30 }, headers: { Authorization: a } } as any)).then(setFunnel),
      withAuth((a) => listAuthUsers({ data: { search: userSearch }, headers: { Authorization: a } } as any)).then(setAuthUsers),
    ];
    await Promise.allSettled(calls);
  }, [memberSearch, invDays, invStatus, userSearch]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      const adminRes = await withAuth((a) => checkIsAdmin({ headers: { Authorization: a } } as any));
      setIsAdmin(!!adminRes?.isAdmin);
      setLoading(false);
      if (adminRes?.isAdmin) reloadAll();
    });
  }, [navigate, reloadAll]);

  const refreshInvoices = useCallback(async () => {
    const r = await withAuth((a) =>
      listAdminInvoices({ data: { days: invDays, status: invStatus }, headers: { Authorization: a } } as any),
    );
    setInvoices(r);
  }, [invDays, invStatus]);

  useEffect(() => {
    if (isAdmin) refreshInvoices();
  }, [invDays, invStatus, isAdmin, refreshInvoices]);

  const exportInvoicesCsv = () => {
    if (!invoices?.invoices.length) return;
    const headers = ["Invoice", "Date", "Customer", "Email", "Status", "Amount Paid", "Currency", "URL"];
    const rows = invoices.invoices.map((i) => [
      i.number ?? i.id,
      new Date(i.created).toISOString().slice(0, 10),
      i.customerName ?? "",
      i.customerEmail ?? "",
      i.status ?? "",
      ((i.amountPaid ?? 0) / 100).toFixed(2),
      (i.currency ?? "").toUpperCase(),
      i.hostedInvoiceUrl ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rkdf-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefund = async (invoiceId: string) => {
    if (!confirm("Refund this invoice? This cannot be undone.")) return;
    setRefunding(invoiceId);
    try {
      const reason = prompt("Reason (optional)") ?? undefined;
      await withAuth((a) =>
        refundInvoice({ data: { invoiceId, reason }, headers: { Authorization: a } } as any),
      );
      toast.success("Refund issued");
      await refreshInvoices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefunding(null);
    }
  };

  const handleComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compEmail || compDays < 1) return;
    setCompLoading(true);
    try {
      await withAuth((a) =>
        compMembership({
          data: { email: compEmail, days: compDays, planLabel: compPlan },
          headers: { Authorization: a },
        } as any),
      );
      toast.success(`Comp membership granted to ${compEmail}`);
      setCompEmail("");
      reloadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Comp failed");
    } finally {
      setCompLoading(false);
    }
  };

  const reloadAuthUsers = useCallback(async () => {
    const r = await withAuth((a) =>
      listAuthUsers({ data: { search: userSearch }, headers: { Authorization: a } } as any),
    );
    setAuthUsers(r);
  }, [userSearch]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) return;
    setCreatingUser(true);
    try {
      await withAuth((a) =>
        createAuthUser({
          data: { email: newUserEmail, password: newUserPassword, isAdmin: newUserAdmin },
          headers: { Authorization: a },
        } as any),
      );
      toast.success(`User ${newUserEmail} created`);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserAdmin(false);
      await reloadAuthUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string | null) => {
    if (!confirm(`Permanently delete ${email ?? "this user"}? This cannot be undone.`)) return;
    setDeletingUser(userId);
    try {
      await withAuth((a) =>
        deleteAuthUser({ data: { userId }, headers: { Authorization: a } } as any),
      );
      toast.success("User deleted");
      await reloadAuthUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingUser(null);
    }
  };

  const handleToggleAdmin = async (userId: string, makeAdmin: boolean) => {
    setTogglingRole(userId);
    try {
      await withAuth((a) =>
        setUserAdminRole({ data: { userId, makeAdmin }, headers: { Authorization: a } } as any),
      );
      toast.success(makeAdmin ? "Granted admin" : "Revoked admin");
      await reloadAuthUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Role change failed");
    } finally {
      setTogglingRole(null);
    }
  };

  const handleResetPassword = async (userId: string, email: string | null) => {
    if (!confirm(`Send a secure password reset for ${email ?? "this user"}?`)) return;
    setResettingPw(userId);
    try {
      const redirectTo = `${window.location.origin}/auth`;
      const res = await withAuth((a) =>
        resetUserPassword({ data: { userId, redirectTo }, headers: { Authorization: a } } as any),
      );
      const link = (res as any)?.actionLink as string | null;
      if (link) {
        try {
          await navigator.clipboard.writeText(link);
          toast.success("Recovery link copied to clipboard");
        } catch {
          toast.success("Recovery link generated", { description: link });
        }
      } else {
        toast.success(`Password reset email sent to ${email}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResettingPw(null);
    }
  };

  useEffect(() => {
    if (isAdmin) reloadAuthUsers();
  }, [userSearch, isAdmin, reloadAuthUsers]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members.members;
    return members.members.filter((m) =>
      [m.email, m.name, m.plan, m.status].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [members, memberSearch]);

  const maxRev = useMemo(() => {
    if (!overview?.dailyRevenue.length) return 0;
    return Math.max(...overview.dailyRevenue.map((d) => d.cents), 1);
  }, [overview]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Loading admin…</div>;
  }
  if (!user) return null;

  if (isAdmin === false) {
    return (
      <div className="py-32">
        <div className="container mx-auto px-6 max-w-xl text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-6" />
          <h1 className="font-display text-4xl mb-4">Admin Access Required</h1>
          <p className="text-muted-foreground mb-8">
            Your account doesn't have admin privileges. The first user to sign up is automatically promoted to admin.
          </p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass gold-border text-xs uppercase tracking-[0.2em] hover:bg-accent/40 transition">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-12">
          <div>
            <span className="text-xs uppercase tracking-[0.4em] text-gradient-gold">Admin Console</span>
            <h1 className="font-display text-4xl md:text-5xl mt-3">RKDF Operations</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={reloadAll} className="flex items-center gap-2 px-4 py-2 rounded-full glass text-xs uppercase tracking-[0.2em] hover:bg-accent/40 transition">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-full glass gold-border text-xs uppercase tracking-[0.2em] hover:bg-accent/40 transition">
              <ArrowLeft className="h-4 w-4" /> Member view
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Kpi
            label="MRR"
            value={overview ? fmt(overview.mrrCents, overview.currency) : "—"}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <Kpi
            label="Active Members"
            value={overview ? overview.activeSubscriptions.toString() : "—"}
            icon={<Users className="h-5 w-5" />}
            sub={overview ? `${overview.pastDueSubscriptions} past due` : undefined}
          />
          <Kpi
            label="Churn (30d)"
            value={overview ? pct(overview.churnRate) : "—"}
            icon={<TrendingDown className="h-5 w-5" />}
            sub={overview ? `${overview.canceledLast30} canceled` : undefined}
          />
          <Kpi
            label="Revenue (30d)"
            value={overview ? fmt(overview.revenue30Cents, overview.currency) : "—"}
            icon={<Receipt className="h-5 w-5" />}
            sub={overview ? `${fmt(overview.revenue90Cents, overview.currency)} (90d)` : undefined}
          />
        </div>

        {/* Revenue chart */}
        <Card className="mb-10">
          <CardHeader title="Revenue — Last 30 days" icon={<BarChart3 className="h-5 w-5" />} />
          {overview ? (
            <div className="px-6 pb-6">
              <div className="flex items-end gap-1 h-40">
                {overview.dailyRevenue.map((d) => (
                  <div key={d.date} className="flex-1 group relative">
                    <div
                      className="w-full bg-gradient-to-t from-amber-500/80 to-amber-300/40 rounded-sm hover:from-amber-400 transition"
                      style={{ height: `${(d.cents / maxRev) * 100}%`, minHeight: 2 }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-background border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                      {d.date}: {fmt(d.cents, overview.currency)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{overview.dailyRevenue[0]?.date}</span>
                <span>{overview.dailyRevenue[overview.dailyRevenue.length - 1]?.date}</span>
              </div>
            </div>
          ) : (
            <div className="px-6 pb-6 text-muted-foreground">Loading…</div>
          )}
        </Card>

        {/* Tier breakdown + Funnel */}
        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          <Card>
            <CardHeader title="Active Plans" icon={<Crown className="h-5 w-5" />} />
            <div className="px-6 pb-6 space-y-3">
              {overview && Object.keys(overview.planCounts).length > 0 ? (
                Object.entries(overview.planCounts).map(([plan, count]) => {
                  const total = Object.values(overview.planCounts).reduce((a, b) => a + b, 0);
                  const p = total ? (count / total) * 100 : 0;
                  return (
                    <div key={plan}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{plan}</span>
                        <span className="text-muted-foreground">{count} ({p.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300" style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-muted-foreground text-sm">No active subscriptions yet.</div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Conversion Funnel (30d)" icon={<Activity className="h-5 w-5" />} />
            <div className="px-6 pb-6">
              {funnel && funnel.planFunnel.length > 0 ? (
                <div className="space-y-4">
                  {funnel.planFunnel.map((p) => (
                    <div key={p.plan} className="border border-border rounded-lg p-3">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">{p.plan}</span>
                        <span className="text-xs text-muted-foreground">overall {pct(p.overall)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <div className="text-lg font-display">{p.viewed}</div>
                          <div className="text-muted-foreground">viewed</div>
                        </div>
                        <div>
                          <div className="text-lg font-display">{p.checkoutStarted}</div>
                          <div className="text-muted-foreground">checkout ({pct(p.viewToCheckout)})</div>
                        </div>
                        <div>
                          <div className="text-lg font-display">{p.completed}</div>
                          <div className="text-muted-foreground">paid ({pct(p.checkoutToCompleted)})</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    {funnel.totalSessions} sessions · {funnel.totalEvents} events tracked
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No analytics events yet. Visit the membership page or start a checkout to populate the funnel.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* User Accounts */}
        <Card className="mb-10">
          <CardHeader
            title="User Accounts"
            icon={<Users className="h-5 w-5" />}
            right={
              <span className="text-xs text-muted-foreground">
                {authUsers ? `${authUsers.users.length} accounts` : "—"}
              </span>
            }
          />
          <div className="px-6 pb-6">
            <form onSubmit={handleCreateUser} className="grid md:grid-cols-[1fr_1fr_auto_auto] gap-3 mb-6 p-4 rounded-xl bg-background/40 border border-border/40">
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                className="px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-accent text-sm"
              />
              <input
                type="password"
                required
                minLength={8}
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
                className="px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-accent text-sm"
              />
              <label className="flex items-center gap-2 px-3 text-xs uppercase tracking-wider text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={newUserAdmin}
                  onChange={(e) => setNewUserAdmin(e.target.checked)}
                  className="accent-amber-400"
                />
                Admin
              </label>
              <button
                type="submit"
                disabled={creatingUser || !newUserEmail || !newUserPassword}
                className="flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-background text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {creatingUser ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                Add User
              </button>
            </form>

            <div className="relative mb-4">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by email…"
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-accent text-sm"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Email</th>
                    <th className="text-left py-2 px-2">Roles</th>
                    <th className="text-left py-2 px-2">Joined</th>
                    <th className="text-left py-2 px-2">Last sign-in</th>
                    <th className="text-right py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {authUsers?.users.map((u) => {
                    const isAdminUser = u.roles.includes("admin");
                    const isSelf = u.id === user?.id;
                    return (
                      <tr key={u.id} className="border-b border-border/40 hover:bg-accent/10">
                        <td className="py-2 px-2">
                          {u.email ?? "—"}
                          {isSelf && <span className="ml-2 text-xs text-amber-300">(you)</span>}
                          {!u.emailConfirmedAt && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">unverified</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex gap-1 flex-wrap">
                            {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                            {u.roles.map((r) => (
                              <span
                                key={r}
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  r === "admin" ? "bg-amber-500/20 text-amber-300" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">
                          {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : "never"}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleToggleAdmin(u.id, !isAdminUser)}
                              disabled={togglingRole === u.id || (isSelf && isAdminUser)}
                              title={isSelf && isAdminUser ? "Can't revoke your own admin" : isAdminUser ? "Revoke admin" : "Make admin"}
                              className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-accent/40 disabled:opacity-40 transition"
                            >
                              {togglingRole === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Shield className="h-3 w-3" />
                              )}
                              {isAdminUser ? "Revoke" : "Make admin"}
                            </button>
                            <button
                              onClick={() => handleResetPassword(u.id, u.email)}
                              disabled={resettingPw === u.id || !u.email}
                              title={!u.email ? "User has no email" : "Send password reset"}
                              className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded text-amber-300 hover:bg-amber-500/10 disabled:opacity-40 transition"
                            >
                              {resettingPw === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <KeyRound className="h-3 w-3" />
                              )}
                              Reset password
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={deletingUser === u.id || isSelf}
                              title={isSelf ? "Can't delete yourself" : "Delete user"}
                              className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition"
                            >
                              {deletingUser === u.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!authUsers && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading users…
                      </td>
                    </tr>
                  )}
                  {authUsers?.users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Members */}
        <Card className="mb-10">
          <CardHeader title="Members" icon={<Users className="h-5 w-5" />} />
          <div className="px-6 pb-6">
            <div className="relative mb-4">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by email, name, plan, status…"
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-accent"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Email</th>
                    <th className="text-left py-2 px-2">Plan</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-left py-2 px-2">Renews</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.subscriptionId} className="border-b border-border/40 hover:bg-accent/10">
                      <td className="py-2 px-2">
                        {m.email ?? "—"}
                        {m.comp && <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">COMP</span>}
                      </td>
                      <td className="py-2 px-2">{m.plan}</td>
                      <td className="py-2 px-2">
                        <StatusBadge status={m.status} />
                        {m.cancelAtPeriodEnd && <span className="ml-2 text-xs text-amber-400">canceling</span>}
                      </td>
                      <td className="py-2 px-2 text-right">{fmt(m.amountCents, m.currency)}</td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {m.currentPeriodEnd ? new Date(m.currentPeriodEnd).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">No members match.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Invoices */}
        <Card className="mb-10">
          <CardHeader
            title="Invoices"
            icon={<Receipt className="h-5 w-5" />}
            right={
              <button
                onClick={exportInvoicesCsv}
                disabled={!invoices?.invoices.length}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full glass gold-border text-xs uppercase tracking-[0.2em] hover:bg-accent/40 transition disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            }
          />
          <div className="px-6 pb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                value={invDays}
                onChange={(e) => setInvDays(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
              </select>
              {(["all", "paid", "open", "void", "uncollectible"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setInvStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider transition ${
                    invStatus === s ? "bg-accent text-accent-foreground" : "glass hover:bg-accent/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Invoice</th>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Customer</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-right py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices?.invoices.map((i) => (
                    <tr key={i.id} className="border-b border-border/40 hover:bg-accent/10">
                      <td className="py-2 px-2 font-mono text-xs">{i.number ?? i.id?.slice(-10)}</td>
                      <td className="py-2 px-2">{new Date(i.created).toLocaleDateString()}</td>
                      <td className="py-2 px-2">{i.customerEmail ?? i.customerName ?? "—"}</td>
                      <td className="py-2 px-2"><StatusBadge status={i.status} /></td>
                      <td className="py-2 px-2 text-right">{fmt(i.amountPaid ?? 0, i.currency ?? "inr")}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="flex justify-end gap-2">
                          {i.hostedInvoiceUrl && (
                            <a
                              href={i.hostedInvoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> View
                            </a>
                          )}
                          {i.status === "paid" && (
                            <button
                              onClick={() => i.id && handleRefund(i.id)}
                              disabled={refunding === i.id}
                              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                            >
                              {refunding === i.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refund"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!invoices?.invoices.length && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">No invoices in range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Comp + Audit */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Grant Comp Membership" icon={<Gift className="h-5 w-5" />} />
            <form onSubmit={handleComp} className="px-6 pb-6 space-y-3">
              <input
                type="email"
                required
                value={compEmail}
                onChange={(e) => setCompEmail(e.target.value)}
                placeholder="member@example.com"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:border-accent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  value={compDays}
                  onChange={(e) => setCompDays(Number(e.target.value))}
                  className="px-4 py-2 rounded-lg bg-background border border-border"
                  placeholder="Days"
                />
                <select
                  value={compPlan}
                  onChange={(e) => setCompPlan(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-background border border-border"
                >
                  <option value="Basic">Basic</option>
                  <option value="Premium">Premium</option>
                  <option value="Elite">Elite</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={compLoading || !compEmail}
                className="w-full px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-background text-xs uppercase tracking-[0.2em] font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {compLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                Grant Comp Membership
              </button>
              <p className="text-xs text-muted-foreground">
                Creates a $0 trialing subscription on Stripe. Customer is created if not present.
              </p>
            </form>
          </Card>

          <Card>
            <CardHeader title="Audit Log" icon={<ShieldAlert className="h-5 w-5" />} />
            <div className="px-6 pb-6 max-h-96 overflow-y-auto">
              {audit?.entries.length ? (
                <ul className="space-y-2 text-sm">
                  {audit.entries.map((e: any) => (
                    <li key={e.id} className="border border-border/40 rounded-lg p-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span className="font-mono">{e.action}</span>
                        <span>{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      {e.target && <div className="text-xs text-muted-foreground">target: {e.target}</div>}
                      {e.details && Object.keys(e.details).length > 0 && (
                        <pre className="mt-1 text-xs text-muted-foreground/80 whitespace-pre-wrap break-all">
                          {JSON.stringify(e.details, null, 2)}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-muted-foreground text-sm">No admin actions logged yet.</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-2xl border border-border/60 ${className}`}>{children}</div>;
}

function CardHeader({ title, icon, right }: { title: string; icon?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40">
      <div className="flex items-center gap-2">
        {icon && <span className="text-amber-400">{icon}</span>}
        <h2 className="text-sm uppercase tracking-[0.2em] font-medium">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function Kpi({ label, value, icon, sub }: { label: string; value: string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="glass rounded-2xl border border-border/60 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-amber-400">{icon}</span>
      </div>
      <div className="font-display text-3xl">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? "unknown";
  const map: Record<string, string> = {
    active: "bg-green-500/20 text-green-300",
    trialing: "bg-blue-500/20 text-blue-300",
    paid: "bg-green-500/20 text-green-300",
    past_due: "bg-red-500/20 text-red-300",
    canceled: "bg-muted text-muted-foreground",
    open: "bg-amber-500/20 text-amber-300",
    void: "bg-muted text-muted-foreground",
    uncollectible: "bg-red-500/20 text-red-300",
    draft: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${map[s] ?? "bg-muted text-muted-foreground"}`}>
      {s}
    </span>
  );
}
