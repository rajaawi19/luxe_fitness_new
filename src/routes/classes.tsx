import { createFileRoute } from "@tanstack/react-router";
import { Clock, Users } from "lucide-react";

export const Route = createFileRoute("/classes")({
  head: () => ({
    meta: [
      { title: "Classes — RKDF Gym" },
      { name: "description", content: "Curated luxury fitness classes — strength, mobility, breathwork, and AI-led HIIT." },
      { property: "og:title", content: "RKDF Classes" },
      { property: "og:description", content: "Elite group classes for body and mind." },
    ],
  }),
  component: ClassesPage,
});

const classes = [
  { name: "Iron Sanctuary", type: "Strength", time: "06:00 · 18:00", coach: "Aarav Mehta", spots: 8 },
  { name: "AI HIIT Lab", type: "Conditioning", time: "07:00 · 19:30", coach: "AI + Coach Raina", spots: 12 },
  { name: "Mobility Atelier", type: "Mobility", time: "08:30", coach: "Sana Kapoor", spots: 10 },
  { name: "Breath & Recovery", type: "Wellness", time: "20:00", coach: "Vikram Joshi", spots: 14 },
  { name: "Power Yoga Noir", type: "Yoga", time: "06:30 · 17:00", coach: "Isha Roy", spots: 16 },
  { name: "Combat Lounge", type: "Boxing", time: "19:00", coach: "Reza Khan", spots: 10 },
];

function ClassesPage() {
  return (
    <div className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="text-xs uppercase tracking-[0.4em] text-gradient-gold">Classes</span>
          <h1 className="font-display text-5xl md:text-7xl mt-6 mb-6">
            Curated by <em className="text-gradient-gold not-italic">design</em>.
          </h1>
          <p className="text-lg text-muted-foreground">
            Intimate group sessions led by world-class coaches and our AI engine —
            book your spot in seconds.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((c) => (
            <div
              key={c.name}
              className="group p-8 rounded-2xl glass hover:shadow-gold transition-all duration-700 ease-luxury hover:-translate-y-1"
            >
              <div className="text-[10px] uppercase tracking-[0.3em] text-gradient-gold mb-3">{c.type}</div>
              <h3 className="font-display text-3xl mb-6">{c.name}</h3>
              <div className="space-y-3 text-sm text-muted-foreground mb-8">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  {c.time}
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  {c.spots} spots · {c.coach}
                </div>
              </div>
              <button className="w-full px-6 py-3 rounded-full glass gold-border text-xs font-semibold uppercase tracking-[0.25em] hover:bg-accent/40 transition-all duration-500 ease-luxury">
                Reserve Spot
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
