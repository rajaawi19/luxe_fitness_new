import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { verifyCheckoutSession } from "@/integrations/stripe.server";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/track";

export const Route = createFileRoute("/checkout/success")({
  head: () => ({
    meta: [
      { title: "Membership Confirmed — RKDF Gym" },
      { name: "description", content: "Your RKDF membership is now active." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: (search.session_id as string) || "",
  }),
  component: CheckoutSuccessPage,
});

type Verified = Awaited<ReturnType<typeof verifyCheckoutSession>>;

function CheckoutSuccessPage() {
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [info, setInfo] = useState<Verified | null>(null);

  useEffect(() => {
    if (!session_id) {
      setState("error");
      return;
    }
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          navigate({ to: "/auth" });
          return;
        }
        const result = await verifyCheckoutSession({
          data: { sessionId: session_id },
          headers: { Authorization: `Bearer ${sess.session.access_token}` },
        } as any);
        if (!result.paid) throw new Error("Payment not completed");
        setInfo(result);
        setState("ok");
        trackEvent("checkout_completed", {
          plan: result.plan,
          amountTotal: result.amountTotal,
          currency: result.currency,
        });
        toast.success(`${result.plan} membership activated`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed";
        toast.error(msg);
        setState("error");
      }
    })();
  }, [session_id, navigate]);

  if (state === "loading") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
        <Loader2 className="h-10 w-10 animate-spin text-gradient-gold" />
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Confirming your membership…
        </p>
      </div>
    );
  }

  if (state === "error" || !info) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-5xl mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          We couldn't confirm your payment. If you were charged, please contact us.
        </p>
        <Link
          to="/membership"
          className="px-8 py-3 rounded-full bg-gradient-gold text-primary-foreground text-xs font-semibold uppercase tracking-[0.25em] shadow-gold"
        >
          Back to Membership
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-20 px-6">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="mx-auto mb-8 h-20 w-20 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold-lg">
            <Check className="h-10 w-10 text-primary-foreground" strokeWidth={3} />
          </div>
          <span className="text-xs uppercase tracking-[0.4em] text-gradient-gold">
            Membership Activated
          </span>
          <h1 className="font-display text-5xl md:text-6xl mt-4 mb-4">
            Welcome to <em className="text-gradient-gold not-italic">RKDF</em>.
          </h1>
          <p className="text-muted-foreground">
            Your {info.plan} tier is now live. Your sanctuary awaits.
          </p>
        </div>

        <div className="p-8 rounded-3xl glass gold-border space-y-4">
          <Row label="Plan" value={info.plan ?? "—"} accent />
          <Row
            label="Amount"
            value={
              info.amountTotal
                ? `${(info.amountTotal / 100).toLocaleString()} ${info.currency?.toUpperCase()}`
                : "—"
            }
          />
          <Row label="Status" value={info.subscriptionStatus ?? info.status ?? "—"} />
          <Row label="Email" value={info.email ?? "—"} />
          {info.currentPeriodEnd && (
            <Row
              label="Renews"
              value={new Date(info.currentPeriodEnd).toLocaleDateString()}
            />
          )}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/dashboard"
            className="px-8 py-4 rounded-full bg-gradient-gold text-primary-foreground text-xs font-semibold uppercase tracking-[0.25em] shadow-gold inline-flex items-center justify-center gap-2"
          >
            <Sparkles className="h-3 w-3" />
            Enter Dashboard
          </Link>
          <Link
            to="/membership"
            className="px-8 py-4 rounded-full glass gold-border text-xs font-semibold uppercase tracking-[0.25em] inline-flex items-center justify-center"
          >
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-medium capitalize ${accent ? "text-gradient-gold font-display text-lg" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
