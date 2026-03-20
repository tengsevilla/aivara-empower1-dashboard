"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardData } from "@/types";

const COLORS = [
  "#64b5d0",
  "#4e8fa0",
  "#7dcad8",
  "#72c0d0",
  "#93d4df",
  "#e0a875",
  "#d97d5a",
];

interface OverviewChartsProps {
  data: DashboardData;
}

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  borderRadius: "0.5rem",
  color: "var(--popover-foreground)",
};

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight="600"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function legendFormatter(value: string) {
  return <span style={{ color: "var(--foreground)", fontSize: "12px" }}>{value}</span>;
}

export function OverviewCharts({ data }: OverviewChartsProps) {
  // SMS Delivery Pie
  const smsDeliveryData = [
    { name: "Delivered",       value: data.sms_outbound.delivered },
    { name: "Carrier Rejected",value: data.sms_outbound.carrier_rejected },
    { name: "Message Sent",    value: data.sms_outbound.message_sent },
    { name: "Failed",          value: data.sms_outbound.failed },
  ].filter((d) => d.value > 0);

  // RVM Status Pie
  const rvmStatusData = [
    { name: "Completed", value: data.rvm.completed },
    { name: "Failed",    value: data.rvm.failed },
    { name: "Queued",    value: data.rvm.queued },
    {
      name: "Other",
      value: Math.max(0, data.rvm.total - data.rvm.completed - data.rvm.failed - data.rvm.queued),
    },
  ].filter((d) => d.value > 0);

  // Inbound Sentiment Bar
  const sentimentData = [
    { name: "DNC",      value: data.sms_inbound.sentiment.dnc },
    { name: "Positive", value: data.sms_inbound.sentiment.positive },
    { name: "Neutral",  value: data.sms_inbound.sentiment.neutral },
    { name: "Negative", value: data.sms_inbound.sentiment.negative },
    { name: "Invalid",  value: data.sms_inbound.sentiment.invalid },
  ];

  // RVM Failure Reasons
  const failureReasons = Object.entries(data.rvm.failure_reasons)
    .map(([key, val]) => ({
      name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: val ?? 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // SMS Campaign Breakdown
  const smsCampaignData = Object.entries(data.sms_outbound.campaign_breakdown)
    .map(([key, val]) => ({ name: key, value: val }))
    .sort((a, b) => b.value - a.value);

  // RVM Campaign Breakdown
  const rvmCampaignData = Object.entries(data.rvm.campaign_breakdown)
    .map(([key, val]) => ({ name: key, value: val }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* SMS Delivery Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SMS Delivery Status</CardTitle>
          <CardDescription>Outbound SMS breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={smsDeliveryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={90}
                dataKey="value"
              >
                {smsDeliveryData.map((entry, index) => (
                  <Cell key={`sms-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value.toLocaleString(), ""]} contentStyle={tooltipStyle} />
              <Legend formatter={legendFormatter} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* RVM Status Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">RVM Status</CardTitle>
          <CardDescription>Voicemail delivery breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={rvmStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={90}
                dataKey="value"
              >
                {rvmStatusData.map((entry, index) => (
                  <Cell key={`rvm-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value.toLocaleString(), ""]} contentStyle={tooltipStyle} />
              <Legend formatter={legendFormatter} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Inbound Sentiment Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inbound SMS Sentiment</CardTitle>
          <CardDescription>Response sentiment categories</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sentimentData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => [value.toLocaleString(), "Count"]} contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {sentimentData.map((entry, index) => (
                  <Cell key={`sentiment-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SMS Campaign Breakdown */}
      {smsCampaignData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SMS Campaign Breakdown</CardTitle>
            <CardDescription>Messages sent per campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={smsCampaignData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), "Messages"]} contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* RVM Campaign Breakdown */}
      {rvmCampaignData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RVM Campaign Breakdown</CardTitle>
            <CardDescription>Voicemails sent per campaign</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rvmCampaignData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), "Voicemails"]} contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* RVM Failure Reasons */}
      {failureReasons.length > 0 && (
        <Card className={smsCampaignData.length > 0 || rvmCampaignData.length > 0 ? "" : "lg:col-span-3"}>
          <CardHeader>
            <CardTitle className="text-base">RVM Failure Reasons</CardTitle>
            <CardDescription>Breakdown of failed voicemail deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={failureReasons} margin={{ top: 0, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => [value.toLocaleString(), "Count"]} contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function OverviewChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-3 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[240px] w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
