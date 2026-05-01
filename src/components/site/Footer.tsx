import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/50 mt-32 pt-20 pb-10 bg-gradient-dark">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
                <span className="font-display text-background font-semibold">RK</span>
              </div>
              <div>
                <div className="font-display text-2xl text-gradient-gold tracking-wider">RKDF</div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Luxe Fitness Ecosystem</div>
              </div>
            </div>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              The world's first luxury AI-powered fitness sanctuary. Where elite training meets intelligent design.
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.25em] text-gradient-gold mb-5">Explore</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link to="/membership" className="hover:text-foreground transition-colors">Membership</Link></li>
              <li><Link to="/ai-trainer" className="hover:text-foreground transition-colors">AI Trainer</Link></li>
              <li><Link to="/classes" className="hover:text-foreground transition-colors">Classes</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-[0.25em] text-gradient-gold mb-5">Sanctuary</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Bandra West, Mumbai</li>
              <li>+91 98765 43210</li>
              <li>concierge@rkdf.fit</li>
              <li>Open 24 / 7</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            © {new Date().getFullYear()} RKDF Gym — All rights reserved
          </p>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Crafted with intelligence
          </p>
        </div>
      </div>
    </footer>
  );
}
