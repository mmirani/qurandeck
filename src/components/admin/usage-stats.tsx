import Link from "next/link";
import { GeoDashboard } from "@/components/admin/geo-dashboard";
import { MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { APPEARANCE_THEMES } from "@/lib/appearance";
import { COMPANION_NAME } from "@/lib/brand";
import {
  AUTH_REASON_LABELS,
  DEVICE_LABELS,
  DEVICES,
  FEATURE_LABELS,
  FEATURES,
  METHOD_LABELS,
  commandLabel,
  settingLabel,
} from "@/lib/usage-catalog";
import {
  USAGE_RETENTION_MONTHS,
  type AuthFailureStat,
  type AuthHealthRow,
  type DeviceStat,
  type FeatureStat,
  type SignInMethod,
  type ThemeStat,
  type UsageCounts,
  type UsageDay,
  type UsageStats,
} from "@/lib/usage";
import type { GeoSummary } from "@/lib/geo";

const METHODS: { id: SignInMethod; label: string }[] = [
  { id: "email_code", label: "Email code" },
  { id: "passkey", label: "Passkey" },
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
];

export function UsageStatsView({
  stats,
  notice,
  geo,
}: {
  stats: UsageStats | null;
  notice?: string;
  geo?: GeoSummary | null;
}) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-line/70">
        <div className="qd-gutter mx-auto flex h-16 max-w-5xl items-center">
          <Link href="/" className="flex items-center gap-2">
            <MihrabMark className="h-7 w-7" />
            <BrandWordmark className="text-2xl leading-none" />
          </Link>
        </div>
      </header>
      <main id="main-content" className="qd-gutter qd-section mx-auto flex max-w-5xl flex-col gap-8">
        <div className="qd-stack">
        <p className="kufic-label text-gold-deep">Private</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">Usage</h1>
        <p className="max-w-2xl text-sm leading-6 text-ink-soft">
          Cookieless counts. No emails, names, notes, search text, or which ayah was opened. Event rows older than{" "}
          {USAGE_RETENTION_MONTHS} months are deleted.
        </p>
        </div>
        {notice ? (
          <p className="qd-pad-sm rounded-2xl border border-gold/40 bg-highlight text-sm leading-6 text-ink">{notice}</p>
        ) : null}
        {stats ? (
          <StatsBody stats={stats} geo={geo ?? null} />
        ) : (
          <>
            <p className="text-base text-ink-soft">Usage counts are unavailable right now.</p>
            <GeoDashboard summary={geo ?? null} />
          </>
        )}
      </main>
    </div>
  );
}

function StatsBody({ stats, geo }: { stats: UsageStats; geo: GeoSummary | null }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Guest sessions" counts={stats.guests} />
        <MetricCard label="Sign-ups" counts={stats.signUps} />
        <MetricCard label="Merges" counts={stats.merges} />
        <MetricCard label="Deletions" counts={stats.deletions} />
      </div>

      <Activity stats={stats} />
      <GeoDashboard summary={geo ?? null} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="qd-pad rounded-3xl border border-line bg-surface">
          <h2 className="font-display text-xl font-semibold text-ink">Sign-ins</h2>
          <CountTable
            caption="Sign-ins by method, with all-time, 30-day, and 7-day totals"
            head={["Method", "All", "30 days", "7 days"]}
            rows={[
              ...METHODS.map((method) => ({
                key: method.id,
                label: method.label,
                cells: [stats.signIns[method.id].all, stats.signIns[method.id].d30, stats.signIns[method.id].d7],
              })),
              {
                key: "all",
                label: "All methods",
                cells: [stats.signInTotal.all, stats.signInTotal.d30, stats.signInTotal.d7],
                strong: true,
              },
            ]}
          />
        </section>

        <section className="qd-pad rounded-3xl border border-line bg-surface">
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

      <AuthHealth rows={stats.authHealth} failures={stats.authFailures} />
      <Features features={stats.features} />
      <Sana stats={stats} />
      <Themes themes={stats.themes} />
      <Settings settings={stats.settings} />
      <Devices devices={stats.devices} />
      <DailyChart days={stats.daily} />
      <ActiveChart days={stats.dailyActive} />
    </>
  );
}

