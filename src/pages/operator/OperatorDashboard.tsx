import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ActiveRidesMap from "@/components/ActiveRidesMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Users, CheckCircle, XCircle, BarChart3, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperatorRankingChannel } from "@/components/RankingChannel";

export default function OperatorDashboard() {
  const [rankingOpen, setRankingOpen] = useState(false);
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setRankingOpen(true)}>
          <Trophy className="h-3.5 w-3.5" />
          Rankings
        </Button>
      </div>
      <FleetView />
      <OperatorRankingChannel open={rankingOpen} onOpenChange={setRankingOpen} />
    </DashboardLayout>
  );
}

export function OperatorMap() {
  return <DashboardLayout fullScreen><ActiveRidesMap /></DashboardLayout>;
}

export function OperatorRiders() {
  return <DashboardLayout><RidersView /></DashboardLayout>;
}

export function OperatorReports() {
  return <DashboardLayout><ReportsView /></DashboardLayout>;
}

function FleetView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["fleet-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("vehicles").update({ is_verified: verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vehicle updated!" });
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
    },
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Fleet Management</h2>
      {isLoading ? <LoadingSkeleton /> : !vehicles?.length ? (
        <div className="glass-card p-8 text-center">
          <Car className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No vehicles registered</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {vehicles.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{v.make} {v.model} — {v.plate_number}</p>
                  <p className="text-xs text-muted-foreground">{v.color} {v.vehicle_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={v.is_verified
                    ? "bg-primary/10 text-primary border-primary/30 border text-[10px]"
                    : "bg-warning/10 text-warning border-warning/30 border text-[10px]"
                  }>
                    {v.is_verified ? "Verified" : "Pending"}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl"
                    onClick={() => verifyMutation.mutate({ id: v.id, verified: !v.is_verified })}
                  >
                    {v.is_verified ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-primary" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function RidersView() {
  const { data: riderProfiles, isLoading } = useQuery({
    queryKey: ["operator-riders"],
    queryFn: async () => {
      const { data: roles, error: roleErr } = await supabase.from("user_roles").select("user_id").eq("role", "rider" as any);
      if (roleErr) throw roleErr;
      if (!roles?.length) return [];
      const { data, error } = await supabase.from("profiles").select("*").in("user_id", roles.map((r) => r.user_id));
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Registered Riders</h2>
      {isLoading ? <LoadingSkeleton /> : !riderProfiles?.length ? (
        <div className="glass-card p-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No riders registered</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {riderProfiles.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                    {(r.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{r.phone || "No phone"}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsView() {
  const { data: rides } = useQuery({ queryKey: ["operator-reports"], queryFn: async () => { const { data, error } = await supabase.from("rides").select("*"); if (error) throw error; return data; } });
  const { data: vehicles } = useQuery({ queryKey: ["operator-vehicle-stats"], queryFn: async () => { const { data, error } = await supabase.from("vehicles").select("*"); if (error) throw error; return data; } });

  const stats = [
    { label: "Total Rides", value: rides?.length || 0 },
    { label: "Vehicles", value: vehicles?.length || 0 },
    { label: "Verified", value: vehicles?.filter(v => v.is_verified).length || 0 },
  ];

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Reports</h2>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }} className="glass-card p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card h-16 animate-pulse bg-secondary/50" />
      ))}
    </div>
  );
}
