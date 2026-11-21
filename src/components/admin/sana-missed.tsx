import Link from "next/link";
import { MihrabMark } from "@/components/art/ornaments";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { COMPANION_NAME } from "@/lib/brand";
import { MISSED_MIN_COUNT, MISSED_RETENTION_DAYS, MISSED_WINDOW_DAYS, type MissedTop } from "@/lib/sana-missed";

/** Admin-only list of anonymous missed-command shapes. Same look as /admin/stats. */
export function SanaMissedView({ rows }: { rows: MissedTop[] | null }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-line/70">
        <div className="qd-gutter mx-auto flex min-h-16 max-w-5xl flex-wrap items-center gap-3 py-2">
          <Link href="/" className="flex min-h-11 items-center gap-2">
            <MihrabMark className="h-7 w-7" />
            <BrandWordmark className="text-2xl leading-none" />
          </Link>
          <Link href="/admin/stats" className="ml-auto flex min-h-11 items-center text-sm text-ink-soft underline-offset-4 hover:underline">
            Usage
          </Link>
        </div>
      </header>
      <main id="main-content" className="qd-gutter qd-section mx-auto flex max-w-5xl flex-col gap-8">
        <div className="qd-stack">
          <p className="kufic-label text-gold-deep">Private</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">{COMPANION_NAME} missed commands</h1>
          <p className="max-w-2xl text-sm leading-6 text-ink-soft">
            Anonymous shapes only, over the last {MISSED_WINDOW_DAYS} days. Numbers are [n], surah names [surah], theme
            names [theme], and any other word [w]. A shape shows once it reaches {MISSED_MIN_COUNT}. Rows are deleted after{" "}
            {MISSED_RETENTION_DAYS} days.
          </p>
        </div>
        <section className="qd-pad rounded-3xl border border-line bg-surface">
          {rows == null ? (
            <p className="text-base text-ink-soft">The missed-command table is not set up yet.</p>
          ) : rows.length === 0 ? (
            <p className="text-base text-ink-soft">Nothing has reached {MISSED_MIN_COUNT} yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">Shape</th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">Count</th>
                  <th scope="col" className="py-2 text-right font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.shape} className="border-t border-line/70">
                    <td className="py-2 pr-4 font-mono text-ink">{row.shape}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.count}</td>
                    <td className="py-2 text-right tabular-nums">{row.days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}
