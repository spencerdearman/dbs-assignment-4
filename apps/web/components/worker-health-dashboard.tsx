"use client";

import { startTransition, useEffect, useEffectEvent, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type { WorkerStatusRecord } from "@/lib/types";
import { formatRelativeTime } from "@/lib/weather";
import { formatSupabaseRequestError } from "@/lib/supabase-browser";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getWorkerHealth(status: WorkerStatusRecord | null) {
  if (!status) {
    return {
      label: "Failed",
      detail: "No worker status row is available yet.",
      tone: "text-red-600",
      accent: "rgba(190, 24, 93, 0.18)",
    };
  }

  const pollWindowMs = status.poll_interval_minutes * 60 * 1000;
  const now = Date.now();
  const lastSuccessMs = status.last_success_at
    ? new Date(status.last_success_at).getTime()
    : null;
  const lastRunMs = status.last_run_at ? new Date(status.last_run_at).getTime() : null;
  const consecutiveErrors = status.consecutive_error_count ?? (status.last_error ? 1 : 0);

  if (!lastSuccessMs) {
    return {
      label: "Failed",
      detail: status.last_error ?? "The worker has not completed a successful poll yet.",
      tone: "text-red-600",
      accent: "rgba(190, 24, 93, 0.18)",
    };
  }

  const successAgeMs = now - lastSuccessMs;

  if (consecutiveErrors > 0 || (lastRunMs && lastRunMs > lastSuccessMs + 1000)) {
    if (successAgeMs <= pollWindowMs * 2) {
      return {
        label: "Delayed",
        detail: status.last_error ?? "The latest poll has not fully recovered yet.",
        tone: "text-amber-600",
        accent: "rgba(245, 158, 11, 0.18)",
      };
    }

    return {
      label: "Failed",
      detail: status.last_error ?? "The worker is missing expected successful polls.",
      tone: "text-red-600",
      accent: "rgba(190, 24, 93, 0.18)",
    };
  }

  if (successAgeMs <= pollWindowMs * 2) {
    return {
      label: "Healthy",
      detail: `Worker is polling within the ${status.poll_interval_minutes}-minute target window.`,
      tone: "text-emerald-700",
      accent: "rgba(16, 185, 129, 0.16)",
    };
  }

  if (successAgeMs <= pollWindowMs * 4) {
    return {
      label: "Delayed",
      detail: "The worker is behind its normal polling window, but recent success still exists.",
      tone: "text-amber-600",
      accent: "rgba(245, 158, 11, 0.18)",
    };
  }

  return {
    label: "Failed",
    detail: "The worker has missed several expected polling windows.",
    tone: "text-red-600",
    accent: "rgba(190, 24, 93, 0.18)",
  };
}

export function WorkerHealthDashboard() {
  const { hasEnv, isReady, missingEnv, supabase } = useAuth();
  const [workerStatus, setWorkerStatus] = useState<WorkerStatusRecord | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useEffectEvent(async () => {
    if (!supabase) {
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: workerError } = await supabase
      .from("worker_status")
      .select("*")
      .eq("id", "open-meteo-worker")
      .maybeSingle();

    if (workerError) {
      setError(
        formatSupabaseRequestError(
          workerError.message || "Failed to load worker health.",
          "worker health",
        ),
      );
      setLoading(false);
      return;
    }

    startTransition(() => {
      setWorkerStatus(data ?? null);
      setLoading(false);
    });
  });

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel("worker-health")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "worker_status",
          filter: "id=eq.open-meteo-worker",
        },
        (payload) => {
          startTransition(() => {
            setWorkerStatus(payload.new as WorkerStatusRecord);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const health = useMemo(() => getWorkerHealth(workerStatus), [workerStatus]);

  if (!hasEnv) {
    return (
      <section className="py-8">
        <p className="eyebrow">Health</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Setup required</h2>
        <p className="mt-4 text-sm text-[var(--ink-soft)]">
          Missing: {missingEnv.join(", ")}
        </p>
      </section>
    );
  }

  if (!isReady || loading) {
    return (
      <section className="py-8">
        <p className="eyebrow">Health</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Loading worker status…</h2>
      </section>
    );
  }

  return (
    <section className="space-y-10 py-8">
      <div className="space-y-4 border-b border-t border-[var(--border)] py-8">
        <p className="eyebrow">Worker health</p>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-medium tracking-tight">Background polling monitor</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">
              Live operational health for the Railway worker that syncs Open-Meteo into Supabase.
            </p>
          </div>

          <div
            className="card-shell px-5 py-4"
            style={{ backgroundColor: health.accent }}
          >
            <p className="eyebrow mb-2">Current status</p>
            <div className={`text-3xl font-medium tracking-tight ${health.tone}`}>
              {health.label}
            </div>
            <p className="mt-2 max-w-sm text-sm text-[var(--ink)]">{health.detail}</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card-shell-strong px-6 py-4 text-sm text-[var(--ink)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="card-shell-strong p-5">
          <p className="eyebrow mb-3">Health</p>
          <div className={`text-3xl font-medium tracking-tight ${health.tone}`}>
            {health.label}
          </div>
        </article>
        <article className="card-shell-strong p-5">
          <p className="eyebrow mb-3">Last poll</p>
          <div className="text-2xl font-medium tracking-tight">
            {formatTimestamp(workerStatus?.last_run_at ?? null)}
          </div>
          <p className="mt-2 mono text-[0.65rem] tracking-wider text-[var(--ink-soft)]">
            {workerStatus?.last_run_at ? formatRelativeTime(workerStatus.last_run_at) : "No run yet"}
          </p>
        </article>
        <article className="card-shell-strong p-5">
          <p className="eyebrow mb-3">Last success</p>
          <div className="text-2xl font-medium tracking-tight">
            {formatTimestamp(workerStatus?.last_success_at ?? null)}
          </div>
          <p className="mt-2 mono text-[0.65rem] tracking-wider text-[var(--ink-soft)]">
            {workerStatus?.last_success_at
              ? formatRelativeTime(workerStatus.last_success_at)
              : "No successful sync yet"}
          </p>
        </article>
        <article className="card-shell-strong p-5">
          <p className="eyebrow mb-3">Consecutive errors</p>
          <div className="text-3xl font-medium tracking-tight">
            {workerStatus?.consecutive_error_count ?? (workerStatus?.last_error ? 1 : 0)}
          </div>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Poll interval {workerStatus?.poll_interval_minutes ?? 15} minutes
          </p>
        </article>
        <article className="card-shell-strong p-5">
          <p className="eyebrow mb-3">Source</p>
          <div className="text-2xl font-medium tracking-tight">
            {workerStatus?.source_name ?? "open-meteo"}
          </div>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Worker id {workerStatus?.id ?? "open-meteo-worker"}
          </p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="card-shell p-6">
          <p className="eyebrow mb-3">Latest worker message</p>
          <div className="text-lg font-medium tracking-tight">
            {workerStatus?.last_error ? "Latest warning or failure" : "No active worker errors"}
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
            {workerStatus?.last_error ??
              "The latest worker poll completed without a blocking error message."}
          </p>
        </article>

        <article className="card-shell p-6">
          <p className="eyebrow mb-3">How it works</p>
          <div className="space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
            <p>The Railway worker polls Open-Meteo on a fixed interval.</p>
            <p>Each run writes the newest conditions into Supabase weather snapshots.</p>
            <p>This page listens to the `worker_status` row through Supabase Realtime.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
