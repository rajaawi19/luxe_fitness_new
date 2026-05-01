import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { createCheckoutSession, type PlanName } from "@/integrations/stripe.server";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/track";

export const Route = createFileRoute("/membership")({
  head: () => ({
    meta: [
      { title: "Membership — RKDF Gym" },
      { name: "description", content: "Choose from Basic, Premium, or Elite membership at RKDF — luxury AI fitness curated for you." },
      { property: "og:title", content: "RKDF Membership — Basic, Premium, Elite" },
      { property: "og:description", content: "Three tiers of luxury AI fitness." },
    ],
  }),
  component: MembershipPage,
});

const plans: Array<{
  name: PlanName;
  price: number;
  tagline: string;
  features: string[];
  highlight: boolean;
}> = [
  {
    name: "Basic",
    price: 999,
    tagline: "Begin your journey",
    features: [
      "24/7 gym access",
      "Locker & towel service",
      "Mobile app access",
      "Group workout floor",
    ],
    highlight: false,
  },
  {
    name: "Premium",
    price: 1999,
    tagline: "Train smarter",
    features: [
      "Everything in Basic",
      "Unlimited group classes",
      "AI-generated diet plan",
      "Wearable integration",
      "Recovery lounge access",
    ],
    highlight: true,
  },
  {
    name: "Elite",
    price: 4999,
    tagline: "The complete sanctuary",
    features: [
      "Everything in Premium",
      "Personal AI Trainer",
      "1-on-1 coach sessions",
      "VIP private lounge",
      "Concierge & nutritionist",
      "Priority booking",
    ],
    highlight: false,
  },
];

function MembershipPage() {
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);

  useEffect(() => {
    trackEvent("membership_page_viewed");
    plans.forEach((p) => trackEvent("plan_viewed", { plan: p.name, price: p.price }));
  }, []);

  const handleSelect = async (plan: PlanName) => {
    setLoadingPlan(plan);
    trackEvent("checkout_started", { plan });
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        toast.info("Please sign in to continue to checkout");
        navigate({ to: "/auth" });
        return;
      }
      const { url } = await createCheckoutSession({
        data: { plan, origin: window.location.origin },
        headers: { Authorization: `Bearer ${sess.session.access_token}` },
      } as any);
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      toast.error(msg);
      setLoadingPlan(null);
    }
  };

  return (
    <div className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-xs uppercase tracking-[0.4em] text-gradient-gold">Membership</span>
          <h1 className="font-display text-5xl md:text-7xl mt-6 mb-6">
            Choose your <em className="text-gradient-gold not-italic">tier</em>.
          </h1>
          <p className="text-lg text-muted-foreground">
            Every membership unlocks the RKDF ecosystem. The difference is how
            personalized you want it.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isLoading = loadingPlan === plan.name;
            return (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-10 transition-all duration-700 ease-luxury hover:-translate-y-2 ${
                  plan.highlight
                    ? "bg-gradient-to-b from-card to-background gold-border shadow-gold-lg scale-[1.03]"
                    : "glass hover:shadow-gold"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-gold text-primary-foreground text-[10px] uppercase tracking-[0.3em] font-semibold shadow-gold flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    Most Loved
                  </div>
                )}

                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
                  {plan.tagline}
                </div>
                <h3 className="font-display text-4xl mb-6">{plan.name}</h3>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-xs text-muted-foreground">₹</span>
                  <span className="font-display text-6xl text-gradient-gold">
                    {plan.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSelect(plan.name)}
                  disabled={isLoading || loadingPlan !== null}
                  className={`w-full text-center px-6 py-4 rounded-full text-xs font-semibold uppercase tracking-[0.25em] transition-all duration-500 ease-luxury inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                    plan.highlight
                      ? "bg-gradient-gold text-primary-foreground shadow-gold hover:shadow-gold-lg hover:scale-[1.02]"
                      : "glass gold-border hover:bg-accent/40"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Redirecting…
                    </>
                  ) : (
                    <>Select {plan.name}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground mt-16">
          All plans include a complimentary 7-day trial • Cancel anytime
        </p>
      </div>
    </div>
  );
}
