"use client";

import { useState } from "react";
import { Phone, CheckCircle2, XCircle, Clock, Activity, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/dashboard/stats-card";
import type { DashboardData, RingCentralLeadSource } from "@/types";
import { CHART_COLORS } from "@/lib/chart-colors";
import { backfillPeriods } from "@/lib/period-backfill";

interface Props { data: DashboardData; isLoading: boolean; }

/**
 * The raw `missed_calls` field from the Ring Central webhook counts ring
 * attempts per agent extension, not unique conversations. A single inbound
 * call ringing 11 agents = 10 false "missed" entries if one agent picks up.
 * We compute missed as (total - answered) instead so the math matches the
 * answer rate and represents real missed conversations.
 */
function realMissed(x: { total_calls: number; answered_calls: number }): number {
  return Math.max(0, x.total_calls - x.answered_calls);
}

export function RingCentralSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <section id="ring-central" className="space-y-6">
        <SectionHeading />
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </section>
    );
  }

  const { ringCentral } = data;
  const { leadsource_breakdown, month_breakdown, week_breakdown, summary } = ringCentral;

  // Backfill missing periods with zero entries so trends are honest
  const filledMonths = backfillPeriods(month_breakdown ?? [], (period) => ({
    period,
    total_calls: 0,
    answered_calls: 0,
    missed_calls: 0,
    total_duration: 0,
    total_duration_mins: 0,
    answer_rate: 0,
    avg_duration: 0,
    by_leadsource: [],
  }));
  const filledWeeks = backfillPeriods(week_breakdown ?? [], (period) => ({
    period,
    date_range: "",
    total_calls: 0,
    answered_calls: 0,
    missed_calls: 0,
    total_duration: 0,
    total_duration_mins: 0,
    answer_rate: 0,
    avg_duration: 0,
    by_leadsource: [],
  }));
  // Reverse-sort for descending display (most recent first)
  const sortedMonths = [...filledMonths].sort((a, b) => b.period.localeCompare(a.period));
  const sortedWeeks = [...filledWeeks].sort((a, b) => b.period.localeCompare(a.period));

  return (
    <section id="ring-central" className="space-y-6">
      <SectionHeading />

      {/* 1. Lead Source Breakdown */}
      {leadsource_breakdown.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Lead Source Breakdown
            <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">{leadsource_breakdown.length} sources</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
            {leadsource_breakdown.map((ls, i) => (
              <Card key={ls.lead_source}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <p className="text-sm font-bold text-[var(--foreground)]">{ls.lead_source}</p>
                  </div>
                  <LeadSourceStats ls={ls} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 2. Month Breakdown */}
      {sortedMonths.length > 0 && (
        <MonthBreakdown months={sortedMonths} />
      )}

      {/* 3. Week Breakdown */}
      {sortedWeeks.length > 0 && (
        <WeekBreakdown weeks={sortedWeeks} />
      )}

      {/* 4. Summary */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Summary</h3>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <StatsCard
            title="Total Calls"
            value={summary.total_calls.toLocaleString()}
            subtitle="All inbound + outbound"
            icon={Phone}
            iconClassName="bg-blue-100 text-blue-600"
          />
          <StatsCard
            title="Answered"
            value={summary.answered_calls.toLocaleString()}
            subtitle="Successfully answered"
            icon={CheckCircle2}
            iconClassName="bg-green-100 text-green-600"
          />
          <StatsCard
            title="Answer Rate"
            value={`${summary.answer_rate.toFixed(1)}%`}
            subtitle="Overall answer rate"
            icon={Activity}
            iconClassName="bg-violet-100 text-violet-600"
          />
          <StatsCard
            title="Missed"
            value={realMissed(summary).toLocaleString()}
            subtitle="Unanswered calls"
            icon={XCircle}
            iconClassName="bg-red-100 text-red-600"
          />
          <StatsCard
            title="Total Duration"
            value={`${summary.total_duration_mins.toLocaleString()} min`}
            subtitle="Combined talk time"
            icon={Clock}
            iconClassName="bg-amber-100 text-amber-600"
          />
          <StatsCard
            title="Avg Duration"
            value={`${summary.avg_duration.toFixed(0)}s`}
            subtitle="Per answered call"
            icon={Timer}
            iconClassName="bg-orange-100 text-orange-600"
          />
        </div>
      </div>
    </section>
  );
}

function LeadSourceStats({ ls }: { ls: RingCentralLeadSource }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
      <div>
        <p className="text-[10px] text-[var(--muted-foreground)]">Total Calls</p>
        <p className="font-semibold tabular-nums">{ls.total_calls.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-[10px] text-[var(--muted-foreground)]">Answered</p>
        <p className="font-semibold tabular-nums text-green-600">{ls.answered_calls.toLocaleString()}</p>
      </div>
      <div>
        <p className="text-[10px] text-[var(--muted-foreground)]">Missed</p>
        <p className="font-semibold tabular-nums text-red-500">{realMissed(ls).toLocaleString()}</p>
      </div>
      <div>
        <p className="text-[10px] text-[var(--muted-foreground)]">Answer Rate</p>
        <p className="font-semibold tabular-nums">{ls.answer_rate.toFixed(1)}%</p>
      </div>
      <div>
        <p className="text-[10px] text-[var(--muted-foreground)]">Duration</p>
        <p className="font-semibold tabular-nums">{ls.total_duration_mins.toLocaleString()} min</p>
      </div>
      <div>
        <p className="text-[10px] text-[var(--muted-foreground)]">Avg Duration</p>
        <p className="font-semibold tabular-nums">{ls.avg_duration.toFixed(0)}s</p>
      </div>
    </div>
  );
}

function MonthBreakdown({ months }: { months: import("@/types").RingCentralMonthEntry[] }) {
  const [selected, setSelected] = useState(months[0].period);
  const entry = months.find((m) => m.period === selected) ?? months[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Month Breakdown</CardTitle>
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Select Month
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="text-sm rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] max-w-xs"
          >
            {months.map((m) => (
              <option key={m.period} value={m.period}>{m.period}</option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <PeriodStats entry={entry} />
        {entry.by_leadsource.length > 0 && <LeadSourceTable rows={entry.by_leadsource} />}
      </CardContent>
    </Card>
  );
}

function WeekBreakdown({ weeks }: { weeks: import("@/types").RingCentralWeekEntry[] }) {
  const [selected, setSelected] = useState(weeks[0].period);
  const entry = weeks.find((w) => w.period === selected) ?? weeks[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Week Breakdown</CardTitle>
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Select Week
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="text-sm rounded-md border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] max-w-xs"
          >
            {weeks.map((w) => (
              <option key={w.period} value={w.period}>{w.period} — {w.date_range}</option>
            ))}
          </select>
          <p className="text-[11px] text-[var(--muted-foreground)]">{entry.date_range}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <PeriodStats entry={entry} />
        {entry.by_leadsource.length > 0 && <LeadSourceTable rows={entry.by_leadsource} />}
      </CardContent>
    </Card>
  );
}

function PeriodStats({ entry }: { entry: import("@/types").RingCentralSummary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <StatBox label="Total Calls" value={entry.total_calls.toLocaleString()} />
      <StatBox label="Answered" value={entry.answered_calls.toLocaleString()} valueClassName="text-green-600" />
      <StatBox label="Answer Rate" value={`${entry.answer_rate.toFixed(1)}%`} />
      <StatBox label="Missed" value={realMissed(entry).toLocaleString()} valueClassName="text-red-500" />
      <StatBox label="Duration" value={`${entry.total_duration_mins.toLocaleString()} min`} />
      <StatBox label="Avg Duration" value={`${entry.avg_duration.toFixed(0)}s`} />
    </div>
  );
}

function LeadSourceTable({ rows }: { rows: RingCentralLeadSource[] }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">By Lead Source</p>
      <div className="rounded-md border border-[var(--border)] overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="text-left px-2 py-1.5 font-medium text-[var(--muted-foreground)]">Lead Source</th>
              <th className="text-right px-2 py-1.5 font-medium text-[var(--muted-foreground)]">Calls</th>
              <th className="text-right px-2 py-1.5 font-medium text-[var(--muted-foreground)]">Answered</th>
              <th className="text-right px-2 py-1.5 font-medium text-[var(--muted-foreground)]">Missed</th>
              <th className="text-right px-2 py-1.5 font-medium text-[var(--muted-foreground)]">Rate</th>
              <th className="text-right px-2 py-1.5 font-medium text-[var(--muted-foreground)]">Avg Dur.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.lead_source} className={i < rows.length - 1 ? "border-b border-[var(--border)]" : ""}>
                <td className="px-2 py-1.5 font-medium text-[var(--foreground)]">{r.lead_source}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.total_calls.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-green-600">{r.answered_calls.toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-red-500">{realMissed(r).toLocaleString()}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.answer_rate.toFixed(1)}%</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{r.avg_duration.toFixed(0)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatBox({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2">
      <p className="text-[10px] text-[var(--muted-foreground)] mb-0.5">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${valueClassName ?? ""}`}>{value}</p>
    </div>
  );
}

function SectionHeading() {
  return (
    <div className="border-b border-[var(--border)] pb-4">
      <h2 className="text-xl font-bold text-[var(--foreground)]">Call Performance</h2>
      <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
        Call volume, answer rates, and performance by lead source
      </p>
    </div>
  );
}
