import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/membership", label: "Membership" },
  { to: "/ai-trainer", label: "AI Trainer" },
  { to: "/classes", label: "Classes" },
  { to: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ease-luxury ${
        scrolled ? "glass border-b border-border/50 py-3" : "py-6"
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
            <span className="font-display text-background font-semibold text-sm tracking-tight">RK</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-wider text-gradient-gold">RKDF</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">Luxe Fitness</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-10">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors relative group"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
              <span className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-gold scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-luxury origin-left" />
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/auth"
            className="text-sm uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/membership"
            className="relative px-6 py-2.5 rounded-full bg-gradient-gold text-primary-foreground text-xs font-semibold uppercase tracking-[0.2em] shadow-gold hover:shadow-gold-lg hover:scale-[1.03] transition-all duration-500 ease-luxury overflow-hidden"
          >
            <span className="relative z-10">Join Now</span>
          </Link>
        </div>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen(!open)}
          className="lg:hidden text-foreground"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden glass border-t border-border/50 mt-3">
          <div className="container mx-auto px-6 py-6 flex flex-col gap-5">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-sm uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link to="/auth" className="text-sm uppercase tracking-[0.15em]">
              Sign in
            </Link>
            <Link
              to="/membership"
              className="text-center px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground text-xs font-semibold uppercase tracking-[0.2em]"
            >
              Join Now
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
