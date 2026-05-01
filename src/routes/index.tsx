import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Activity, Dumbbell, Users, Award, Cpu } from "lucide-react";
import heroImg from "@/assets/hero-gym.jpg";
import aiImg from "@/assets/ai-trainer.jpg";
import equipImg from "@/assets/equipment.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RKDF Gym — Luxury AI Fitness Sanctuary" },
      { name: "description", content: "Step into the world's most advanced luxury fitness sanctuary. AI trainers, smart equipment, elite membership." },
      { property: "og:title", content: "RKDF Gym — Luxury AI Fitness Sanctuary" },
      { property: "og:description", content: "Where elite training meets intelligent design." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden -mt-20 pt-20">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Luxury AI gym sanctuary"
            className="w-full h-full object-cover object-center"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-gradient-radial-gold opacity-50" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="animate-fade-up flex items-center gap-3 mb-8">
              <div className="h-px w-12 bg-gradient-gold" />
              <span className="text-xs uppercase tracking-[0.4em] text-gradient-gold">
                The Future of Fitness
              </span>
            </div>
            <h1 className="animate-fade-up delay-100 font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] mb-8">
              Where strength
              <br />
              meets <span className="text-gradient-gold italic">intelligence</span>.
            </h1>
            <p className="animate-fade-up delay-200 text-lg md:text-xl text-muted-foreground max-w-xl mb-12 leading-relaxed">
              RKDF is the world's first luxury AI-powered fitness sanctuary —
              an ecosystem where elite training, smart equipment, and personalized
              coaching converge.
            </p>
            <div className="animate-fade-up delay-300 flex flex-col sm:flex-row gap-4">
              <Link
                to="/membership"
                className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-gradient-gold text-primary-foreground text-xs font-semibold uppercase tracking-[0.25em] shadow-gold-lg hover:scale-[1.03] transition-all duration-500 ease-luxury overflow-hidden"
              >
                <span className="relative z-10">Begin Your Journey</span>
                <ArrowRight className="relative z-10 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 shimmer opacity-50" />
              </Link>
              <Link
                to="/ai-trainer"
                className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full glass gold-border text-xs font-semibold uppercase tracking-[0.25em] hover:bg-accent/40 transition-all duration-500 ease-luxury"
              >
                <Sparkles className="h-4 w-4" />
                Meet the AI Trainer
              </Link>
            </div>

            <div className="animate-fade-up delay-500 mt-20 grid grid-cols-3 gap-8 max-w-2xl">
              {[
                { v: "12K+", l: "Elite Members" },
                { v: "98%", l: "Goal Achievement" },
                { v: "24/7", l: "AI Concierge" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-3xl md:text-4xl text-gradient-gold mb-1">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-primary to-transparent animate-pulse" />
        </div>
      </section>

      {/* PILLARS */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-[0.4em] text-gradient-gold">Our Pillars</span>
            <h2 className="font-display text-4xl md:text-6xl mt-6">
              An ecosystem, not a gym.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Cpu, title: "AI Engine", desc: "Adaptive workouts, computer-vision form correction, and predictive analytics built around your biology." },
              { icon: Activity, title: "Smart IoT", desc: "Connected wearables and equipment sync your every rep, heartbeat, and recovery in real time." },
              { icon: Dumbbell, title: "Elite Training", desc: "Olympic coaches, biomechanics labs, and a sanctuary designed for performance and longevity." },
              { icon: Users, title: "Private Community", desc: "An invite-only network of athletes, founders, and creators who train together." },
              { icon: Award, title: "Lifestyle Concierge", desc: "Recovery suites, nutritionists, sleep specialists. Wellness, curated end to end." },
              { icon: Sparkles, title: "Gamified Progress", desc: "Earn badges, climb leaderboards, and unlock rewards across the RKDF ecosystem." },
            ].map((p, i) => (
              <div
                key={p.title}
                className="group relative p-8 rounded-2xl glass hover:shadow-gold transition-all duration-700 ease-luxury hover:-translate-y-1"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-14 w-14 rounded-xl bg-gradient-gold flex items-center justify-center mb-6 shadow-gold group-hover:scale-110 transition-transform duration-500 ease-luxury">
                  <p.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-2xl mb-3">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI SHOWCASE */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial-gold opacity-30" />
        <div className="container mx-auto px-6 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-radial-gold opacity-60 blur-3xl" />
              <img
                src={aiImg}
                alt="AI fitness trainer hologram"
                loading="lazy"
                width={1024}
                height={1024}
                className="relative rounded-3xl gold-border animate-float"
              />
            </div>
            <div>
              <span className="text-xs uppercase tracking-[0.4em] text-gradient-gold">The AI Trainer</span>
              <h2 className="font-display text-4xl md:text-6xl mt-6 mb-8 leading-[1.05]">
                Your coach, <em className="text-gradient-gold not-italic">reimagined</em>.
              </h2>
              <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
                A neural model that learns from your biometrics, mood, sleep, and
                performance to engineer the perfect workout — every single day.
              </p>
              <ul className="space-y-5 mb-10">
                {[
                  "Real-time form correction via computer vision",
                  "Adaptive programming based on recovery data",
                  "Voice-activated workouts and nutrition guidance",
                  "Injury prediction with personalized prevention",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-4">
                    <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gradient-gold shadow-gold" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/ai-trainer"
                className="inline-flex items-center gap-3 text-sm uppercase tracking-[0.25em] text-gradient-gold hover:gap-5 transition-all duration-500 ease-luxury"
              >
                Discover the engine
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MEMBERSHIP CTA */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="relative rounded-3xl overflow-hidden glass gold-border p-12 md:p-20">
            <div className="absolute inset-0 opacity-30">
              <img src={equipImg} alt="" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            </div>
            <div className="relative max-w-2xl">
              <span className="text-xs uppercase tracking-[0.4em] text-gradient-gold">Membership</span>
              <h2 className="font-display text-4xl md:text-6xl mt-6 mb-6 leading-tight">
                Three tiers.
                <br />
                One unforgettable experience.
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                From dedicated training to elite VIP access — find the membership
                that elevates your standard.
              </p>
              <Link
                to="/membership"
                className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-gradient-gold text-primary-foreground text-xs font-semibold uppercase tracking-[0.25em] shadow-gold hover:shadow-gold-lg hover:scale-[1.03] transition-all duration-500 ease-luxury"
              >
                Explore Plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
