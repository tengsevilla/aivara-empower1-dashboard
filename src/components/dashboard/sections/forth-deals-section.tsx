"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "@/lib/chart-colors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { backfillPeriods } from "@/lib/period-backfill";
import type { DashboardData, ForthMonthEntry, ForthWeekEntry } from "@/types";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  borderRadius: "0.5rem",
  color: "var(--popover-foreground)",
  fontSize: "0.75rem",
};

function fmtCurrency(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtCurrencyShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

interface Props { data: DashboardData; isLoading: boolean; }

export function ForthDealsSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <section id="forth-deals" className="space-y-6">
        <SectionHeading />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </section>
    );
  }

  const { forthDeals } = data;
  const { source_lead_breakdown, deal_type_breakdown, month_breakdown, week_breakdown } = forthDeals;

  // Backfill missing periods with zero entries so trends are continuous
  // (n8n's aggregation drops empty periods by default, which left gaps).
  const sortedMonths = backfillPeriods(month_breakdown, (period) => ({
    period,
    total_deals: 0,
    total_revenue: 0,
    by_deal_type: [],
    by_source_lead: [],
  }));
  const sortedWeeks = backfillPeriods(week_breakdown, (period) => ({
    period,
    date_range: "",
    total_deals: 0,
    total_revenue: 0,
    by_deal_type: [],
    by_source_lead: [],
  }));

  return (
    <section id="forth-deals" className="space-y-10">
      <SectionHeading />

      {/* ── 1. Source Lead Breakdown ── */}
      <div className="space-y-3">
        <SubHeading label="Source Lead Breakdown" count={source_lead_breakdown.length} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {source_lead_breakdown.map((s) => (
            <Card key={s.source_lead}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">{s.source_lead}</CardTitle>
                <div className="flex gap-6 text-xs mt-1">
                  <Stat label="Total Deals" value={s.total_deals.toLocaleString()} />
                  <Stat label="Total Revenue" value={fmtCurrency(s.total_revenue)} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <NestedTable
                  label="By Deal Type"
                  col1="Deal Type"
                  rows={s.by_deal_type.map((t) => ({ key: t.deal_type, deals: t.total_deals, revenue: t.total_revenue }))}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── 2. Deal Type Breakdown ── */}
      <div className="space-y-3">
        <SubHeading label="Deal Type Breakdown" count={deal_type_breakdown.length} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {deal_type_breakdown.map((d) => (
            <Card key={d.deal_type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">{d.deal_type}</CardTitle>
                <div className="flex gap-6 text-xs mt-1">
                  <Stat label="Total Deals" value={d.total_deals.toLocaleString()} />
                  <Stat label="Total Revenue" value={fmtCurrency(d.total_revenue)} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <NestedTable
                  label="By Source Lead"
                  col1="Source Lead"
                  rows={d.by_source_lead.map((s) => ({ key: s.source_lead, deals: s.total_deals, revenue: s.total_revenue }))}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── 3. Month Breakdown ── */}
      <MonthBreakdown months={sortedMonths} />

      {/* ── 4. Week Breakdown ── */}
      {sortedWeeks.length > 0 && (
        <WeekBreakdown weeks={sortedWeeks} />
      )}

      {/* Summary stats now live in ROI Overview section at top of dashboard */}
    </section>
  );
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function SectionHeading() {
  return (
    <div className="border-b border-[var(--border)] pb-4">
      <h2 className="text-xl font-bold text-[var(--foreground)]">Deal Breakdown</h2>
      <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Revenue by lead source, deal type, and time period</p>
    </div>
  );
}

function SubHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{label}</h3>
      <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--muted-foreground)]">{label}</p>
      <p className="font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function MonthBreakdown({ months }: { months: ForthMonthEntry[] }) {
  const dealTypes   = [...new Set(months.flatMap((m) => m.by_deal_type.map((t) => t.deal_type)))];
  const sourceLeads = [...new Set(months.flatMap((m) => m.by_source_lead.map((s) => s.source_lead)))];

  const [chartMode, setChartMode] = useState<"deal_type" | "source_lead">("deal_type");
  const activeKeys = chartMode === "deal_type" ? dealTypes : sourceLeads;

  const chartData = months.map((m) => {
    const point: Record<string, number | string> = { period: m.period };
    if (chartMode === "deal_type") {
      dealTypes.forEach((dt) => {
        point[dt] = m.by_deal_type.find((t) => t.deal_type === dt)?.total_revenue ?? 0;
      });
    } else {
      sourceLeads.forEach((sl) => {
        point[sl] = m.by_source_lead.find((s) => s.source_lead === sl)?.total_revenue ?? 0;
      });
    }
    return point;
  });

  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1].period);
  const month = months.find((m) => m.period === selectedMonth) ?? months[months.length - 1];

  return (
    <div className="space-y-4">
      <SubHeading label="Month Breakdown" count={months.length} />

      {/* Revenue line chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold">
                Monthly Revenue by {chartMode === "deal_type" ? "Deal Type" : "Source Lead"}
              </CardTitle>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                Each line represents revenue trend per {chartMode === "deal_type" ? "deal type" : "source lead"} across all months
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Group by
              </label>
              <select
                value={chartMode}
                onChange={(e) => setChartMode(e.target.value as "deal_type" | "source_lead")}
                className="text-xs rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
              >
                <option value="deal_type">Deal Type</option>
                <option value="source_lead">Source Lead</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={fmtCurrencyShort} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {activeKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Month detail card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] max-w-xs"
            >
              {[...months].reverse().map((m) => (
                <option key={m.period} value={m.period}>{m.period}</option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Showing detailed breakdown for <span className="font-medium text-[var(--foreground)]">{month.period}</span>
            </p>
          </div>
          <div className="flex gap-6 text-xs mt-3 pt-3 border-t border-[var(--border)]">
            <Stat label="Total Deals" value={month.total_deals.toLocaleString()} />
            <Stat label="Total Revenue" value={fmtCurrency(month.total_revenue)} />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <NestedTable
            label="By Deal Type"
            col1="Deal Type"
            rows={month.by_deal_type.map((t) => ({ key: t.deal_type, deals: t.total_deals, revenue: t.total_revenue }))}
          />
          <NestedTable
            label="By Source Lead"
            col1="Source Lead"
            rows={month.by_source_lead.map((s) => ({ key: s.source_lead, deals: s.total_deals, revenue: s.total_revenue }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function WeekBreakdown({ weeks }: { weeks: ForthWeekEntry[] }) {
  // Week detail selector
  const [selected, setSelected] = useState(weeks[weeks.length - 1].period);
  const week = weeks.find((w) => w.period === selected) ?? weeks[weeks.length - 1];

  // All unique values across all weeks
  const dealTypes   = [...new Set(weeks.flatMap((w) => w.by_deal_type.map((t) => t.deal_type)))];
  const sourceLeads = [...new Set(weeks.flatMap((w) => w.by_source_lead.map((s) => s.source_lead)))];

  const [chartMode, setChartMode] = useState<"deal_type" | "source_lead">("deal_type");
  const activeKeys = chartMode === "deal_type" ? dealTypes : sourceLeads;

  // One data point per week, with each group value as a key
  const chartData = weeks.map((w) => {
    const point: Record<string, number | string> = { period: w.period };
    if (chartMode === "deal_type") {
      dealTypes.forEach((dt) => {
        point[dt] = w.by_deal_type.find((t) => t.deal_type === dt)?.total_revenue ?? 0;
      });
    } else {
      sourceLeads.forEach((sl) => {
        point[sl] = w.by_source_lead.find((s) => s.source_lead === sl)?.total_revenue ?? 0;
      });
    }
    return point;
  });

  return (
    <div className="space-y-4">
      <SubHeading label="Week Breakdown" count={weeks.length} />

      {/* Revenue line chart — one line per group */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-semibold">
                Weekly Revenue by {chartMode === "deal_type" ? "Deal Type" : "Source Lead"}
              </CardTitle>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                Each line represents revenue trend per {chartMode === "deal_type" ? "deal type" : "source lead"} across all weeks
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Group by
              </label>
              <select
                value={chartMode}
                onChange={(e) => setChartMode(e.target.value as "deal_type" | "source_lead")}
                className="text-xs rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
              >
                <option value="deal_type">Deal Type</option>
                <option value="source_lead">Source Lead</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={fmtCurrencyShort} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {activeKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detail card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Select Week
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="text-sm rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] max-w-xs"
            >
              {[...weeks].reverse().map((w) => (
                <option key={w.period} value={w.period}>{w.period}</option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {week.date_range} · Showing breakdown for <span className="font-medium text-[var(--foreground)]">{week.period}</span>
            </p>
          </div>
          <div className="flex gap-6 text-xs mt-3 pt-3 border-t border-[var(--border)]">
            <Stat label="Total Deals" value={week.total_deals.toLocaleString()} />
            <Stat label="Total Revenue" value={fmtCurrency(week.total_revenue)} />
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <NestedTable
            label="By Deal Type"
            col1="Deal Type"
            rows={week.by_deal_type.map((t) => ({ key: t.deal_type, deals: t.total_deals, revenue: t.total_revenue }))}
          />
          <NestedTable
            label="By Source Lead"
            col1="Source Lead"
            rows={week.by_source_lead.map((s) => ({ key: s.source_lead, deals: s.total_deals, revenue: s.total_revenue }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function NestedTable({
  label, col1, rows,
}: {
  label: string;
  col1: string;
  rows: { key: string; deals: number; revenue: number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">{label}</p>
      <div className="rounded-md border border-[var(--border)] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="text-left px-2 py-1.5 font-medium text-[var(--muted-foreground)]">{col1}</th>
              <th className="text-right px-2 py-1.5 font-medium text-[var(--muted-foreground)]">Deals</th>
              <th className="text-right px-2 py-1.5 font-medium text-[var(--muted-foreground)]">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.key}
                className={i < rows.length - 1 ? "border-b border-[var(--border)]" : ""}
              >
                <td className="px-2 py-1.5 text-[var(--foreground)]">{r.key}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-[var(--muted-foreground)]">{r.deals.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-medium text-[var(--foreground)]">{fmtCurrency(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
