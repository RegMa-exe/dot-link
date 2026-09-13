import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { createLink, deleteLink, listLinks } from "@/lib/links.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your links — Dotlink" },
      { name: "description", content: "Every short link you own, with clicks, visitors and sources." },
      { property: "og:title", content: "Your links — Dotlink" },
      { property: "og:description", content: "Every short link you own, with clicks, visitors and sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const list = useServerFn(listLinks);
  const create = useServerFn(createLink);
  const remove = useServerFn(deleteLink);

  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const claimed = useRef(false);

  const { data: links, isLoading } = useQuery({ queryKey: ["links"], queryFn: () => list({}) });

  const createMut = useMutation({
    mutationFn: (vars: { url: string; alias?: string | undefined }) => create({ data: vars }),
    onSuccess: (row) => {
      setUrl("");
      setAlias("");
      qc.invalidateQueries({ queryKey: ["links"] });
      copy(`${window.location.origin}/${row.short_code}`);
      toast.success("Short link created and copied");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create link"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["links"] });
      toast.success("Link deleted");
    },
  });

  useEffect(() => {
    if (claimed.current) return;
    claimed.current = true;
    const pending = sessionStorage.getItem("pending_url");
    if (pending) {
      sessionStorage.removeItem("pending_url");
      createMut.mutate({ url: pending });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12">
        <p className="label-xs">Control centre</p>
        <h1 className="mt-2 font-dot text-4xl tracking-tight">Your links</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate({ url, alias: alias || undefined });
          }}
          className="mt-8 rounded-3xl border border-border bg-card p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              maxLength={2048}
              placeholder="Paste a long URL"
              className="flex-1 rounded-full border border-border bg-background px-5 py-3 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-signal"
            />
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={40}
              placeholder="custom-alias"
              className="rounded-full border border-border bg-background px-5 py-3 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-signal sm:w-48"
            />
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-full bg-signal px-6 py-3 text-sm font-medium disabled:opacity-50"
            >
              {createMut.isPending ? "…" : "Shorten"}
            </button>
          </div>
        </form>

        <div className="mt-10 space-y-3">
          {isLoading && <p className="label-xs">Loading…</p>}
          {!isLoading && links?.length === 0 && (
            <div className="dot-grid rounded-3xl border border-border p-12 text-center">
              <p className="font-dot text-2xl">No links yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Paste a URL above to make your first one.</p>
            </div>
          )}
          {links?.map((l) => (
            <div
              key={l.id}
              className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base text-signal">/{l.short_code}</span>
                  <button
                    onClick={() => {
                      copy(`${window.location.origin}/${l.short_code}`);
                      toast.success("Copied");
                    }}
                    className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                  >
                    Copy
                  </button>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{l.long_url}</p>
              </div>

              <div className="flex items-center gap-6">
                <Stat label="Clicks" value={l.clicks} />
                <Stat label="Visitors" value={l.visitors} />
                <Link
                  to="/link/$id"
                  params={{ id: l.id }}
                  className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-signal hover:text-signal"
                >
                  Analytics
                </Link>
                <button
                  onClick={() => deleteMut.mutate(l.id)}
                  className="text-sm text-muted-foreground transition-colors hover:text-signal"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <p className="font-dot text-2xl leading-none">{value}</p>
      <p className="label-xs mt-1">{label}</p>
    </div>
  );
}

function copy(text: string) {
  void navigator.clipboard?.writeText(text);
}
