import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "rkdf_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function trackEvent(
  event: string,
  properties: Record<string, any> = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { data: sess } = await supabase.auth.getSession();
    const path = window.location.pathname;
    await supabase.from("analytics_events").insert({
      event,
      properties,
      path,
      session_id: getSessionId(),
      user_id: sess.session?.user.id ?? null,
    });
  } catch (e) {
    // Never break UX on tracking failure
    console.warn("trackEvent failed", e);
  }
}
