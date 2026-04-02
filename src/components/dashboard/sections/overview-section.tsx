"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { DollarSign, MessageSquare, PhoneCall, ListOrdered, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/dashboard/stats-card";
import type { DashboardData } from "@/types";
import { CHART_COLORS } from "@/lib/chart-colors";

const TOOLTIP_STYLE = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  borderRadius: "0.5rem",
  color: "var(--popover-foreground)",
  fontSize: "0.75rem",
};

function fmt(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : String(n);
}

function fmtCurrency(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  data: DashboardData;
  isLoading: boolean;
}

export function OverviewSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <section id="overview" className="space-y-6">
        <SectionHeading title="Overview" subtitle="Cost summary and monthly trends across all systems" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent className="pt-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
          <Card><CardContent className="pt-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
        </div>
      </section>
    );
  }

  const { smsQueue, rvmQueue, smsRawlogs, rvmRawlogs, forthDeals, smsInbound } = data;

  // Merge months from both sms and rvm for cost chart
  const allMonths = Array.from(
    new Set([
      ...Object.keys(smsRawlogs.month_breakdown),
      ...Object.keys(rvmRawlogs.month_breakdown),
    ])
  ).sort();

  const costData = allMonths.map((m) => ({
    month: m,
    "SMS Cost": smsRawlogs.month_breakdown[m]?.total_cost ?? 0,
    "RVM Cost": rvmRawlogs.month_breakdown[m]?.total_cost ?? 0,
  }));

  // Month breakdown tables
  const rvmMonths = Object.entries(rvmRawlogs.month_breakdown).sort(([a], [b]) => a.localeCompare(b));
  const smsMonths = Object.entries(smsRawlogs.month_breakdown).sort(([a], [b]) => a.localeCompare(b));
  const inboundMonths = Object.entries(smsInbound.month_breakdown).sort(([a], [b]) => a.localeCompare(b));
  const dealsMonths = [...forthDeals.deals_by_month].sort((a, b) => a.period.localeCompare(b.period));

  const totalRevenue = forthDeals.summary.total_revenue;

  return (
    <section id="overview" className="space-y-6">
      <SectionHeading title="Overview" subtitle="Cost summary and monthly trends across all systems" />

      {/* System Queue */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
          <ListOrdered className="h-3.5 w-3.5" /> System Queue — pending execution
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard
            title="SMS Queue"
            value={fmt(smsQueue.total_queued)}
            subtitle="Outbound SMS waiting to be sent"
            icon={MessageSquare}
            iconClassName="bg-blue-100 text-blue-600"
          />
          <StatsCard
            title="RVM Queue"
            value={fmt(rvmQueue.total_queued)}
            subtitle="Ringless voicemail pending dispatch"
            icon={PhoneCall}
            iconClassName="bg-purple-100 text-purple-600"
          />
        </div>
      </div>

      {/* Cost Stats */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3 flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5" /> Total Costs
        </p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard
            title="SMS Outbound Cost"
            value={fmtCurrency(smsRawlogs.total_cost)}
            subtitle={`${fmt(smsRawlogs.total_messages)} messages sent`}
            icon={MessageSquare}
            iconClassName="bg-teal-100 text-teal-600"
          />
          <StatsCard
            title="RVM Cost"
            value={fmtCurrency(rvmRawlogs.total_cost)}
            subtitle={`${fmt(rvmRawlogs.total_rvm)} voicemails sent`}
            icon={PhoneCall}
            iconClassName="bg-violet-100 text-violet-600"
          />
          <StatsCard
            title="Forth Deals Revenue"
            value={fmtCurrency(totalRevenue)}
            subtitle={`${forthDeals.summary.total_deals} total deals`}
            icon={DollarSign}
            iconClassName="bg-green-100 text-green-600"
          />
          <StatsCard
            title="SMS Inbound"
            value={fmt(smsInbound.total_received)}
            subtitle="Total replies received"
            icon={MessageSquare}
            iconClassName="bg-orange-100 text-orange-600"
          />
        </div>
      </div>

      {/* Cost Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Cost Trend — SMS vs RVM</CardTitle>
            <CardDescription className="text-xs">Monthly spend comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={costData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="smsCostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64b5d0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#64b5d0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rvmCostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bca" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bca" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="SMS Cost" stroke="#64b5d0" fill="url(#smsCostGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="RVM Cost" stroke="#a78bca" fill="url(#rvmCostGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Cost Comparison by Month</CardTitle>
            <CardDescription className="text-xs">SMS vs RVM side-by-side</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={costData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="SMS Cost" fill="#64b5d0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="RVM Cost" fill="#a78bca" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Month Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthTable
          title="SMS Outbound — Monthly"
          description="Messages and cost per month"
          columns={["Messages", "Cost"]}
          rows={smsMonths.map(([m, e]) => [m, fmt(e.total_messages), fmtCurrency(e.total_cost)])}
        />
        <MonthTable
          title="RVM — Monthly"
          description="Success, failure, queued, cost per month"
          columns={["Success", "Failure", "Queued", "Cost"]}
          rows={rvmMonths.map(([m, e]) => [m, fmt(e.success), fmt(e.failure), fmt(e.queued), fmtCurrency(e.total_cost)])}
        />
        <MonthTable
          title="SMS Inbound — Monthly"
          description="Replies received per month"
          columns={["Received"]}
          rows={inboundMonths.map(([m, e]) => [m, fmt(e.total_received)])}
        />
        <MonthTable
          title="Forth Deals — Monthly"
          description="Deals and revenue per month"
          columns={["Deals", "Revenue"]}
          rows={dealsMonths.map((e) => [e.period, String(e.total_deals), fmtCurrency(e.total_revenue ?? 0)])}
        />
      </div>
    </section>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-[var(--border)] pb-4">
      <h2 className="text-xl font-bold text-[var(--foreground)]">{title}</h2>
      <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{subtitle}</p>
    </div>
  );
}

function MonthTable({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-[var(--muted-foreground)]" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 pr-4 text-xs font-medium text-[var(--muted-foreground)]">Month</th>
                {columns.map((col) => (
                  <th key={col} className="text-right py-2 px-2 text-xs font-medium text-[var(--muted-foreground)]">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([month, ...vals]) => (
                <tr key={month} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-4 text-xs font-medium text-[var(--foreground)]">{month}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="py-2 px-2 text-right text-xs text-[var(--muted-foreground)]">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Keep CHART_COLORS usage to avoid lint warning
void CHART_COLORS;
