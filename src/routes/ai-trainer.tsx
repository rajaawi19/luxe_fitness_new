import { createFileRoute } from "@tanstack/react-router";
import { Brain, Eye, Mic, HeartPulse, ShieldCheck, Zap } from "lucide-react";
import aiImg from "@/assets/ai-trainer.jpg";

export const Route = createFileRoute("/ai-trainer")({
  head: () => ({
    meta: [
      { title: "AI Trainer — RKDF Gym" },
      { name: "description", content: "Meet the RKDF AI Trainer — adaptive workouts, computer vision form correction, and predictive recovery." },
      { property: "og:title", content: "RKDF AI Trainer" },
      { property: "og:description", content: "An intelligent coach that learns you." },
    ],
  }),
  component: AiTrainerPage,
});

const features = [
  { icon: Brain, title: "Adaptive Programming", desc: "Daily workouts engineered from your sleep, recovery, and performance data." },
  { icon: Eye, title: "Computer Vision", desc: "Real-time form correction and rep counting through smart cameras across the floor." },
  { icon: Mic, title: "Voice Coach", desc: "Hands-free guidance — start workouts, log meals, and track calories with your voice." },
  { icon: HeartPulse, title: "Biometric Sync", desc: "Wearables and heart-rate monitors stream data continuously to optimize intensity." },
  { icon: ShieldCheck, title: "Injury Prevention", desc: "Predictive analytics flag risk before it happens, with personalized mobility plans." },
  { icon: Zap, title: "Mood Aware", desc: "Adjusts intensity based on stress, focus, and energy — training that feels right." },
];

function AiTrainerPage() {
  return (
    <div className="py-24">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
          <div>
            <span className="text-xs uppercase tracking-[0.4em] text-gradient-gold">The AI Trainer</span>
            <h1 className="font-display text-5xl md:text-7xl mt-6 mb-8 leading-[1.05]">
              A coach built<br /> from your <em className="text-gradient-gold not-italic">data</em>.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The RKDF AI Trainer is a neural model trained on millions of training
              sessions and tuned to your unique biology. It plans, observes,
              corrects, and adapts — every minute, every rep.
            </p>
          </div>
          <div className="relative">
            <div className="absolute -inset-12 bg-gradient-radial-gold blur-3xl opacity-70" />
            <img
              src={aiImg}
              alt="AI trainer hologram"
              loading="lazy"
              width={1024}
              height={1024}
              className="relative rounded-3xl gold-border animate-float"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-8 rounded-2xl glass hover:shadow-gold transition-all duration-700 ease-luxury hover:-translate-y-1"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-gold flex items-center justify-center mb-5 shadow-gold">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-2xl mb-3">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl mb-6">Powered by intelligence. <em className="text-gradient-gold not-italic">Tuned by you.</em></h2>
          <p className="text-muted-foreground">
            Available exclusively with the Elite membership. Other tiers receive
            curated AI insights and weekly programming.
          </p>
        </div>
      </div>
    </div>
  );
}
