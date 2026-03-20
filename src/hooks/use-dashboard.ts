"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardData } from "@/types";

const DASHBOARD_API = "/api/dashboard";
const REFRESH_INTERVAL = 60_000; // 60 seconds

interface UseDashboardReturn {
  data: DashboardData | null;
  error: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const res = await fetch(DASHBOARD_API, {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      // API returns array: [{ rvm_data }, { sms_data }, { sms_inbound_data }, { sms_queue_data }, { rvm_queue_data }]
      const raw = await res.json();
      const rvmRaw      = raw[0]?.rvm_data        ?? {};
      const smsRaw      = raw[1]?.sms_data         ?? {};
      const inboundRaw  = raw[2]?.sms_inbound_data ?? {};
      const smsQueueRaw = raw[3]?.sms_queue_data   ?? {};
      const rvmQueueRaw = raw[4]?.rvm_queue_data   ?? {};

      const normalized: DashboardData = {
        rvm: {
          completed:          rvmRaw.success       ?? 0,
          failed:             rvmRaw.failure        ?? 0,
          queued:             rvmRaw.queue          ?? 0,
          total:              rvmRaw.total_rvm      ?? 0,
          total_cost:         rvmRaw.total_cost     ?? 0,
          campaign_breakdown: rvmRaw.campaign_breakdown ?? {},
          failure_reasons:    rvmRaw.reasons        ?? {},
        },
        sms_outbound: {
          total:              smsRaw.total_messages               ?? 0,
          delivered:          smsRaw.status_breakdown?.delivered  ?? 0,
          carrier_rejected:   smsRaw.status_breakdown?.carrier_rejected ?? 0,
          message_sent:       smsRaw.status_breakdown?.message_sent     ?? 0,
          failed:             smsRaw.status_breakdown?.failed           ?? 0,
          total_cost:         smsRaw.total_cost                  ?? 0,
          campaign_breakdown: smsRaw.campaign_breakdown          ?? {},
        },
        sms_inbound: {
          total: inboundRaw.total_received ?? 0,
          sentiment: {
            dnc:      inboundRaw.status_reason_counts?.DNC            ?? 0,
            positive: inboundRaw.status_reason_counts?.POSITIVE       ?? 0,
            neutral:  inboundRaw.status_reason_counts?.NEUTRAL        ?? 0,
            negative: inboundRaw.status_reason_counts?.NEGATIVE       ?? 0,
            invalid:  inboundRaw.status_reason_counts?.INVALID_NUMBER ?? 0,
          },
        },
        sms_queue: {
          total_queued:       smsQueueRaw.total_queued       ?? 0,
          campaign_breakdown: smsQueueRaw.campaign_breakdown ?? {},
          carrier_breakdown:  smsQueueRaw.carrier_breakdown  ?? {},
          action_breakdown:   smsQueueRaw.action_breakdown   ?? {},
        },
        rvm_queue: {
          total_queued:       rvmQueueRaw.total_queued       ?? 0,
          campaign_breakdown: rvmQueueRaw.campaign_breakdown ?? {},
        },
      };

      setData(normalized);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { data, error, isLoading, isRefreshing, lastUpdated, refresh };
}
