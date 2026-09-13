import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content: "Shorten any URL, pick a custom alias, and track every click.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      page.style.setProperty("--parallax-y", `${Math.min(window.scrollY, 720)}px`);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

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
    <div ref={pageRef} className="parallax-page min-h-screen overflow-clip">
      <SiteHeader />

      <main>
        <section className="parallax-hero relative isolate min-h-[76vh] overflow-hidden border-b border-border">
          <div aria-hidden="true" className="parallax-dots parallax-dots-slow absolute inset-[-12%] -z-30" />
          <div aria-hidden="true" className="parallax-dots parallax-dots-fast absolute inset-[-10%] -z-20 opacity-35" />
          <div aria-hidden="true" className="parallax-ring parallax-ring-left absolute -left-40 top-20 -z-10 size-96 rounded-full border border-border" />
          <div aria-hidden="true" className="parallax-ring parallax-ring-right absolute -right-44 bottom-0 -z-10 size-[30rem] rounded-full border border-border" />

          <div className="parallax-content mx-auto flex min-h-[76vh] max-w-5xl flex-col justify-center px-5 py-20">
            <p className="label-xs flex items-center gap-3">
              <span className="status-pulse size-2 rounded-full bg-signal" />
              Link shortener · analytics
            </p>
            <h1 className="mt-4 font-dot text-6xl leading-[0.95] sm:text-8xl">
              Make it
              <br />
              <span className="text-signal">short.</span>
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              One long URL in. One clean short link out. Every click counted — visitors, sources,
              devices, countries.
            </p>

            <form onSubmit={go} className="frosted-panel mt-10 flex max-w-2xl flex-col gap-3 rounded-[2rem] p-2 sm:flex-row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={2048}
                placeholder="https://your-very-long-url.com/campaign"
                className="min-w-0 flex-1 rounded-full border border-border bg-background/75 px-6 py-4 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-signal"
              />
              <div className="cta-aura relative isolate">
                <button
                  type="submit"
                  className="relative z-10 h-full w-full rounded-full bg-signal px-8 py-4 text-sm font-medium transition-transform hover:scale-[1.02] sm:w-auto"
                >
                  Shorten
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="parallax-cards mx-auto grid max-w-5xl gap-3 px-5 py-16 md:grid-cols-3">
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
    <article className="frosted-card rounded-3xl border border-border p-6">
      <span className="font-dot text-sm text-signal">{n}</span>
      <h2 className="mt-6 text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
