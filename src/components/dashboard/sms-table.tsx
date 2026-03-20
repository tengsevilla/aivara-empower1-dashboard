"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency, formatDuration } from "@/lib/utils";
import type { SMSRecord, SMSPagination } from "@/types";

interface SMSTableProps {
  records: SMSRecord[];
  pagination: SMSPagination;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

function getStatusBadge(status: string, statusMessage: string) {
  const msg = statusMessage.toLowerCase();
  if (msg === "delivered" || status === "000") {
    return <Badge variant="success">Delivered</Badge>;
  }
  if (msg.includes("reject") || msg.includes("carrier")) {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  if (msg.includes("pending") || msg.includes("queue")) {
    return <Badge variant="warning">Pending</Badge>;
  }
  return <Badge variant="outline">{statusMessage || status}</Badge>;
}

export function SMSTable({
  records,
  pagination,
  onPageChange,
  isLoading,
}: SMSTableProps) {
  const { page, totalPages, pageSize, total } = pagination;
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  if (isLoading) {
    return <SMSTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)]/50">
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="hidden md:table-cell">Lead Source</TableHead>
              <TableHead className="hidden xl:table-cell">Executed At</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Cost</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Ingest Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-[var(--muted-foreground)]"
                >
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow key={record.guid}>
                  <TableCell>
                    {getStatusBadge(record.status, record.status_message)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{record.campaign_id || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-[var(--muted-foreground)] text-sm truncate max-w-[200px] block">
                      {record.lead_source || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                      {record.createdAt
                        ? new Date(record.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <span className="font-mono text-sm">
                      {record.lead_cost != null
                        ? formatCurrency(record.lead_cost)
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell">
                    <span className="font-mono text-sm text-[var(--muted-foreground)]">
                      {record.ingest_time != null
                        ? formatDuration(record.ingest_time)
                        : "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-[var(--muted-foreground)]">
          Showing{" "}
          <span className="font-medium text-[var(--foreground)]">
            {startRecord}–{endRecord}
          </span>{" "}
          of{" "}
          <span className="font-medium text-[var(--foreground)]">
            {total.toLocaleString()}
          </span>{" "}
          records
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`
                    inline-flex items-center justify-center w-8 h-8 rounded-md text-sm font-medium transition-colors
                    ${
                      pageNum === page
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] text-[var(--foreground)]"
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SMSTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)]/50">
              <TableHead>Status</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="hidden md:table-cell">Lead Source</TableHead>
              <TableHead className="hidden xl:table-cell">Executed At</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Cost</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Ingest Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }, (_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-9 w-48" />
      </div>
    </div>
  );
}
