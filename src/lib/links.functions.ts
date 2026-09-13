import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RESERVED = new Set(["auth", "dashboard", "api", "link", "assets", "favicon.ico", "robots.txt"]);

const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 7) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

const createSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter a URL")
    .max(2048, "URL is too long")
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .refine((v) => {
      try {
        const u = new URL(v);
        return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
      } catch {
        return false;
      }
    }, "That doesn't look like a valid URL"),
  alias: z
    .string()
    .trim()
    .max(40, "Alias is too long")
    .regex(/^[a-zA-Z0-9_-]*$/, "Letters, numbers, - and _ only")
    .optional()
    .default(""),
  title: z.string().trim().max(120).optional().default(""),
});

export const createLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { url: string; alias?: string | undefined; title?: string | undefined }) =>
    createSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let code = data.alias;
    if (code) {
      if (RESERVED.has(code.toLowerCase())) throw new Error("That alias is reserved");
      const { data: existing } = await supabase
        .from("links")
        .select("id")
        .eq("short_code", code)
        .maybeSingle();
      if (existing) throw new Error("That alias is already taken");
    } else {
      code = randomCode();
    }

    const { data: row, error } = await supabase
      .from("links")
      .insert({
        user_id: userId,
        short_code: code,
        long_url: data.url,
        title: data.title || null,
      })
      .select("id, short_code, long_url, title, created_at")
      .single();

    if (error) throw new Error(error.message.includes("duplicate") ? "That alias is already taken" : error.message);
    return row;
  });

export const listLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: links, error } = await supabase
      .from("links")
      .select("id, short_code, long_url, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (links ?? []).map((l) => l.id);
    const counts = new Map<string, { clicks: number; visitors: Set<string> }>();
    if (ids.length) {
      const { data: clicks } = await supabase
        .from("clicks")
        .select("link_id, visitor_hash")
        .in("link_id", ids)
        .limit(50000);
      for (const c of clicks ?? []) {
        const entry = counts.get(c.link_id) ?? { clicks: 0, visitors: new Set<string>() };
        entry.clicks += 1;
        if (c.visitor_hash) entry.visitors.add(c.visitor_hash);
        counts.set(c.link_id, entry);
      }
    }

    return (links ?? []).map((l) => ({
      ...l,
      clicks: counts.get(l.id)?.clicks ?? 0,
      visitors: counts.get(l.id)?.visitors.size ?? 0,
    }));
  });

export const deleteLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getLinkAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: link, error } = await supabase
      .from("links")
      .select("id, short_code, long_url, title, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!link) throw new Error("Link not found");

    const { data: clicks } = await supabase
      .from("clicks")
      .select("created_at, referrer, device, country, visitor_hash")
      .eq("link_id", data.id)
      .order("created_at", { ascending: true })
      .limit(20000);

    const rows = clicks ?? [];
    const visitors = new Set(rows.map((r) => r.visitor_hash ?? "").filter(Boolean));

    const tally = (key: "referrer" | "device" | "country") => {
      const map = new Map<string, number>();
      for (const r of rows) {
        const k = (r[key] || "Unknown").toString();
        map.set(k, (map.get(k) ?? 0) + 1);
      }
      return [...map.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    };

    const days: { date: string; clicks: number }[] = [];
    const dayMap = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.created_at).toISOString().slice(0, 10);
      dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
    }
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push({ date: d, clicks: dayMap.get(d) ?? 0 });
    }

    return {
      link,
      totals: { clicks: rows.length, visitors: visitors.size },
      referrers: tally("referrer"),
      devices: tally("device"),
      countries: tally("country"),
      overTime: days,
      recent: rows.slice(-12).reverse(),
    };
  });