function Activity({ stats }: { stats: UsageStats }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <section className="qd-pad rounded-3xl border border-line bg-surface">
        <h2 className="font-display text-xl font-semibold text-ink">Active readers</h2>
        <p className="mt-1 text-sm text-ink-soft">Distinct hashed readers with any event in the window.</p>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ActivityFigure label="24 hours" value={stats.activity.day} />
          <ActivityFigure label="7 days" value={stats.activity.d7} />
          <ActivityFigure label="30 days" value={stats.activity.d30} />
          <ActivityFigure label="All time" value={stats.activity.all} />
        </dl>
      </section>
      <section className="qd-pad rounded-3xl border border-line bg-surface">
        <h2 className="font-display text-xl font-semibold text-ink">Week-1 return</h2>
        <p className="mt-4 font-display text-4xl font-semibold tabular-nums text-ink">{formatRate(stats.retention.rate)}</p>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Readers first seen at least 7 days ago who came back on day 7 or later. {formatCount(stats.retention.returned)}{" "}
          of {formatCount(stats.retention.eligible)}.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Recent cohorts, first seen 7–30 days ago:{" "}
          <span className="font-medium tabular-nums text-ink">{formatRate(stats.retention.recentRate)}</span>
          <span className="px-1.5 text-muted" aria-hidden="true">·</span>
          {formatCount(stats.retention.recentReturned)} of {formatCount(stats.retention.recentEligible)}
        </p>
      </section>
    </div>
  );
}

function ActivityFigure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{formatCount(value)}</dd>
    </div>
  );
}

function AuthHealth({ rows, failures }: { rows: AuthHealthRow[]; failures: AuthFailureStat[] }) {
  return (
    <section className="qd-pad rounded-3xl border border-line bg-surface">
      <h2 className="font-display text-xl font-semibold text-ink">Sign-in health</h2>
        <p className="mt-1 text-sm text-ink-soft">
        Email codes requested versus used. Passkey, Google, and Apple started versus a finished session. Each line is
        all-time, then 30 days, then 7 days. Failures are coarse reasons only.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.method} className="qd-pad-sm rounded-2xl border border-line/70">
            <p className="font-medium text-ink">{METHOD_LABELS[row.method]}</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <HealthLine label="Started" counts={row.requested} />
              {row.method === "email_code" ? <HealthLine label="Code used" counts={row.codeUsed} /> : null}
              <HealthLine label="Signed in" counts={row.completed} />
              <HealthLine label="Failed" counts={row.failed} />
            </dl>
          </li>
        ))}
      </ul>
      {failures.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-ink">Failure reasons</h3>
          <CountTable
            caption="Sign-in failures by coarse reason"
            head={["Reason", "All", "30 days", "7 days"]}
            rows={failures.map((row) => ({
              key: `${row.method ?? "unknown"}:${row.reason}`,
              label: AUTH_REASON_LABELS[row.reason as keyof typeof AUTH_REASON_LABELS] ?? row.reason,
              detail: row.method ? METHOD_LABELS[row.method] : "Unknown provider",
              cells: [row.counts.all, row.counts.d30, row.counts.d7],
            }))}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">No failed sign-ins in this log.</p>
      )}
    </section>
  );
}

function Features({ features }: { features: FeatureStat[] }) {
  const byId = new Map(features.map((feature) => [feature.id, feature]));
  return (
    <section className="qd-pad rounded-3xl border border-line bg-surface">
      <h2 className="font-display text-xl font-semibold text-ink">Features</h2>
      <p className="mt-1 text-sm text-ink-soft">Counts, and distinct readers. No ayah, note, or query is stored.</p>
      <CountTable
        caption="Feature use with event counts and unique readers"
        head={["Feature", "All", "30 days", "7 days", "Readers", "Readers 30d", "Readers 7d"]}
        rows={FEATURES.map((id) => {
          const feature = byId.get(id);
          const counts = feature?.counts ?? { all: 0, d30: 0, d7: 0 };
          const readers = feature?.readers ?? { all: 0, d30: 0, d7: 0 };
          return {
            key: id,
            label: FEATURE_LABELS[id],
            cells: [counts.all, counts.d30, counts.d7, readers.all, readers.d30, readers.d7],
          };
        })}
      />
    </section>
  );
}

