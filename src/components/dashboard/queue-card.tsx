"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface BreakdownSection {
  label: string;
  data: Record<string, number>;
}

interface QueueCardProps {
  title: string;
  description: string;
  total: number;
  sections: BreakdownSection[];
  icon: React.ReactNode;
  accentColor: string; // tailwind bg class for the badge e.g. "bg-blue-100 text-blue-700"
}

export function QueueCard({ title, description, total, sections, icon, accentColor }: QueueCardProps) {
  const hasBreakdowns = sections.some((s) => Object.keys(s.data).length > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${accentColor}`}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <span className="text-3xl font-bold tabular-nums">
            {total.toLocaleString()}
          </span>
        </div>
      </CardHeader>

      {hasBreakdowns && (
        <CardContent className="pt-0 space-y-4">
          <div className="border-t border-[var(--border)]" />
          {sections.map((section) => {
            const entries = Object.entries(section.data);
            if (entries.length === 0) return null;
            return (
              <div key={section.label}>
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-2">
                  {section.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {entries.map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-md w-full"
                      style={{ backgroundColor: "color-mix(in srgb, var(--muted) 60%, transparent)" }}
                    >
                      <span className="text-sm font-medium truncate">{key}</span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 tabular-nums font-semibold"
                      >
                        {val.toLocaleString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

export function QueueCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="border-t border-[var(--border)]" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}
