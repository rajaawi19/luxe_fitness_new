import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { RouteTransition } from "@/components/site/RouteTransition";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-9xl text-gradient-gold">404</h1>
        <h2 className="mt-4 text-xl uppercase tracking-[0.3em] text-foreground">Lost in the sanctuary</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          This page does not exist. Let us guide you back.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-gold px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground shadow-gold"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RKDF Gym — Luxury AI Fitness & Lifestyle Ecosystem" },
      { name: "description", content: "Where elite training meets intelligent design. Discover RKDF, the world's first AI-powered luxury fitness sanctuary." },
      { name: "author", content: "RKDF Gym" },
      { property: "og:title", content: "RKDF Gym — Luxury AI Fitness Ecosystem" },
      { property: "og:description", content: "AI-powered luxury fitness. Personalized training, smart equipment, and elite community." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Navbar />
      <main className="pt-20 min-h-[calc(100vh-5rem)]">
        <RouteTransition>
          <Outlet />
        </RouteTransition>
      </main>
      <Footer />
      <Toaster />
    </>
  );
}
