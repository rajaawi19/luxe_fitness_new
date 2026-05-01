import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  Activity,
  Apple,
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Crown,
  Download,
  Droplet,
  Dumbbell,
  ExternalLink,
  FileText,
  Flame,
  Heart,
  Loader2,
  LogOut,
  Medal,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Share2,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import {
  cancelSubscription,
  createPortalSession,
  getMembershipStatus,
  listInvoices,
  resumeSubscription,
} from "@/integrations/stripe.server";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — RKDF Gym" }],
  }),
  component: DashboardPage,
});

type Membership = Awaited<ReturnType<typeof getMembershipStatus>>;
type InvoicesResult = Awaited<ReturnType<typeof listInvoices>>;
type Invoice = InvoicesResult["invoices"][number];

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"portal" | "cancel" | "resume" | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<"all" | "paid" | "open" | "void" | "uncollectible" | "draft">("all");
  const [water, setWater] = useState(5); // glasses out of 8
  const [goals, setGoals] = useState([
    { id: 1, label: "Train 5x this week", done: 3, total: 5 },
    { id: 2, label: "Hit 10k steps daily", done: 4, total: 7 },
    { id: 3, label: "Sleep 7+ hours", done: 5, total: 7 },
    { id: 4, label: "Drink 2L water", done: 6, total: 7 },
  ]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (invoiceStatus !== "all" && inv.status !== invoiceStatus) return false;
      if (!q) return true;
      const hay = [inv.number, inv.id, inv.status, String(inv.amountPaid ?? ""), String(inv.amountDue ?? "")]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [invoices, invoiceSearch, invoiceStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length };
    for (const inv of invoices) {
      const s = inv.status ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [invoices]);

  const loadMembership = useCallback(async () => {
    setMembershipLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const result = await getMembershipStatus({
        headers: { Authorization: `Bearer ${sess.session.access_token}` },
      } as any);
      setMembership(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load membership");
    } finally {
      setMembershipLoading(false);
    }
  }, []);

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      const result = await listInvoices({
        headers: { Authorization: `Bearer ${sess.session.access_token}` },
      } as any);
      setInvoices(result.invoices);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session) navigate({ to: "/auth" });
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (!data.session) navigate({ to: "/auth" });
      else {
        loadMembership();
        loadInvoices();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, loadMembership, loadInvoices]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  const withAuth = async <T,>(fn: (auth: string) => Promise<T>): Promise<T | null> => {
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) return null;
    return fn(`Bearer ${sess.session.access_token}`);
  };

  const openPortal = async () => {
    setActionLoading("portal");
    try {
      const result = await withAuth((auth) =>
        createPortalSession({
          data: { origin: window.location.origin },
          headers: { Authorization: auth },
        } as any),
      );
      if (result?.url) window.location.href = result.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal");
      setActionLoading(null);
    }
  };

  const cancel = async () => {
    if (!membership || !("subscriptionId" in membership) || !membership.subscriptionId) return;
    if (!confirm("Cancel your membership at the end of the current period?")) return;
    setActionLoading("cancel");
    try {
      await withAuth((auth) =>
        cancelSubscription({
          data: { subscriptionId: membership.subscriptionId! },
          headers: { Authorization: auth },
        } as any),
      );
      toast.success("Membership will end at the period close");
      await loadMembership();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setActionLoading(null);
    }
  };

  const resume = async () => {
    if (!membership || !("subscriptionId" in membership) || !membership.subscriptionId) return;
    setActionLoading("resume");
    try {
      await withAuth((auth) =>
        resumeSubscription({
          data: { subscriptionId: membership.subscriptionId! },
          headers: { Authorization: auth },
        } as any),
      );
      toast.success("Membership resumed");
      await loadMembership();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume failed");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleGoal = (id: number) => {
    setGoals((gs) =>
      gs.map((g) => (g.id === id ? { ...g, done: Math.min(g.total, g.done + 1) } : g)),
    );
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return null;

  const name = (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Member";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  // Weekly progress (mocked)
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const weekActivity = [85, 60, 95, 40, 75, 0, 0]; // 0 = upcoming
  const today = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const weeklyGoal = 5;
  const weeklyDone = weekActivity.filter((v) => v > 50).length;
  const weeklyPct = Math.round((weeklyDone / weeklyGoal) * 100);

  return (
    <div className="py-12 md:py-16">
      <div className="container mx-auto px-6 max-w-7xl">
        {/* Hero */}
        <div className="relative p-8 md:p-10 rounded-3xl glass gold-border mb-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial-gold opacity-60 pointer-events-none" />
          <div className="relative flex items-start justify-between flex-wrap gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-display text-3xl shadow-gold">
                  {initials}
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-[0.4em] text-gradient-gold">Member Portal</span>
                <h1 className="font-display text-4xl md:text-5xl mt-2">
                  {greeting}, <em className="text-gradient-gold not-italic">{name}</em>
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-10 w-10 rounded-full glass gold-border flex items-center justify-center hover:bg-accent/40 transition relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse-gold" />
              </button>
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-full glass gold-border text-[10px] uppercase tracking-[0.2em] hover:bg-accent/40 transition"
              >
                <Settings className="h-3.5 w-3.5" /> Admin
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full glass gold-border text-[10px] uppercase tracking-[0.2em] hover:bg-accent/40 transition"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: Flame, label: "Calories", value: "1,248", sub: "today" },
              { icon: Activity, label: "Active", value: "78m", sub: "today" },
              { icon: Trophy, label: "Streak", value: "12d", sub: "personal best" },
              { icon: Heart, label: "Resting HR", value: "62", sub: "bpm" },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl bg-background/40 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <s.icon className="h-4 w-4 text-primary" />
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.sub}</span>
                </div>
                <div className="font-display text-2xl text-gradient-gold">{s.value}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {[
            { icon: Dumbbell, label: "Start Workout", to: "/ai-trainer" as const, gold: true },
            { icon: Calendar, label: "Book Class", to: "/classes" as const },
            { icon: Sparkles, label: "AI Trainer", to: "/ai-trainer" as const },
            { icon: Crown, label: "Upgrade", to: "/membership" as const },
          ].map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className={`group p-5 rounded-2xl flex items-center gap-3 transition hover:-translate-y-0.5 ${
                a.gold
                  ? "bg-gradient-gold text-primary-foreground shadow-gold"
                  : "glass gold-border hover:bg-accent/40"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${a.gold ? "bg-background/20" : "bg-gradient-gold shadow-gold"}`}>
                <a.icon className={`h-5 w-5 ${a.gold ? "text-primary-foreground" : "text-primary-foreground"}`} />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.2em]">{a.label}</div>
              </div>
              <ChevronRight className="h-4 w-4 opacity-50 group-hover:translate-x-1 transition" />
            </Link>
          ))}
        </div>

        {/* Main grid: weekly progress + goals + next session */}
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {/* Weekly progress ring */}
          <div className="p-8 rounded-3xl glass gold-border">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-display text-2xl">This Week</h2>
            </div>
            <div className="flex items-center justify-center mb-6">
              <ProgressRing pct={weeklyPct} label={`${weeklyDone}/${weeklyGoal}`} sub="workouts" />
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((d, i) => {
                const v = weekActivity[i];
                const isToday = i === today;
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="h-16 w-full rounded-lg bg-background/40 relative overflow-hidden border border-border/40">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-gold transition-all"
                        style={{ height: `${v}%` }}
                      />
                    </div>
                    <span className={`text-[10px] ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>{d}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Goals */}
          <div className="p-8 rounded-3xl glass gold-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h2 className="font-display text-2xl">Goals</h2>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Weekly</span>
            </div>
            <div className="space-y-4">
              {goals.map((g) => {
                const pct = Math.round((g.done / g.total) * 100);
                const complete = g.done >= g.total;
                return (
                  <button
                    key={g.id}
                    onClick={() => !complete && toggleGoal(g.id)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${complete ? "text-primary" : "text-muted-foreground/40"}`} />
                        <span className={`text-sm ${complete ? "line-through text-muted-foreground" : ""}`}>{g.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{g.done}/{g.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-gold transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next session */}
          <div className="p-8 rounded-3xl glass gold-border relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-radial-gold opacity-50 pointer-events-none" />
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="font-display text-2xl">Next Session</h2>
            </div>
            <div className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Today · 18:00</div>
              <div className="font-display text-2xl mt-1">Iron Sanctuary</div>
              <div className="text-sm text-muted-foreground">Coach Aarav · 60 min · Strength</div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border/40 mb-4">
              <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-sm">A</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Coach Aarav</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Strength Specialist</div>
              </div>
              <button className="h-8 w-8 rounded-full glass gold-border flex items-center justify-center hover:bg-accent/40">
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            </div>
            <button className="w-full px-5 py-3 rounded-full bg-gradient-gold text-primary-foreground text-[10px] font-semibold uppercase tracking-[0.25em] shadow-gold">
              Confirm Booking
            </button>
          </div>
        </div>

        {/* Wellness row: water + sleep + nutrition + AI tip */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="p-6 rounded-2xl glass">
            <div className="flex items-center justify-between mb-4">
              <Droplet className="h-4 w-4 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{water}/8</span>
            </div>
            <div className="font-display text-xl mb-3">Hydration</div>
            <div className="flex gap-1 mb-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setWater(i + 1)}
                  className={`h-8 flex-1 rounded transition ${
                    i < water ? "bg-gradient-gold shadow-gold" : "bg-background/60 border border-border/40"
                  }`}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Tap to log a glass</p>
          </div>

          <div className="p-6 rounded-2xl glass">
            <div className="flex items-center justify-between mb-4">
              <Moon className="h-4 w-4 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Last night</span>
            </div>
            <div className="font-display text-xl mb-1">Sleep</div>
            <div className="font-display text-3xl text-gradient-gold mb-2">7h 42m</div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] uppercase tracking-wider">Optimal</span>
              <span>92% quality</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl glass">
            <div className="flex items-center justify-between mb-4">
              <Apple className="h-4 w-4 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Today</span>
            </div>
            <div className="font-display text-xl mb-1">Nutrition</div>
            <div className="font-display text-3xl text-gradient-gold mb-2">1,840 <span className="text-sm text-muted-foreground">/ 2,200 kcal</span></div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              {[
                { l: "Protein", v: "142g" },
                { l: "Carbs", v: "210g" },
                { l: "Fat", v: "58g" },
              ].map((m) => (
                <div key={m.l} className="text-center p-2 rounded bg-background/40">
                  <div className="text-foreground font-semibold">{m.v}</div>
                  <div className="text-muted-foreground uppercase tracking-wider">{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-gold text-primary-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-background/10 rounded-full -translate-y-8 translate-x-8" />
            <Sparkles className="h-5 w-5 mb-3" />
            <div className="font-display text-xl mb-2">AI Tip of the Day</div>
            <p className="text-[12px] leading-relaxed mb-4 opacity-90">
              You've crushed 3 strength days. Add a 20-min mobility session today to prevent burnout and boost recovery by 18%.
            </p>
            <Link
              to="/ai-trainer"
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold border-b border-primary-foreground/40"
            >
              Ask AI Coach <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Achievements + Leaderboard */}
        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 p-8 rounded-3xl glass gold-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <h2 className="font-display text-2xl">Achievements</h2>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">8 of 24 unlocked</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {[
                { icon: Flame, name: "Streak 7", unlocked: true },
                { icon: Trophy, name: "First PR", unlocked: true },
                { icon: Medal, name: "100 Workouts", unlocked: true },
                { icon: Zap, name: "Early Bird", unlocked: true },
                { icon: Heart, name: "Cardio King", unlocked: false },
                { icon: Dumbbell, name: "Iron Lord", unlocked: false },
              ].map((a) => (
                <div
                  key={a.name}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl ${
                    a.unlocked ? "bg-background/40 border border-primary/30" : "bg-background/20 opacity-40"
                  }`}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    a.unlocked ? "bg-gradient-gold shadow-gold" : "bg-muted"
                  }`}>
                    <a.icon className={`h-5 w-5 ${a.unlocked ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-[10px] text-center uppercase tracking-wider">{a.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 rounded-3xl glass gold-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="font-display text-2xl">Leaderboard</h2>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Weekly</span>
            </div>
            <div className="space-y-3">
              {[
                { rank: 1, name: "Priya S.", points: 2840 },
                { rank: 2, name: "Karan M.", points: 2615 },
                { rank: 3, name: name, points: 2480, you: true },
                { rank: 4, name: "Anjali R.", points: 2210 },
                { rank: 5, name: "Vikram T.", points: 1980 },
              ].map((p) => (
                <div
                  key={p.rank}
                  className={`flex items-center gap-3 p-2.5 rounded-xl ${
                    p.you ? "bg-gradient-gold/10 border border-primary/40" : ""
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    p.rank === 1 ? "bg-gradient-gold text-primary-foreground shadow-gold" :
                    p.rank <= 3 ? "bg-primary/20 text-primary" : "bg-background/40 text-muted-foreground"
                  }`}>
                    {p.rank}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      {p.name}
                      {p.you && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground">You</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gradient-gold font-bold">{p.points.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming sessions list */}
        <div className="p-8 rounded-3xl glass gold-border mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <h2 className="font-display text-2xl">Upcoming Sessions</h2>
            </div>
            <Link to="/classes" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { day: "Today", time: "18:00", name: "Iron Sanctuary", coach: "Aarav", spots: 4 },
              { day: "Tomorrow", time: "07:00", name: "Sunrise Yoga", coach: "Maya", spots: 8 },
              { day: "Fri", time: "19:30", name: "HIIT Inferno", coach: "Rohan", spots: 2 },
              { day: "Sat", time: "10:00", name: "Boxing Fundamentals", coach: "Dev", spots: 6 },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-background/40 border border-border/40 hover:border-primary/40 transition">
                <div className="text-center min-w-[60px]">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.day}</div>
                  <div className="font-display text-xl text-gradient-gold">{s.time}</div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">Coach {s.coach} · {s.spots} spots left</div>
                </div>
                <button className="px-4 py-2 rounded-full glass gold-border text-[10px] uppercase tracking-[0.2em] hover:bg-accent/40 transition">
                  Book
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Membership card */}
        <div className="p-8 md:p-10 rounded-3xl glass gold-border mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="font-display text-3xl">Your Membership</h2>
          </div>

          {membershipLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading membership…
            </div>
          ) : !membership || (!membership.active && !("subscriptionId" in membership && membership.subscriptionId)) ? (
            <div>
              <p className="text-muted-foreground mb-6">You don't have an active membership yet.</p>
              <Link
                to="/membership"
                className="px-8 py-3 rounded-full bg-gradient-gold text-primary-foreground text-xs font-semibold uppercase tracking-[0.25em] shadow-gold inline-block"
              >
                Choose a Plan
              </Link>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <Stat label="Tier" value={membership.plan ?? "—"} accent />
                <Stat label="Status" value={membership.cancelAtPeriodEnd ? "Canceling" : (membership.status ?? "—")} />
                <Stat
                  label={membership.cancelAtPeriodEnd ? "Ends" : "Renews"}
                  value={membership.currentPeriodEnd ? new Date(membership.currentPeriodEnd).toLocaleDateString() : "—"}
                />
                <Stat label="Auto-renew" value={membership.cancelAtPeriodEnd ? "Off" : "On"} />
              </div>

              {membership.cancelAtPeriodEnd && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm">
                  Your membership will cancel on{" "}
                  <strong>
                    {membership.currentPeriodEnd ? new Date(membership.currentPeriodEnd).toLocaleDateString() : "the period end"}
                  </strong>. You'll keep access until then.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={openPortal}
                  disabled={actionLoading !== null}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground text-xs font-semibold uppercase tracking-[0.25em] shadow-gold disabled:opacity-60"
                >
                  {actionLoading === "portal" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Settings className="h-3 w-3" />}
                  Manage Billing
                </button>

                {membership.cancelAtPeriodEnd ? (
                  <button
                    onClick={resume}
                    disabled={actionLoading !== null}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass gold-border text-xs font-semibold uppercase tracking-[0.25em] hover:bg-accent/40 disabled:opacity-60"
                  >
                    {actionLoading === "resume" && <Loader2 className="h-3 w-3 animate-spin" />}
                    Resume Membership
                  </button>
                ) : (
                  <button
                    onClick={cancel}
                    disabled={actionLoading !== null || !membership.active}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass border border-destructive/40 text-xs font-semibold uppercase tracking-[0.25em] text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  >
                    {actionLoading === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    Cancel Membership
                  </button>
                )}

                <Link
                  to="/membership"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass text-xs font-semibold uppercase tracking-[0.25em] hover:bg-accent/40"
                >
                  Change Plan
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Invoices / Receipts */}
        <div className="p-8 md:p-10 rounded-3xl glass gold-border mb-10">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-display text-3xl">Billing History</h2>
            </div>
            <button
              onClick={loadInvoices}
              disabled={invoicesLoading}
              className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition disabled:opacity-50"
            >
              {invoicesLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {invoicesLoading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices…
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground">No invoices yet. Once you subscribe, your receipts will appear here.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="search"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search by invoice # or amount…"
                    className="w-full pl-9 pr-3 py-2 rounded-full glass gold-border bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/60"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["all", "paid", "open", "void", "uncollectible", "draft"] as const).map((s) => {
                    const count = statusCounts[s] ?? 0;
                    if (s !== "all" && count === 0) return null;
                    const active = invoiceStatus === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInvoiceStatus(s)}
                        className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] transition ${
                          active
                            ? "bg-gradient-gold text-primary-foreground shadow-gold"
                            : "glass gold-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s} <span className="ml-1 opacity-70">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredInvoices.length === 0 ? (
                <p className="text-muted-foreground">No invoices match your filters.</p>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        <th className="text-left font-normal py-3 px-2">Date</th>
                        <th className="text-left font-normal py-3 px-2">Invoice</th>
                        <th className="text-left font-normal py-3 px-2">Amount</th>
                        <th className="text-left font-normal py-3 px-2">Status</th>
                        <th className="text-right font-normal py-3 px-2">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="border-t border-border/40">
                          <td className="py-4 px-2 whitespace-nowrap">{new Date(inv.created).toLocaleDateString()}</td>
                          <td className="py-4 px-2 font-mono text-xs text-muted-foreground">{inv.number ?? inv.id.slice(-8)}</td>
                          <td className="py-4 px-2 whitespace-nowrap">{formatAmount(inv.amountPaid || inv.amountDue, inv.currency)}</td>
                          <td className="py-4 px-2">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-[10px] uppercase tracking-wider ${
                                inv.status === "paid"
                                  ? "bg-primary/10 text-primary"
                                  : inv.status === "open"
                                    ? "bg-yellow-500/10 text-yellow-500"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {inv.status ?? "—"}
                            </span>
                          </td>
                          <td className="py-4 px-2">
                            <div className="flex items-center justify-end gap-2">
                              {inv.invoicePdf && (
                                <a
                                  href={inv.invoicePdf}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass gold-border text-[10px] uppercase tracking-[0.2em] hover:bg-accent/40"
                                >
                                  <Download className="h-3 w-3" /> PDF
                                </a>
                              )}
                              {inv.hostedInvoiceUrl && (
                                <a
                                  href={inv.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[10px] uppercase tracking-[0.2em] hover:bg-accent/40"
                                >
                                  <ExternalLink className="h-3 w-3" /> View
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Refer a friend banner */}
        <div className="p-8 rounded-3xl bg-gradient-gold text-primary-foreground relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 bg-background/10 rounded-full" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 bg-background/10 rounded-full" />
          <div className="relative flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-background/20 flex items-center justify-center">
                <Share2 className="h-6 w-6" />
              </div>
              <div>
                <div className="font-display text-2xl">Refer a friend, earn a free month</div>
                <div className="text-sm opacity-80 mt-1">Share your link — both of you get 30 days on us.</div>
              </div>
            </div>
            <button className="px-6 py-3 rounded-full bg-background text-foreground text-xs font-semibold uppercase tracking-[0.25em] hover:bg-background/90 transition">
              Get My Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">{label}</div>
      <div className={`font-display capitalize ${accent ? "text-3xl text-gradient-gold" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function ProgressRing({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, pct) / 100) * c;
  return (
    <div className="relative h-[180px] w-[180px]">
      <svg className="-rotate-90" viewBox="0 0 160 160" width="180" height="180">
        <circle cx="80" cy="80" r={r} fill="none" stroke="oklch(0.18 0.015 75)" strokeWidth="10" />
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke="url(#gold)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <defs>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.85 0.15 85)" />
            <stop offset="100%" stopColor="oklch(0.65 0.13 75)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-4xl text-gradient-gold">{label}</div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1">{sub}</div>
        <div className="text-xs text-primary mt-1">{pct}%</div>
      </div>
    </div>
  );
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount == null) return "—";
  const cur = (currency ?? "usd").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${cur}`;
  }
}
