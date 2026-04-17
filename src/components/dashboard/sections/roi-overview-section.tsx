"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { DollarSign, TrendingUp, Target, Percent, MessageSquare, Phone as PhoneIcon, AlertCircle, Calculator, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_COLORS } from "@/lib/chart-colors";
import { CHANNEL_SPEND, SAMPLE_DAY_TOTAL_SPEND, MONTHLY_ESTIMATED_SPEND, spendByChannelType, calcSmsSpend, calcOutboundCallSpend, calcRvmSpend, VENDOR_RATES } from "@/lib/spend-config";
import { COMMISSION_TIERS, estimateDominantTier } from "@/lib/commission-structure";
import { normalizeLeadSource, detectDuplicates } from "@/lib/lead-source-normalizer";
import type { DashboardData } from "@/types";

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtCurrencyFull(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  borderRadius: "0.5rem",
  color: "var(--popover-foreground)",
  fontSize: "0.75rem",
};

interface Props {
  data: DashboardData;
  isLoading: boolean;
}

// Period selector — "live" uses webhook volume × vendor rates (most accurate);
// "sample_day" + "estimated_month" are static snapshot extrapolations.
type RoiPeriod = "live" | "sample_day" | "estimated_month";

export function RoiOverviewSection({ data, isLoading }: Props) {
  const [period, setPeriod] = useState<RoiPeriod>("live");

  if (isLoading) {
    return (
      <section id="roi-overview" className="space-y-4">
        <div className="border-b border-[var(--border)] pb-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Performance Overview</h2>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </section>
    );
  }

  const { forthDeals, smsRawlogs, ringCentral } = data;
  const { summary } = forthDeals;

  const totalRevenue = summary.total_revenue; // Empower1 revenue from closed deals
  const totalDeals = summary.total_deals;
  const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

  // Live-calculated spend using webhook volume × vendor rates.
  // SMS: total messages sent × $0.003/msg
  // Calls: total Ring Central minutes × $0.009712/min
  // RVM: drop count not in webhook — fallback to sample-day estimate
  const liveSmsSpend = calcSmsSpend(smsRawlogs.total_sent);
  const liveCallSpend = calcOutboundCallSpend(ringCentral.summary.total_duration_mins);
  const liveRvmSpend = CHANNEL_SPEND.find((c) => c.vendor === "Drop Cowboy")?.dailySpend ?? 0;
  const liveTotalSpend = liveSmsSpend + liveCallSpend + liveRvmSpend;

  const spendForPeriod = {
    live:            liveTotalSpend,
    sample_day:      SAMPLE_DAY_TOTAL_SPEND,
    estimated_month: MONTHLY_ESTIMATED_SPEND,
  }[period];

  const periodLabel = {
    live:            "Live (calculated)",
    sample_day:      "Sample Day",
    estimated_month: "Est. Monthly",
  }[period];

  // ROI = (revenue - spend) / spend × 100
  // Only meaningful when comparing apples-to-apples. Since revenue is lifetime
  // and spend estimates are periodic, we show a per-period CAC instead for clarity.
  const dealsForPeriod = totalDeals; // TODO: scope deals to period once n8n sends dated data
  const cacForPeriod = dealsForPeriod > 0 ? spendForPeriod / dealsForPeriod : null;
  const revenueToSpendRatio = spendForPeriod > 0 ? totalRevenue / spendForPeriod : null;

  return (
    <section id="roi-overview" className="space-y-6">
      <div className="border-b border-[var(--border)] pb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Performance Overview</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Empower1 revenue, marketing spend, and ROI by channel + lead source
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Spend period
          </span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as RoiPeriod)}
            className="text-xs rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
          >
            <option value="live">Live (volume × rates)</option>
            <option value="sample_day">Sample Day</option>
            <option value="estimated_month">Est. Monthly</option>
          </select>
        </div>
      </div>

      {/* ── Row 1: Top-level KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Empower1 Revenue"
          value={fmtCurrency(totalRevenue)}
          subtitle="All closed deals (lifetime)"
          color="green"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KpiCard
          label="Deals Closed"
          value={totalDeals.toLocaleString()}
          subtitle="Across all sources"
          color="violet"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg Deal Revenue"
          value={fmtCurrency(avgDealSize)}
          subtitle={(() => {
            const tier = estimateDominantTier(totalRevenue, totalDeals);
            return tier ? `~$${tier.payment}/mo tier dominant` : "Revenue per deal";
          })()}
          color="sky"
          icon={<Target className="h-4 w-4" />}
        />
        <KpiCard
          label={`Marketing Spend (${periodLabel})`}
          value={fmtCurrency(spendForPeriod)}
          subtitle={
            cacForPeriod != null
              ? `${fmtCurrency(cacForPeriod)}/deal CAC · ${revenueToSpendRatio?.toFixed(1)}:1 revenue`
              : "Commio + Drop Cowboy combined"
          }
          color="amber"
          icon={<Percent className="h-4 w-4" />}
        />
      </div>

      {/* ── Data source caveat ── */}
      <div className="flex items-start gap-2.5 rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2.5 text-xs text-[var(--muted-foreground)]">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        {period === "live" ? (
          <span>
            <span className="font-semibold text-[var(--foreground)]">Live spend</span> = webhook volume × vendor rates:{" "}
            SMS @ ${VENDOR_RATES.commio.smsPerMessage.toFixed(4)}/msg,{" "}
            Calls @ ${VENDOR_RATES.commio.outboundCallPerMin.toFixed(4)}/min,{" "}
            RVM @ ${VENDOR_RATES.dropCowboy.rvmPerDrop.toFixed(4)}/drop.{" "}
            RVM drop count is estimated until Drop Cowboy totals flow through the webhook.
          </span>
        ) : (
          <span>
            <span className="font-semibold text-[var(--foreground)]">Revenue</span> is lifetime from Forth.{" "}
            <span className="font-semibold text-[var(--foreground)]">Spend</span> is extrapolated from a 2026-04-16 sample day
            (Commio $1,331 + Drop Cowboy $281). Switch to <span className="font-semibold text-[var(--foreground)]">Live</span> for
            webhook-based calculation.
          </span>
        )}
      </div>

      {/* ── Row 2: Channel ROI (SMS vs RVM vs Calls) ── */}
      <ChannelSpendSection
        period={period}
        periodLabel={periodLabel}
        liveSmsSpend={liveSmsSpend}
        liveCallSpend={liveCallSpend}
        liveRvmSpend={liveRvmSpend}
        smsVolume={smsRawlogs.total_sent}
        callMinutes={ringCentral.summary.total_duration_mins}
      />

      {/* ── Row 3: ROI by Lead Source ── */}
      <LeadSourceRoiSection data={data} />

      {/* ── Row 4: Empower1 Revenue Tiers reference ── */}
      <RevenueTiersCard totalRevenue={totalRevenue} totalDeals={totalDeals} />

      {/* ── Row 5: Secondary metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Client Debt Under Mgmt" value={fmtCurrency(summary.total_debt)} />
        <MiniStat label="Current Client Payments" value={fmtCurrency(summary.total_current_payments)} />
        <MiniStat label="SMS Sent (from webhook)" value={data.smsRawlogs.total_sent.toLocaleString()} />
        <MiniStat label="SMS Delivery Rate" value={`${data.smsRawlogs.overall_delivery_rate.toFixed(1)}%`} />
      </div>
    </section>
  );
}

// ─── Channel Spend (SMS vs RVM vs Calls) ────────────────────────────────────

function ChannelSpendSection({
  period,
  periodLabel,
  liveSmsSpend,
  liveCallSpend,
  liveRvmSpend,
  smsVolume,
  callMinutes,
}: {
  period: RoiPeriod;
  periodLabel: string;
  liveSmsSpend: number;
  liveCallSpend: number;
  liveRvmSpend: number;
  smsVolume: number;
  callMinutes: number;
}) {
  const breakdown = spendByChannelType();
  const multiplier = period === "sample_day" ? 1 : period === "estimated_month" ? 30 : 0;

  const rows = period === "live"
    ? [
        { name: "SMS (Commio Messaging)", icon: <MessageSquare className="h-4 w-4" />, spend: liveSmsSpend,  color: "#4cc9f0", detail: `${smsVolume.toLocaleString()} msgs × $${VENDOR_RATES.commio.smsPerMessage.toFixed(4)}` },
        { name: "RVM (Drop Cowboy)",      icon: <PhoneIcon className="h-4 w-4" />,     spend: liveRvmSpend,  color: "#51cf66", detail: "Sample-day estimate (drop count not in webhook yet)" },
        { name: "Voice Calls (Commio)",   icon: <PhoneIcon className="h-4 w-4" />,     spend: liveCallSpend, color: "#cc5de8", detail: `${callMinutes.toLocaleString(undefined, { maximumFractionDigits: 0 })} min × $${VENDOR_RATES.commio.outboundCallPerMin.toFixed(4)}` },
      ]
    : [
        { name: "SMS (Commio Messaging)", icon: <MessageSquare className="h-4 w-4" />, spend: breakdown.sms * multiplier,   color: "#4cc9f0", detail: period === "sample_day" ? "2026-04-16 snapshot" : "Sample day × 30" },
        { name: "RVM (Drop Cowboy)",      icon: <PhoneIcon className="h-4 w-4" />,     spend: breakdown.rvm * multiplier,   color: "#51cf66", detail: period === "sample_day" ? "2026-04-16 snapshot" : "Sample day × 30" },
        { name: "Voice Calls (Commio)",   icon: <PhoneIcon className="h-4 w-4" />,     spend: breakdown.calls * multiplier, color: "#cc5de8", detail: period === "sample_day" ? "2026-04-16 snapshot" : "Sample day × 30" },
      ];

  const total = rows.reduce((s, r) => s + r.spend, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Marketing Spend by Channel &mdash; {periodLabel}</CardTitle>
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Where Empower1 is spending across outreach channels
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="text-left px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Channel</th>
                <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Spend</th>
                <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pct = total > 0 ? (r.spend / total) * 100 : 0;
                return (
                  <tr key={r.name} className={i < rows.length - 1 ? "border-b border-[var(--border)]" : ""}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                        <div>
                          <span className="font-medium text-[var(--foreground)]">{r.name}</span>
                          <p className="text-[10px] text-[var(--muted-foreground)]">{r.detail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[var(--foreground)]">
                      {fmtCurrencyFull(r.spend)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-[var(--border)] bg-[var(--muted)]">
                <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Total</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[var(--foreground)]">
                  {fmtCurrencyFull(total)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[var(--foreground)]">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Vendor-level detail */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHANNEL_SPEND.map((c) => {
            // In live mode, map each vendor to its live-calculated spend.
            // In sample/monthly modes, use dailySpend × multiplier.
            let adjusted: number;
            if (period === "live") {
              if (c.name === "Commio Outbound Calls") adjusted = liveCallSpend;
              else if (c.name === "Commio Messaging (SMS)") adjusted = liveSmsSpend;
              else if (c.name === "Drop Cowboy RVM") adjusted = liveRvmSpend;
              else adjusted = c.dailySpend; // inbound — fall back to sample until we have live volume
            } else {
              adjusted = c.dailySpend * multiplier;
            }
            const isEstimated = period === "live" && (c.name === "Drop Cowboy RVM" || c.name === "Commio Inbound Calls");
            return (
              <div key={c.name} className="rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--foreground)]">
                    {c.name}
                    {isEstimated && <span className="ml-1.5 text-[9px] font-medium text-amber-600 uppercase">est.</span>}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-[var(--foreground)]">{fmtCurrencyFull(adjusted)}</span>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{c.description}</p>
                {c.metrics && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {Object.entries(c.metrics).map(([k, v]) => (
                      <span key={k} className="text-[10px] text-[var(--muted-foreground)]">
                        <span className="font-medium">{k}:</span> {typeof v === "number" ? v.toLocaleString() : v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── ROI by Lead Source ──────────────────────────────────────────────────────

function LeadSourceRoiSection({ data }: { data: DashboardData }) {
  const { forthDeals, ringCentral } = data;

  // Detect data hygiene issues — duplicate source labels
  const forthLabels = forthDeals.source_lead_breakdown.map((s) => s.source_lead);
  const rcLabels = ringCentral.leadsource_breakdown.map((l) => l.lead_source);
  const duplicates = detectDuplicates([...forthLabels, ...rcLabels]);

  // Merge Ring Central entries by canonical name (weighted-avg answer rate)
  const rcBySource: Record<string, { calls: number; answered: number; answerRate: number }> = {};
  ringCentral.leadsource_breakdown.forEach((ls) => {
    const key = normalizeLeadSource(ls.lead_source);
    const existing = rcBySource[key];
    if (existing) {
      existing.calls += ls.total_calls;
      existing.answered += ls.answered_calls;
      existing.answerRate = existing.calls > 0 ? (existing.answered / existing.calls) * 100 : 0;
    } else {
      rcBySource[key] = {
        calls: ls.total_calls,
        answered: ls.answered_calls,
        answerRate: ls.answer_rate,
      };
    }
  });

  // Merge Forth deals by canonical name, then attach Ring Central data
  const sourceMap = new Map<string, { source: string; deals: number; revenue: number }>();
  forthDeals.source_lead_breakdown.forEach((s) => {
    const key = normalizeLeadSource(s.source_lead);
    const existing = sourceMap.get(key);
    if (existing) {
      existing.deals += s.total_deals;
      existing.revenue += s.total_revenue;
    } else {
      sourceMap.set(key, { source: key, deals: s.total_deals, revenue: s.total_revenue });
    }
  });

  const combined = Array.from(sourceMap.values())
    .map((s) => {
      const rc = rcBySource[s.source];
      const avgDeal = s.deals > 0 ? s.revenue / s.deals : 0;
      return {
        source: s.source,
        deals: s.deals,
        revenue: s.revenue,
        avgDealSize: avgDeal,
        calls: rc?.calls ?? null,
        answered: rc?.answered ?? null,
        answerRate: rc?.answerRate ?? null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const chartData = combined.map((s) => ({
    name: s.source.length > 18 ? s.source.slice(0, 16) + "…" : s.source,
    fullName: s.source,
    revenue: s.revenue,
    deals: s.deals,
  }));

  const [viewMode, setViewMode] = useState<"chart" | "table">("table");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">Revenue by Lead Source / Phone Pool</CardTitle>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Each Ring Central phone number belongs to a lead source and round-robins to available reps.
              This view shows channel performance — rep-level breakdown requires extension data.
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                viewMode === "chart"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Chart
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {viewMode === "chart" ? (
          <ResponsiveContainer width="100%" height={Math.max(200, combined.length * 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtCurrency} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => fmtCurrencyFull(v)}
                labelFormatter={(label: string) => {
                  const item = chartData.find((d) => d.name === label);
                  return item?.fullName ?? label;
                }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="rounded-md border border-[var(--border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="text-left px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Lead Source</th>
                  <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Deals</th>
                  <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Revenue</th>
                  <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Avg Deal</th>
                  <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Calls</th>
                  <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Answer %</th>
                </tr>
              </thead>
              <tbody>
                {combined.map((row, i) => (
                  <tr key={row.source} className={i < combined.length - 1 ? "border-b border-[var(--border)]" : ""}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        <span className="font-medium text-[var(--foreground)]">{row.source}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--foreground)]">{row.deals.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-green-600">{fmtCurrencyFull(row.revenue)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">{fmtCurrency(row.avgDealSize)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">
                      {row.calls != null ? row.calls.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">
                      {row.answerRate != null ? `${row.answerRate.toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--border)] bg-[var(--muted)]">
                  <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]">
                    Total ({combined.length} sources)
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[var(--foreground)]">
                    {combined.reduce((s, r) => s + r.deals, 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-green-600">
                    {fmtCurrencyFull(combined.reduce((s, r) => s + r.revenue, 0))}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[var(--foreground)]">
                    {fmtCurrency(
                      combined.reduce((s, r) => s + r.deals, 0) > 0
                        ? combined.reduce((s, r) => s + r.revenue, 0) / combined.reduce((s, r) => s + r.deals, 0)
                        : 0
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[var(--foreground)]">
                    {combined.filter((r) => r.calls != null).reduce((s, r) => s + (r.calls ?? 0), 0).toLocaleString() || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-[var(--foreground)]">
                    {ringCentral.summary.answer_rate.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {combined.some((r) => r.calls == null) && (
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--muted-foreground)]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Some sources don&apos;t have matching call data &mdash; likely pre-tracking deals that reps didn&apos;t disposition</span>
          </div>
        )}

        {/* Data hygiene: show which duplicate labels got merged */}
        {Object.keys(duplicates).length > 0 && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
              <div className="text-xs text-[var(--foreground)]">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Duplicate source labels detected &mdash; merged for display
                </p>
                <p className="text-[var(--muted-foreground)] mt-0.5 mb-1.5">
                  Reps entered these as separate values in Forth. Fix by converting lead source to a fixed dropdown.
                </p>
                <div className="space-y-0.5">
                  {Object.entries(duplicates).map(([canonical, variants]) => (
                    <div key={canonical} className="text-[11px]">
                      <span className="font-mono font-semibold text-[var(--foreground)]">{canonical}</span>
                      <span className="text-[var(--muted-foreground)]"> ← merged: </span>
                      <span className="font-mono text-[var(--muted-foreground)]">
                        {variants.map((v) => `"${v}"`).join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Empower1 Revenue Tiers Reference ────────────────────────────────────────

function RevenueTiersCard({ totalRevenue, totalDeals }: { totalRevenue: number; totalDeals: number }) {
  const dominantTier = estimateDominantTier(totalRevenue, totalDeals);
  const avgRevenue = totalDeals > 0 ? totalRevenue / totalDeals : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-[var(--muted-foreground)]" />
          <CardTitle className="text-sm font-semibold">Empower1 Revenue Tiers</CardTitle>
        </div>
        <p className="text-[11px] text-[var(--muted-foreground)]">
          How client monthly payments map to total deal revenue
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                <th className="text-left px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Monthly Payment</th>
                <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Deal Revenue</th>
                <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Multiple</th>
                <th className="text-left px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Bracket</th>
              </tr>
            </thead>
            <tbody>
              {COMMISSION_TIERS.map((t, i) => {
                const isDominant = dominantTier?.payment === t.payment;
                return (
                  <tr
                    key={t.payment}
                    className={`${i < COMMISSION_TIERS.length - 1 ? "border-b border-[var(--border)]" : ""} ${
                      isDominant ? "bg-amber-50 dark:bg-amber-950/20" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 tabular-nums font-medium text-[var(--foreground)]">
                      ${t.payment}
                      {isDominant && (
                        <span className="ml-2 text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                          ← dominant tier
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-green-600">
                      ${t.revenue.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">
                      {t.multiple.toFixed(2)}x
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        t.bracket === "premium"
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                      }`}>
                        {t.bracket}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[var(--muted-foreground)] mt-3">
          Actual avg revenue per deal:{" "}
          <span className="font-semibold text-[var(--foreground)]">{fmtCurrencyFull(avgRevenue)}</span>
          {dominantTier && (
            <>
              {" "}&mdash; closest to the <span className="font-semibold text-[var(--foreground)]">${dominantTier.payment}/mo</span> payment tier
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtitle,
  color,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  subtitle: string;
  color: "green" | "violet" | "sky" | "amber";
  icon: React.ReactNode;
  valueColor?: string;
}) {
  const colorMap = {
    green: { border: "border-l-green-500", bg: "bg-green-100", text: "text-green-600" },
    violet: { border: "border-l-violet-500", bg: "bg-violet-100", text: "text-violet-600" },
    sky: { border: "border-l-sky-500", bg: "bg-sky-100", text: "text-sky-600" },
    amber: { border: "border-l-amber-500", bg: "bg-amber-100", text: "text-amber-600" },
  };
  const c = colorMap[color];

  return (
    <Card className={`overflow-hidden border-l-4 ${c.border}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{label}</span>
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${c.bg} ${c.text}`}>{icon}</div>
        </div>
        <p className={`text-3xl font-bold ${valueColor ?? "text-[var(--foreground)]"}`}>{value}</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-[var(--foreground)] mt-0.5">{value}</p>
    </div>
  );
}
