import { useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useNetworks } from "@/hooks/useNetworks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, TrendingDown, CheckCircle, XCircle, Star, Clock, Loader2 } from "lucide-react";

const SLA_THRESHOLDS = {
  acceptance_rate: 70,
  completion_rate: 85,
  cancellation_rate: 15,
  avg_rating: 4.6,
};

export default function AdminKPI() {
  return <SidebarLayout><KPIView /></SidebarLayout>;
}

function KPIView() {
  const { data: networks } = useNetworks();
  const { data: rides, isLoading } = useQuery({
    queryKey: ["admin-kpi-rides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: ratings } = useQuery({
    queryKey: ["admin-kpi-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ratings").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Platform-wide KPI
  const platformKPI = useMemo(() => {
    if (!rides) return null;
    const total = rides.length;
    const completed = rides.filter(r => r.status === "completed").length;
    const cancelled = rides.filter(r => r.status === "cancelled").length;
    const accepted = rides.filter(r => r.rider_id).length;
    const avgRating = ratings?.length
      ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
      : 0;

    return {
      total_rides: total,
      acceptance_rate: total > 0 ? (accepted / total) * 100 : 0,
      completion_rate: total > 0 ? (completed / total) * 100 : 0,
      cancellation_rate: total > 0 ? (cancelled / total) * 100 : 0,
      avg_rating: avgRating,
    };
  }, [rides, ratings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" /> KPI & SLA Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-wide performance metrics vs SLA thresholds</p>
      </div>

      {/* SLA Thresholds legend */}
      <div className="glass-card p-4 mb-6">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">SLA Thresholds</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Acceptance ≥{SLA_THRESHOLDS.acceptance_rate}%</span>
          <span>Completion ≥{SLA_THRESHOLDS.completion_rate}%</span>
          <span>Cancellation ≤{SLA_THRESHOLDS.cancellation_rate}%</span>
          <span>Rating ≥{SLA_THRESHOLDS.avg_rating}/5.0</span>
        </div>
      </div>

      {/* Platform metrics */}
      {platformKPI && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            label="Acceptance Rate"
            value={`${platformKPI.acceptance_rate.toFixed(1)}%`}
            threshold={SLA_THRESHOLDS.acceptance_rate}
            actual={platformKPI.acceptance_rate}
            higher_is_better
          />
          <KPICard
            label="Completion Rate"
            value={`${platformKPI.completion_rate.toFixed(1)}%`}
            threshold={SLA_THRESHOLDS.completion_rate}
            actual={platformKPI.completion_rate}
            higher_is_better
          />
          <KPICard
            label="Cancellation Rate"
            value={`${platformKPI.cancellation_rate.toFixed(1)}%`}
            threshold={SLA_THRESHOLDS.cancellation_rate}
            actual={platformKPI.cancellation_rate}
            higher_is_better={false}
          />
          <KPICard
            label="Avg Rating"
            value={platformKPI.avg_rating.toFixed(2)}
            threshold={SLA_THRESHOLDS.avg_rating}
            actual={platformKPI.avg_rating}
            higher_is_better
          />
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Rides</p>
          <p className="text-2xl font-bold text-foreground mt-1">{platformKPI?.total_rides || 0}</p>
        </motion.div>
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Networks</p>
          <p className="text-2xl font-bold text-foreground mt-1">{networks?.length || 0}</p>
        </motion.div>
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Verified</p>
          <p className="text-2xl font-bold text-primary mt-1">{networks?.filter(n => n.status === "approved").length || 0}</p>
        </motion.div>
      </div>
    </div>
  );
}

function KPICard({ label, value, threshold, actual, higher_is_better }: {
  label: string;
  value: string;
  threshold: number;
  actual: number;
  higher_is_better: boolean;
}) {
  const passing = higher_is_better ? actual >= threshold : actual <= threshold;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card p-5 border ${passing ? "border-primary/20" : "border-destructive/30"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        {passing ? (
          <TrendingUp className="h-4 w-4 text-primary" />
        ) : (
          <TrendingDown className="h-4 w-4 text-destructive" />
        )}
      </div>
      <p className={`text-2xl font-bold ${passing ? "text-primary" : "text-destructive"}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">
        Target: {higher_is_better ? "≥" : "≤"}{threshold}
      </p>
    </motion.div>
  );
}
