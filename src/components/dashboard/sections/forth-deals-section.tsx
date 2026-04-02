"use client";

import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { DollarSign, TrendingUp, CreditCard, Banknote } from "lucide-react";
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

function fmtCurrency(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtCurrencyShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

interface Props { data: DashboardData; isLoading: boolean; }

export function ForthDealsSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <section id="forth-deals" className="space-y-6">
        <SectionHeading title="Forth Deals" subtitle="Deal pipeline and revenue overview" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </section>
    );
  }

  const { forthDeals } = data;
  const { summary, deals_by_month, revenue_by_month, revenue_by_lead_source, revenue_by_deal_type } = forthDeals;

  // Sort month arrays
  const dealsByMonth = [...deals_by_month].sort((a, b) => a.period.localeCompare(b.period));
  const revenueByMonth = [...revenue_by_month].sort((a, b) => a.period.localeCompare(b.period));

  // Combined monthly chart data
  const monthData = dealsByMonth.map((d) => {
    const rev = revenueByMonth.find((r) => r.period === d.period);
    return {
      month: d.period,
      Deals: d.total_deals,
      Revenue: rev?.gross_revenue ?? 0,
    };
  });

  // Lead source pie (by revenue)
  const leadSourceData = revenue_by_lead_source.map((e) => ({
    name: e.lead_source,
    value: e.gross_revenue,
  }));

  // Deal type bar
  const dealTypeData = revenue_by_deal_type
    .filter((e) => e.gross_revenue > 0)
    .sort((a, b) => b.gross_revenue - a.gross_revenue)
    .map((e) => ({ name: e.deal_type, value: e.gross_revenue }));

  return (
    <section id="forth-deals" className="space-y-6">
      <SectionHeading title="Forth Deals" subtitle="Deal pipeline and revenue overview" />

      {/* Summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Total Deals"
          value={String(summary.total_deals)}
          subtitle="All processed deals"
          icon={TrendingUp}
          iconClassName="bg-violet-100 text-violet-600"
        />
        <StatsCard
          title="Total Debt"
          value={fmtCurrencyShort(summary.total_debt)}
          subtitle="Current client debt"
          icon={CreditCard}
          iconClassName="bg-red-100 text-red-600"
        />
        <StatsCard
          title="Current Payments"
          value={fmtCurrency(summary.total_current_payments)}
          subtitle="Client payment amounts"
          icon={Banknote}
          iconClassName="bg-amber-100 text-amber-600"
        />
        <StatsCard
          title="Total Revenue"
          value={fmtCurrencyShort(summary.total_revenue)}
          subtitle="Gross revenue across all deals"
          icon={DollarSign}
          iconClassName="bg-green-100 text-green-600"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly deals bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Monthly Deals Volume</CardTitle>
            <CardDescription className="text-xs">Number of deals closed per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="Deals" fill="#a78bca" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead source pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Revenue by Lead Source</CardTitle>
            <CardDescription className="text-xs">Gross revenue breakdown by origin</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%" cy="50%" outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${fmtCurrencyShort(value as number)}`}
                  labelLine
                >
                  {leadSourceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly revenue area chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Monthly Revenue Trend</CardTitle>
          <CardDescription className="text-xs">Gross revenue over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueByMonth.map((r) => ({ month: r.period, Revenue: r.gross_revenue }))} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6ec6a0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6ec6a0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={fmtCurrencyShort} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtCurrency(v)} />
              <Area type="monotone" dataKey="Revenue" stroke="#6ec6a0" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Deal type breakdown */}
      {dealTypeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Revenue by Deal Type</CardTitle>
            <CardDescription className="text-xs">Gross revenue per deal category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(140, dealTypeData.length * 52)}>
              <BarChart data={dealTypeData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={fmtCurrencyShort} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={120} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtCurrency(v)} />
                <Bar dataKey="value" name="Revenue" radius={[0, 3, 3, 0]}>
                  {dealTypeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Per-month detail cards */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Monthly Detail</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {dealsByMonth.map((d) => (
            <Card key={d.period}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-[var(--primary)]">{d.period}</CardTitle>
                {/* Summary totals */}
                <div className="flex gap-4 mt-1">
                  <div>
                    <p className="text-[10px] text-[var(--muted-foreground)]">Total Deals</p>
                    <p className="text-base font-bold text-[var(--foreground)]">{d.total_deals}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--muted-foreground)]">Total Revenue</p>
                    <p className="text-base font-bold text-[var(--foreground)]">{fmtCurrency(d.total_revenue ?? 0)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs pt-0">
                {/* By deal type */}
                {(d.by_deal_type ?? []).filter((t) => t.total_deals > 0).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)] mb-2">By Deal Type</p>
                    {/* Column headers */}
                    <div className="grid grid-cols-3 text-[10px] font-semibold text-[var(--muted-foreground)] mb-1 px-0.5">
                      <span className="col-span-1">Type</span>
                      <span className="text-center">Deals</span>
                      <span className="text-right">Revenue</span>
                    </div>
                    <div className="space-y-1.5">
                      {(d.by_deal_type ?? []).filter((t) => t.total_deals > 0).map((t) => (
                        <div key={t.deal_type} className="grid grid-cols-3 items-center gap-1">
                          <span className="text-[var(--foreground)] truncate col-span-1">{t.deal_type}</span>
                          <span className="text-center font-medium tabular-nums text-[var(--muted-foreground)]">{t.total_deals}</span>
                          <span className="text-right font-semibold tabular-nums">{fmtCurrencyShort(t.total_revenue ?? 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Divider */}
                {(d.by_source_lead ?? []).length > 0 && (d.by_deal_type ?? []).filter((t) => t.total_deals > 0).length > 0 && (
                  <hr style={{ borderColor: "var(--border)" }} />
                )}
                {/* By lead source */}
                {(d.by_source_lead ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted-foreground)] mb-2">By Lead Source</p>
                    {/* Column headers */}
                    <div className="grid grid-cols-3 text-[10px] font-semibold text-[var(--muted-foreground)] mb-1 px-0.5">
                      <span className="col-span-1">Source</span>
                      <span className="text-center">Deals</span>
                      <span className="text-right">Revenue</span>
                    </div>
                    <div className="space-y-1.5">
                      {(d.by_source_lead ?? []).map((s) => (
                        <div key={s.source_lead} className="grid grid-cols-3 items-center gap-1">
                          <span className="text-[var(--foreground)] truncate col-span-1">{s.source_lead}</span>
                          <span className="text-center font-medium tabular-nums text-[var(--muted-foreground)]">{s.total_deals}</span>
                          <span className="text-right font-semibold tabular-nums">{fmtCurrencyShort(s.total_revenue ?? 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Lead source detail */}
      {revenue_by_lead_source.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Revenue by Lead Source</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {revenue_by_lead_source.map((e, i) => (
              <Card key={e.lead_source}>
                <CardContent className="pt-4 flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{e.lead_source}</p>
                    <p className="text-sm font-semibold">{fmtCurrency(e.gross_revenue)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="font-medium text-[var(--foreground)]">{value}</span>
    </div>
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
