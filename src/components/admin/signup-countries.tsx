import { CountryChoropleth } from "@/components/admin/country-choropleth";
import { SIGNUP_COUNTRY_UNKNOWN, signupShare, type SignupCountrySummary } from "@/lib/signup-country";
import { geoFill } from "@/lib/geo";

export function SignupCountries({ summary }: { summary: SignupCountrySummary | null }) {
  return (
    <section id="signups" className="qd-pad rounded-3xl border border-line bg-surface" aria-labelledby="signup-country-heading">
      <h2 id="signup-country-heading" className="font-display text-xl font-semibold text-ink">
        Sign-ups by country
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
        New accounts in the same date range as the country map. Each total is a country code and a count for that UTC day.
      </p>
      {summary ? <SignupBody summary={summary} /> : <p className="mt-4 text-sm text-ink-soft">Sign-up country counts are unavailable right now.</p>}
    </section>
  );
}

function SignupBody({ summary }: { summary: SignupCountrySummary }) {
  const known = summary.countries.filter((row) => row.country !== SIGNUP_COUNTRY_UNKNOWN && row.count > 0);
  const summaryText =
    summary.total === 0
      ? `No sign-ups in ${summary.rangeLabel}.`
      : `${summary.total.toLocaleString("en-US")} sign-ups in ${summary.rangeLabel}, across ${known.length === 1 ? "1 country" : `${known.length} countries`}. The table lists every country, including Unknown.`;

  return (
    <div className="mt-5 flex flex-col gap-5">
      <p className="text-sm leading-6 text-ink-soft">{summary.countingNote}</p>
      <div className="rounded-2xl border border-line/70 px-3 py-3 sm:px-4">
        <p className="text-sm font-medium leading-5 text-ink-soft">Sign-ups</p>
        <p className="mt-1 font-display text-3xl font-semibold tabular-nums leading-none text-ink sm:text-4xl">
          {summary.total.toLocaleString("en-US")}
        </p>
        <p className="mt-2 text-xs leading-5 text-ink-soft">In {summary.rangeLabel}</p>
      </div>
      <SignupTable summary={summary} />
      <CountryChoropleth
        rows={summary.countries.map((row) => ({ country: row.country, name: row.name, value: row.count }))}
        max={summary.max}
        summaryId="signup-map-summary"
        summaryText={summaryText}
        valueNoun="sign-ups"
      />
    </div>
  );
}

function SignupTable({ summary }: { summary: SignupCountrySummary }) {
  if (summary.total === 0) {
    return <p className="text-sm text-ink-soft">No sign-ups in this range.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Sign-ups by country for {summary.rangeLabel}. Unknown means the country header was missing. This table is the
          text version of the map.
        </caption>
        <thead>
          <tr className="text-ink-soft">
            <th scope="col" className="pb-2 pr-2 font-medium">
              <span className="sr-only">Rank</span>
              <span aria-hidden="true">#</span>
            </th>
            <th scope="col" className="pb-2 pr-3 font-medium">
              Country
            </th>
            <th scope="col" className="pb-2 text-right font-medium">
              Sign-ups
            </th>
            <th scope="col" className="pb-2 pl-3 text-right font-medium">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.countries.map((row, index) => (
            <tr key={row.country} className="border-t border-line/70">
              <td className="py-2.5 pr-2 tabular-nums text-ink-soft">{index + 1}</td>
              <th scope="row" className="py-2.5 pr-3 font-medium text-ink">
                <span className="flex items-start gap-2">
                  {row.flag ? (
                    <span className="mt-0.5" aria-hidden="true">
                      {row.flag}
                    </span>
                  ) : null}
                  <span className="min-w-0">
                    {row.name}
                    {row.count > 0 ? (
                      <span className="mt-1.5 block h-1.5 max-w-40 overflow-hidden rounded-full bg-line/50" aria-hidden="true">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${row.share * 100}%`, background: geoFill(row.count, summary.max) }}
                        />
                      </span>
                    ) : null}
                  </span>
                </span>
              </th>
              <td className="py-2.5 text-right tabular-nums whitespace-nowrap text-ink">{row.count.toLocaleString("en-US")}</td>
              <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap text-ink">{signupShare(row.share)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line">
            <td className="py-2.5 pr-2" />
            <th scope="row" className="py-2.5 pr-3 font-semibold text-ink">
              Total
            </th>
            <td className="py-2.5 text-right font-semibold tabular-nums whitespace-nowrap text-ink">
              {summary.total.toLocaleString("en-US")}
            </td>
            <td className="py-2.5 pl-3 text-right font-semibold tabular-nums whitespace-nowrap text-ink">{signupShare(1)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
