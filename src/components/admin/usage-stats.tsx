import Link from "next/link";
import { MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { USAGE_RETENTION_MONTHS, type SignInMethod, type UsageCounts, type UsageDay, type UsageStats } from "@/lib/usage";

const METHODS: { id: SignInMethod; label: string }[] = [
  { id: "email_code", label: "Email code" },
  { id: "passkey", label: "Passkey" },
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
];

export function UsageStatsView({ stats }: { stats: UsageStats | null }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <MihrabMark className="h-7 w-7" />
            <BrandWordmark className="text-2xl leading-none" />
          </Link>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="kufic-label text-gold-deep">Private</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">Usage</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
          Cookieless counts. No emails, names, or reading. Event rows older than {USAGE_RETENTION_MONTHS} months are
          deleted.
        </p>
        {stats ? <StatsBody stats={stats} /> : <p className="mt-8 text-base text-ink-soft">Usage counts are unavailable right now.</p>}
      </main>
    </div>
  );
}

function StatsBody({ stats }: { stats: UsageStats }) {
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Guest sessions" counts={stats.guests} />
        <MetricCard label="Sign-ups" counts={stats.signUps} />
        <MetricCard label="Merges" counts={stats.merges} />
        <MetricCard label="Deletions" counts={stats.deletions} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-3xl border border-line bg-surface px-5 py-5 sm:px-6">
          <h2 className="font-display text-xl font-semibold text-ink">Sign-ins</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Sign-ins by method, with all-time, 30-day, and 7-day totals</caption>
              <thead>
                <tr className="text-ink-soft">
                  <th scope="col" className="pb-2 font-medium">Method</th>
                  <th scope="col" className="pb-2 text-right font-medium">All</th>
                  <th scope="col" className="pb-2 text-right font-medium">30 days</th>
                  <th scope="col" className="pb-2 text-right font-medium">7 days</th>
                </tr>
              </thead>
              <tbody>
                {METHODS.map((method) => (
                  <tr key={method.id} className="border-t border-line/70">
                    <th scope="row" className="py-2.5 font-medium text-ink">{method.label}</th>
                    <CountCell value={stats.signIns[method.id].all} />
                    <CountCell value={stats.signIns[method.id].d30} />
                    <CountCell value={stats.signIns[method.id].d7} />
                  </tr>
                ))}
                <tr className="border-t border-line">
                  <th scope="row" className="py-2.5 font-semibold text-ink">All methods</th>
                  <CountCell value={stats.signInTotal.all} strong />
                  <CountCell value={stats.signInTotal.d30} strong />
                  <CountCell value={stats.signInTotal.d7} strong />
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface px-5 py-5 sm:px-6">
          <h2 className="font-display text-xl font-semibold text-ink">Guest to account</h2>
          <p className="mt-4 font-display text-4xl font-semibold tabular-nums text-ink">{formatRate(stats.conversion.all.rate)}</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Merges divided by guest sessions. {formatCount(stats.conversion.all.merges)} merges from{" "}
            {formatCount(stats.conversion.all.guests)} guest sessions.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line/70 pt-4">
            <div>
              <dt className="text-sm text-ink-soft">30 days</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{formatRate(stats.conversion.d30.rate)}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-soft">7 days</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{formatRate(stats.conversion.d7.rate)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <DailyChart days={stats.daily} />
    </>
  );
}

function MetricCard({ label, counts }: { label: string; counts: UsageCounts }) {
  return (
    <section className="rounded-3xl border border-line bg-surface px-5 py-5">
      <h2 className="text-sm font-medium text-ink-soft">{label}</h2>
      <p className="mt-3 font-display text-4xl font-semibold tabular-nums leading-none text-ink">{formatCount(counts.all)}</p>
      <p className="mt-3 text-sm text-ink-soft">
        <span className="tabular-nums text-ink">{formatCount(counts.d30)}</span> in 30 days
        <span className="px-1.5 text-muted" aria-hidden="true">·</span>
        <span className="tabular-nums text-ink">{formatCount(counts.d7)}</span> in 7 days
      </p>
    </section>
  );
}

function CountCell({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <td className={`py-2.5 text-right tabular-nums ${strong ? "font-semibold text-ink" : "text-ink"}`}>
      {formatCount(value)}
    </td>
  );
}

function DailyChart({ days }: { days: UsageDay[] }) {
  const max = Math.max(1, ...days.map((day) => day.total));
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <section className="mt-4 rounded-3xl border border-line bg-surface px-5 py-5 sm:px-6" aria-labelledby="usage-daily">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="usage-daily" className="font-display text-xl font-semibold text-ink">Daily events</h2>
        <p className="text-sm text-ink-soft">
          {first && last ? `${formatDay(first.day)} – ${formatDay(last.day)} UTC` : "Last 30 days"}
        </p>
      </div>
      <div className="mt-6 flex h-36 items-end gap-px sm:gap-0.5" aria-hidden="true">
        {days.map((day) => {
          const height = day.total === 0 ? 0 : Math.max(6, Math.round((day.total / max) * 100));
          return (
            <div key={day.day} className="flex h-full min-w-0 flex-1 items-end" title={dayTitle(day)}>
              {day.total === 0 ? (
                <span className="h-px w-full bg-line" />
              ) : (
                <span className="flex w-full flex-col justify-end overflow-hidden rounded-sm" style={{ height: `${height}%` }}>
                  <Bar count={day.deletions} className="bg-danger" />
                  <Bar count={day.merges} className="bg-gold-deep" />
                  <Bar count={day.signIns} className="bg-ink/35" />
                  <Bar count={day.signUps} className="bg-accent" />
                  <Bar count={day.guests} className="bg-gold" />
                </span>
              )}
            </div>
          );
        })}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-soft">
        <Legend className="bg-gold" label="Guests" />
        <Legend className="bg-accent" label="Sign-ups" />
        <Legend className="bg-ink/35" label="Sign-ins" />
        <Legend className="bg-gold-deep" label="Merges" />
        <Legend className="bg-danger" label="Deletions" />
      </ul>
      <table className="sr-only">
        <caption>Daily event counts for the last 30 UTC days</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Guests</th>
            <th>Sign-ups</th>
            <th>Sign-ins</th>
            <th>Merges</th>
            <th>Deletions</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day}>
              <th scope="row">{formatDay(day.day)}</th>
              <td>{day.guests}</td>
              <td>{day.signUps}</td>
              <td>{day.signIns}</td>
              <td>{day.merges}</td>
              <td>{day.deletions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Bar({ count, className }: { count: number; className: string }) {
  if (count <= 0) return null;
  return <span className={`block w-full ${className}`} style={{ flex: `${count} 1 0` }} />;
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-sm ${className}`} aria-hidden="true" />
      {label}
    </li>
  );
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function formatRate(rate: number | null) {
  if (rate === null) return "n/a";
  return `${(rate * 100).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function dayTitle(day: UsageDay) {
  return `${formatDay(day.day)}: ${day.total} events`;
}
