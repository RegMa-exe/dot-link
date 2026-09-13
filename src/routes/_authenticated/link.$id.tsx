import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SiteHeader } from "@/components/site-header";
import { getLinkAnalytics } from "@/lib/links.functions";

export const Route = createFileRoute("/_authenticated/link/$id")({
  head: () => ({
    meta: [
      { title: "Link analytics — Dotlink" },
      { name: "description", content: "Clicks, unique visitors, referrers, devices and countries for a short link." },
      { property: "og:title", content: "Link analytics — Dotlink" },
      { property: "og:description", content: "Clicks, unique visitors, referrers, devices and countries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LinkAnalytics,
});

function LinkAnalytics() {
  const { id } = Route.useParams();
  const fetchAnalytics = useServerFn(getLinkAnalytics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", id],
    queryFn: () => fetchAnalytics({ data: { id } }),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-12">
        <Link to="/dashboard" className="label-xs transition-colors hover:text-foreground">
          ← All links
        </Link>

        {isLoading && <p className="mt-6 label-xs">Loading…</p>}
        {error && <p className="mt-6 text-sm text-signal">Could not load this link.</p>}

        {data && (
          <>
            <h1 className="mt-3 font-dot text-4xl tracking-tight text-signal">/{data.link.short_code}</h1>
            <p className="mt-2 truncate text-sm text-muted-foreground">{data.link.long_url}</p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Total clicks" value={data.totals.clicks} />
              <Metric label="Unique visitors" value={data.totals.visitors} />
              <Metric label="Countries" value={data.countries.length} />
              <Metric label="Referrers" value={data.referrers.length} />
            </div>

            <section className="mt-8 rounded-3xl border border-border bg-card p-5">
              <p className="label-xs">Clicks · last 14 days</p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.overTime}>
                    <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: string) => d.slice(5)}
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke="var(--signal)"
                      strokeWidth={2}
                      dot={{ r: 2, fill: "var(--signal)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <Breakdown title="Referrers" rows={data.referrers} total={data.totals.clicks} />
              <Breakdown title="Devices" rows={data.devices} total={data.totals.clicks} />
              <Breakdown title="Countries" rows={data.countries} total={data.totals.clicks} />
            </div>

            <section className="mt-6 rounded-3xl border border-border bg-card p-5">
              <p className="label-xs">Recent clicks</p>
              <div className="mt-4 space-y-2">
                {data.recent.length === 0 && (
                  <p className="text-sm text-muted-foreground">No clicks recorded yet.</p>
                )}
                {data.recent.map((r, i) => (
                  <div key={i} className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-2 text-sm">
                    <span className="font-mono text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    <span>{r.device ?? "Unknown"}</span>
                    <span>{r.country ?? "Unknown"}</span>
                    <span className="text-muted-foreground">{r.referrer ?? "Direct"}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <p className="font-dot text-4xl leading-none">{value}</p>
      <p className="label-xs mt-2">{label}</p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; value: number }[];
  total: number;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <p className="label-xs">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-sm">
              <span className="truncate">{r.label}</span>
              <span className="font-mono text-muted-foreground">{r.value}</span>
            </div>
            <div className="mt-1 h-1 rounded-full bg-secondary">
              <div
                className="h-1 rounded-full bg-signal"
                style={{ width: `${total ? Math.round((r.value / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
