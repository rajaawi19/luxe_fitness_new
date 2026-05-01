import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Wraps page content with a smooth fade+slide animation that re-runs on every
 * route change. Uses the pathname as a React key so the subtree remounts and
 * the CSS animation replays.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="route-transition">
      {children}
    </div>
  );
}