function Sana({ stats }: { stats: UsageStats }) {
  return (
    <section className="qd-pad rounded-3xl border border-line bg-surface">
      <h2 className="font-display text-xl font-semibold text-ink">{COMPANION_NAME}</h2>
      <p className="mt-1 text-sm text-ink-soft">Command names only. Typed text is not stored. Unknown commands are a count.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MiniCount label="Opened" counts={stats.sana.opened} />
        <MiniCount label="Not understood" counts={stats.sana.unknown} />
        <MiniCount label="Tour started" counts={stats.sana.tourStarted} />
        <MiniCount label="Tour completed" counts={stats.sana.tourCompleted} />
        <MiniCount label="Refusal shown" counts={stats.sana.refusals} />
      </div>
      {stats.sana.commands.length > 0 ? (
        <CountTable
          caption="Recognized Sana commands by type"
          head={["Command", "All", "30 days", "7 days", "Readers", "Readers 30d", "Readers 7d"]}
          rows={stats.sana.commands.map((command) => ({
            key: command.command,
            label: commandLabel(command.command),
            cells: [
              command.counts.all,
              command.counts.d30,
              command.counts.d7,
              command.readers.all,
              command.readers.d30,
              command.readers.d7,
            ],
          }))}
        />
      ) : (
        <p className="mt-4 text-sm text-ink-soft">No recognized commands yet.</p>
      )}
    </section>
  );
}

function Themes({ themes }: { themes: ThemeStat[] }) {
  const byId = new Map(themes.map((theme) => [theme.theme, theme.readers]));
  const rows = APPEARANCE_THEMES.map((theme) => ({
    id: theme.id,
    name: theme.name,
    swatch: theme.swatches[0],
    readers: byId.get(theme.id) ?? { all: 0, d30: 0, d7: 0 },
  }));
  const max = Math.max(1, ...rows.map((row) => row.readers.all));
  return (
    <section className="qd-pad rounded-3xl border border-line bg-surface">
      <h2 className="font-display text-xl font-semibold text-ink">Themes in use</h2>
      <p className="mt-1 text-sm text-ink-soft">Each reader counts once, as the latest theme name recorded for them.</p>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.id}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{row.name}</span>
              <span className="shrink-0 tabular-nums text-ink-soft">
                {formatCount(row.readers.all)}
                <span className="px-1 text-muted" aria-hidden="true">·</span>
                {formatCount(row.readers.d30)} in 30 days
                <span className="px-1 text-muted" aria-hidden="true">·</span>
                {formatCount(row.readers.d7)} in 7 days
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/70" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${Math.round((row.readers.all / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Settings({ settings }: { settings: UsageStats["settings"] }) {
  return (
    <section className="qd-pad rounded-3xl border border-line bg-surface">
      <h2 className="font-display text-xl font-semibold text-ink">Display settings</h2>
      <p className="mt-1 text-sm text-ink-soft">Chosen values only. Theme names are in the chart above.</p>
      {settings.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No display changes yet.</p>
      ) : (
        <CountTable
          caption="Display setting changes"
          head={["Setting", "All", "30 days", "7 days"]}
          rows={settings.map((row) => ({
            key: row.setting,
            label: settingLabel(row.setting),
            cells: [row.counts.all, row.counts.d30, row.counts.d7],
          }))}
        />
      )}
    </section>
  );
}

