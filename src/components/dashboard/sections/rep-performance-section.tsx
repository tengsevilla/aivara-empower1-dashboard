"use client";

import { Users, Trophy, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardData } from "@/types";
import forthSnapshot from "@/lib/forth-rep-snapshot.json";

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtCurrencyFull(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

interface SnapshotRep {
  rep_name: string;
  total_deals: number;
  total_debt: number;
  total_current_payments: number;
  total_payments_cleared: number;
}

interface Props {
  data: DashboardData;
  isLoading: boolean;
}

export function RepPerformanceSection({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <section id="rep-performance" className="space-y-4">
        <div className="border-b border-[var(--border)] pb-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Rep Performance</h2>
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </section>
    );
  }

  // Prefer live webhook data if it arrives; fall back to the Forth snapshot.
  const webhookReps = data?.forthDeals?.rep_breakdown;
  const hasWebhookReps = webhookReps && webhookReps.length > 0;

  const snapshotReps = (forthSnapshot.reps as SnapshotRep[]).filter((r) => r.rep_name !== "Unassigned");
  const unassigned = (forthSnapshot.reps as SnapshotRep[]).find((r) => r.rep_name === "Unassigned");

  const sortedReps = hasWebhookReps
    ? [...webhookReps].map((r) => ({
        rep_name: r.rep_name,
        total_deals: r.total_deals,
        total_debt: 0,
        total_current_payments: r.total_revenue,
        total_payments_cleared: 0,
      }))
    : [...snapshotReps];
  sortedReps.sort((a, b) => b.total_current_payments - a.total_current_payments);

  const topRep = sortedReps[0];
  const totalAssignedDeals = sortedReps.reduce((s, r) => s + r.total_deals, 0);
  const totalPayments = sortedReps.reduce((s, r) => s + r.total_current_payments, 0);
  const totalDebt = sortedReps.reduce((s, r) => s + r.total_debt, 0);

  return (
    <section id="rep-performance" className="space-y-5">
      <div className="border-b border-[var(--border)] pb-4">
        <h2 className="text-xl font-bold text-[var(--foreground)]">Rep Performance</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Closed Reso deals attributed to each sales rep
          {!hasWebhookReps && (
            <>
              {" "}&middot;{" "}
              <span className="text-[var(--muted-foreground)]">
                Snapshot from Forth on {fmtDate(forthSnapshot.scrapedAt)}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Top performer callout */}
      {topRep && (
        <Card className="overflow-hidden border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600 shrink-0">
                <Trophy className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Top Performer</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{topRep.rep_name}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {topRep.total_deals} deals &middot; {fmtCurrencyFull(topRep.total_current_payments)} current payments
                  {topRep.total_debt > 0 && (
                    <> &middot; {fmtCurrency(topRep.total_debt)} debt under mgmt</>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rep leaderboard table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
            <CardTitle className="text-sm font-semibold">Leaderboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-md border border-[var(--border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
                  <th className="text-left px-3 py-2.5 font-medium text-[var(--muted-foreground)]">#</th>
                  <th className="text-left px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Rep</th>
                  <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Deals</th>
                  <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Current Payments</th>
                  <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Debt Under Mgmt</th>
                  <th className="text-right px-3 py-2.5 font-medium text-[var(--muted-foreground)]">Avg Deal</th>
                </tr>
              </thead>
              <tbody>
                {sortedReps.map((rep, i) => {
                  const avgDeal = rep.total_deals > 0 ? rep.total_current_payments / rep.total_deals : 0;
                  return (
                    <tr key={rep.rep_name} className={i < sortedReps.length - 1 ? "border-b border-[var(--border)]" : ""}>
                      <td className="px-3 py-2.5 text-[var(--muted-foreground)] font-medium">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">{rep.rep_name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--foreground)]">{rep.total_deals.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-green-600">{fmtCurrencyFull(rep.total_current_payments)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">{rep.total_debt > 0 ? fmtCurrency(rep.total_debt) : "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--muted-foreground)]">{fmtCurrencyFull(avgDeal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--border)] bg-[var(--muted)]">
                  <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]" colSpan={2}>
                    Total ({sortedReps.length} reps)
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[var(--foreground)]">{totalAssignedDeals.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-green-600">{fmtCurrencyFull(totalPayments)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[var(--foreground)]">{fmtCurrency(totalDebt)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[var(--foreground)]">
                    {totalAssignedDeals > 0 ? fmtCurrencyFull(totalPayments / totalAssignedDeals) : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Unassigned callout */}
          {!hasWebhookReps && unassigned && unassigned.total_deals > 0 && (
            <div className="mt-3 flex items-start gap-2.5 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
              <div className="text-xs text-[var(--foreground)]">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  {unassigned.total_deals} deals are unassigned ({Math.round((unassigned.total_deals / forthSnapshot.totalDeals) * 100)}% of closed deals)
                </p>
                <p className="text-[var(--muted-foreground)] mt-0.5">
                  These are pre-tracking records where reps weren&apos;t dispositioning &mdash; they can&apos;t be retroactively attributed.
                  Going forward, ensure every deal in Forth has an &quot;Assigned To&quot; value.
                </p>
              </div>
            </div>
          )}

          {!hasWebhookReps && (
            <div className="mt-3 flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Data source: Forth CRM &ldquo;Reso Deal Closed&rdquo; saved list (scraped {fmtDate(forthSnapshot.scrapedAt)}).
                Once n8n sends <code className="font-mono text-[10px]">rep_breakdown</code> on the webhook, this section will switch to live data automatically.
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
