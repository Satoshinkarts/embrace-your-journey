import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MapboxMap from "@/components/MapboxMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, Users, CheckCircle, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RideStatus = "requested" | "accepted" | "en_route" | "picked_up" | "completed" | "cancelled";

export default function DispatcherDashboard() {
  return <DashboardLayout fullScreen><MonitorView /></DashboardLayout>;
}

export function DispatcherAssign() {
  return <DashboardLayout><AssignView /></DashboardLayout>;
}

export function DispatcherStats() {
  return <DashboardLayout><StatsView /></DashboardLayout>;
}

function MonitorView() {
  const { data: rides } = useQuery({
    queryKey: ["dispatcher-all-rides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const statusColor: Record<string, string> = {
    requested: "bg-warning/10 text-warning border-warning/30",
    accepted: "bg-info/10 text-info border-info/30",
    en_route: "bg-info/10 text-info border-info/30",
    picked_up: "bg-primary/10 text-primary border-primary/30",
    completed: "bg-primary/10 text-primary border-primary/30",
    cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  };

  const activeRides = rides?.filter(r => ["requested", "accepted", "en_route", "picked_up"].includes(r.status)) || [];
  const markers = activeRides.filter(r => r.pickup_lat && r.pickup_lng).map(r => ({
    id: r.id,
    lng: r.pickup_lng!,
    lat: r.pickup_lat!,
    color: r.status === "requested" ? "#f59e0b" : "#4facfe",
    label: `${r.pickup_address} (${r.status})`,
  }));

  return (
    <div className="relative flex h-[calc(100dvh-56px)] flex-col">
      <MapboxMap className="absolute inset-0" markers={markers} />

      <div className="absolute top-3 left-4 right-4 z-20">
        <div className="glass-card flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="pulse-dot" />
            <span className="text-xs font-medium text-foreground">Live Monitor</span>
          </div>
          <Badge className="bg-secondary text-foreground border-border border text-[10px]">
            {activeRides.length} active
          </Badge>
        </div>
      </div>

      <div className="relative z-20 mt-auto">
        <div className="map-gradient-bottom pt-8 pb-20">
          <div className="mx-4 space-y-2 max-h-48 overflow-y-auto">
            {rides?.slice(0, 8).map((ride, i) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{ride.pickup_address} → {ride.dropoff_address}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(ride.created_at).toLocaleTimeString()}</p>
                  </div>
                  <Badge className={`${statusColor[ride.status] || "bg-secondary text-foreground"} border text-[10px] capitalize shrink-0`}>
                    {(ride.status as string).replace("_", " ")}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unassignedRides } = useQuery({
    queryKey: ["unassigned-rides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*").eq("status", "requested" as any).is("rider_id", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: riders } = useQuery({
    queryKey: ["available-riders"],
    queryFn: async () => {
      const { data: roleData, error } = await supabase.from("user_roles").select("user_id").eq("role", "rider" as any);
      if (error) throw error;
      if (!roleData?.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("*").in("user_id", roleData.map((r) => r.user_id));
      return profiles || [];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ rideId, riderId }: { rideId: string; riderId: string }) => {
      // Get ride distance for fare calculation
      const { data: ride } = await supabase.from("rides").select("distance_km").eq("id", rideId).single();
      const distanceKm = ride?.distance_km ?? 3;
      const fare = 40 + Number(distanceKm) * 10;
      const { error } = await supabase.from("rides").update({
        rider_id: riderId, status: "accepted" as any,
        fare: Math.round(fare * 100) / 100,
      }).eq("id", rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rider assigned!" });
      queryClient.invalidateQueries({ queryKey: ["unassigned-rides"] });
    },
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Assign Riders</h2>
      {!unassignedRides?.length ? (
        <div className="glass-card p-8 text-center">
          <CheckCircle className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">All rides are assigned!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unassignedRides.map((ride, i) => (
            <motion.div key={ride.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
              <p className="text-sm font-medium text-foreground">{ride.pickup_address} → {ride.dropoff_address}</p>
              <p className="text-[10px] text-muted-foreground mb-3">{new Date(ride.created_at).toLocaleString()}</p>
              {riders && riders.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {riders.map((rider) => (
                    <Button key={rider.user_id} size="sm" variant="outline" className="rounded-xl text-xs"
                      onClick={() => assignMutation.mutate({ rideId: ride.id, riderId: rider.user_id })}
                      disabled={assignMutation.isPending}
                    >
                      <Users className="mr-1 h-3 w-3" />
                      {rider.full_name || "Rider"}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No riders available</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsView() {
  const { data: rides } = useQuery({
    queryKey: ["dispatcher-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*");
      if (error) throw error;
      return data;
    },
  });

  const total = rides?.length || 0;
  const completed = rides?.filter((r) => r.status === "completed").length || 0;
  const active = rides?.filter((r) => ["requested", "accepted", "en_route", "picked_up"].includes(r.status)).length || 0;
  const revenue = rides?.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.fare || 0), 0) || 0;

  const stats = [
    { label: "Total Rides", value: total, color: "text-foreground" },
    { label: "Active Now", value: active, color: "text-info" },
    { label: "Completed", value: completed, color: "text-primary" },
    { label: "Revenue", value: `₱${revenue.toFixed(0)}`, color: "text-foreground" },
  ];

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Statistics</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }} className="glass-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
