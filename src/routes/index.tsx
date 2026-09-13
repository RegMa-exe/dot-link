import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dotlink — short links with real analytics" },
      {
        name: "description",
        content:
          "Shorten any URL, pick a custom alias, and see clicks, unique visitors, referrers, devices and countries.",
      },
      { property: "og:title", content: "Dotlink — short links with real analytics" },
      {
        property: "og:description",
        content: "Shorten any URL, pick a custom alias, and track every click.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    const { data } = await supabase.auth.getSession();
    sessionStorage.setItem("pending_url", url.trim());
    if (!data.session) {
      toast.message("Sign in to save your link");
      navigate({ to: "/auth" });
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="dot-grid border-b border-border">
          <div className="mx-auto max-w-5xl px-5 py-24">
            <p className="label-xs">Link shortener · analytics</p>
            <h1 className="mt-4 font-dot text-6xl leading-[0.95] tracking-tight sm:text-8xl">
              Make it
              <br />
              <span className="text-signal">short.</span>
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              One long URL in. One clean short link out. Every click counted — visitors, sources,
              devices, countries.
            </p>

            <form onSubmit={go} className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={2048}
                placeholder="https://your-very-long-url.com/campaign"
                className="flex-1 rounded-full border border-border bg-card px-6 py-4 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-signal"
              />
              <button
                type="submit"
                className="rounded-full bg-signal px-8 py-4 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
              >
                Shorten
              </button>
            </form>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-3 px-5 py-16 md:grid-cols-3">
          <Card
            n="01"
            title="Custom alias"
            body="Claim the exact slug your campaign deserves, or let it generate one."
          />
          <Card
            n="02"
            title="Live counts"
            body="Total clicks and unique visitors on every link, updated as they land."
          />
          <Card
            n="03"
            title="Full breakdown"
            body="Referrer, device, country and a 14-day clicks-over-time curve."
          />
        </section>

        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-8">
            <span className="label-xs">Dotlink</span>
            <span className="font-mono text-xs text-muted-foreground">0123456789</span>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Card({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-6">
      <span className="font-dot text-sm text-signal">{n}</span>
      <h2 className="mt-6 text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
