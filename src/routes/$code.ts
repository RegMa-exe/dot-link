import { createFileRoute } from "@tanstack/react-router";

function deviceFromUA(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "Tablet";
  if (/mobi|iphone|android/.test(s)) return "Mobile";
  if (/bot|crawler|spider|preview/.test(s)) return "Bot";
  return "Desktop";
}

async function hashVisitor(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(buf)]
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/$code")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: link } = await supabaseAdmin
          .from("links")
          .select("id, long_url")
          .eq("short_code", params.code)
          .maybeSingle();

        if (!link) {
          return new Response(null, { status: 302, headers: { location: "/?notfound=1" } });
        }

        const headers = request.headers;
        const ua = headers.get("user-agent") ?? "";
        const ip =
          headers.get("cf-connecting-ip") ??
          headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        const country = headers.get("cf-ipcountry") ?? "Unknown";
        const rawRef = headers.get("referer");
        let referrer = "Direct";
        if (rawRef) {
          try {
            referrer = new URL(rawRef).hostname;
          } catch {
            referrer = "Unknown";
          }
        }

        try {
          await supabaseAdmin.from("clicks").insert({
            link_id: link.id,
            referrer,
            device: deviceFromUA(ua),
            country: country === "XX" || country === "T1" ? "Unknown" : country,
            visitor_hash: await hashVisitor(`${ip}|${ua}|${link.id}`),
          });
        } catch (e) {
          console.error("click log failed", e);
        }

        return new Response(null, {
          status: 302,
          headers: { location: link.long_url, "cache-control": "no-store" },
        });
      },
    },
  },
});