function Devices({ devices }: { devices: DeviceStat[] }) {
  const byId = new Map(devices.map((device) => [device.device, device.readers]));
  const rows = DEVICES.map((device) => ({ device, readers: byId.get(device) ?? { all: 0, d30: 0, d7: 0 } }));
  const max = Math.max(1, ...rows.map((row) => row.readers.all));
  return (
    <section className="qd-pad rounded-3xl border border-line bg-surface">
      <h2 className="font-display text-xl font-semibold text-ink">Devices</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Phone, tablet, or desktop, and installed or browser. Latest bucket per reader. No user agent or screen size.
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => (
          <li key={row.device}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{DEVICE_LABELS[row.device]}</span>
              <span className="shrink-0 tabular-nums text-ink-soft">
                {formatCount(row.readers.all)} all
                <span className="px-1 text-muted" aria-hidden="true">·</span>
                {formatCount(row.readers.d30)} / {formatCount(row.readers.d7)}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/70" aria-hidden="true">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round((row.readers.all / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiniCount({ label, counts }: { label: string; counts: UsageCounts }) {
  return (
    <div className="qd-pad-sm rounded-2xl border border-line/70">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{formatCount(counts.all)}</p>
      <p className="mt-1 text-xs text-ink-soft">
        <span className="tabular-nums text-ink">{formatCount(counts.d30)}</span> in 30 days
        <span className="px-1 text-muted" aria-hidden="true">·</span>
        <span className="tabular-nums text-ink">{formatCount(counts.d7)}</span> in 7 days
      </p>
    </div>
  );
}

type CountRow = {
  key: string;
  label: string;
  detail?: string;
  cells: (number | null)[];
  strong?: boolean;
};

function CountTable({ caption, head, rows }: { caption: string; head: string[]; rows: CountRow[] }) {
  const valueHeads = head.slice(1);
  return (
    <>
      <ul className="mt-4 space-y-3 sm:hidden">
        {rows.map((row) => (
          <li key={row.key} className="qd-pad-sm rounded-2xl border border-line/70">
            <p className={`font-medium text-ink ${row.strong ? "font-semibold" : ""}`}>{row.label}</p>
            {row.detail ? <p className="text-sm text-ink-soft">{row.detail}</p> : null}
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {valueHeads.map((label, index) => (
                <div key={label}>
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="mt-0.5 tabular-nums text-ink">{formatCell(row.cells[index])}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-ink-soft">
              {head.map((label, index) => (
                <th key={label} scope="col" className={`pb-2 font-medium ${index === 0 ? "" : "text-right"}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-line/70">
                <th scope="row" className={`py-2.5 font-medium text-ink ${row.strong ? "font-semibold" : ""}`}>
                  {row.label}
                  {row.detail ? <span className="mt-0.5 block text-xs font-normal text-ink-soft">{row.detail}</span> : null}
                </th>
                {row.cells.map((value, index) => (
                  <td key={valueHeads[index]} className={`py-2.5 text-right tabular-nums text-ink ${row.strong ? "font-semibold" : ""}`}>
                    {formatCell(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HealthLine({ label, counts }: { label: string; counts: UsageCounts }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tabular-nums text-ink">
        {formatCount(counts.all)}
        <span className="text-ink-soft"> · {formatCount(counts.d30)} · {formatCount(counts.d7)}</span>
      </dd>
    </div>
  );
}

function MetricCard({ label, counts }: { label: string; counts: UsageCounts }) {
  return (
    <section className="qd-card rounded-3xl border border-line bg-surface">
      <h2 className="text-sm font-medium leading-5 text-ink-soft">{label}</h2>
      <p className="font-display text-4xl font-semibold tabular-nums leading-none text-ink">{formatCount(counts.all)}</p>
      <p className="text-sm leading-6 text-ink-soft">
        <span className="tabular-nums text-ink">{formatCount(counts.d30)}</span> in 30 days
        <span className="px-1.5 text-muted" aria-hidden="true">·</span>
        <span className="tabular-nums text-ink">{formatCount(counts.d7)}</span> in 7 days
      </p>
    </section>
  );
}

function DailyChart({ days }: { days: UsageDay[] }) {
  const max = Math.max(1, ...days.map((day) => day.total));
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <section className="qd-pad rounded-3xl border border-line bg-surface" aria-labelledby="usage-daily">
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

function ActiveChart({ days }: { days: { day: string; readers: number }[] }) {
  const max = Math.max(1, ...days.map((day) => day.readers));
  const first = days[0];
  const last = days[days.length - 1];
  return (
    <section className="qd-pad rounded-3xl border border-line bg-surface" aria-labelledby="usage-active">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="usage-active" className="font-display text-xl font-semibold text-ink">Daily active readers</h2>
        <p className="text-sm text-ink-soft">
          {first && last ? `${formatDay(first.day)} – ${formatDay(last.day)} UTC` : "Last 30 days"}
        </p>
      </div>
      <div className="mt-6 flex h-28 items-end gap-px sm:gap-0.5" aria-hidden="true">
        {days.map((day) => {
          const height = day.readers === 0 ? 0 : Math.max(6, Math.round((day.readers / max) * 100));
          return (
            <div key={day.day} className="flex h-full min-w-0 flex-1 items-end" title={`${formatDay(day.day)}: ${day.readers} readers`}>
              {day.readers === 0 ? (
                <span className="h-px w-full bg-line" />
              ) : (
                <span className="w-full rounded-sm bg-gold" style={{ height: `${height}%` }} />
              )}
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Distinct readers per UTC day</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Readers</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day}>
              <th scope="row">{formatDay(day.day)}</th>
              <td>{day.readers}</td>
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

function formatCell(value: number | null | undefined) {
  if (value == null) return "—";
  return formatCount(value);
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
