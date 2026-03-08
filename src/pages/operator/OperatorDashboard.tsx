import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ActiveRidesMap from "@/components/ActiveRidesMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Car, Users, CheckCircle, XCircle, BarChart3, Trophy, MapPin,
  Clock, Navigation, Loader2, UserCheck, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperatorRankingChannel } from "@/components/RankingChannel";
import OperatorLiveMap from "@/components/OperatorLiveMap";
import { useUnreadDMCount } from "@/hooks/useUnreadDMs";

export default function OperatorDashboard() {
  const [rankingOpen, setRankingOpen] = useState(false);
  const unreadCount = useUnreadDMCount();
  return (
    <SidebarLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5 relative" onClick={() => setRankingOpen(true)}>
          <Trophy className="h-3.5 w-3.5" />
          Rankings
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Main dashboard tabs: Rides / Fleet */}
      <Tabs defaultValue="rides" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="rides" className="flex-1 gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Rides
          </TabsTrigger>
          <TabsTrigger value="fleet" className="flex-1 gap-1.5">
            <Car className="h-3.5 w-3.5" />
            Fleet
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rides">
          <RideMonitorView />
        </TabsContent>
        <TabsContent value="fleet">
          <FleetView />
        </TabsContent>
      </Tabs>

      <OperatorRankingChannel open={rankingOpen} onOpenChange={setRankingOpen} />
    </SidebarLayout>
  );
}

export function OperatorMap() {
  return <SidebarLayout fullScreen><OperatorLiveMap /></SidebarLayout>;
}

export function OperatorRiders() {
  return <SidebarLayout><RidersView /></SidebarLayout>;
}

export function OperatorReports() {
  return <SidebarLayout><ReportsView /></SidebarLayout>;
}

/* ─── Ride Monitor View ─── */

function RideMonitorView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending" | "active" | "recent">("pending");

  const { data: allRides, isLoading } = useQuery({
    queryKey: ["operator-rides-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  // Realtime subscription for ride updates
  useEffect(() => {
    const channel = supabase
      .channel("operator-rides-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rides" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["operator-rides-monitor"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Fetch riders for assignment
  const { data: riders } = useQuery({
    queryKey: ["operator-available-riders"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "rider" as any);
      if (error) throw error;
      if (!roles?.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", roles.map(r => r.user_id));

      // Also fetch online status
      const { data: locations } = await supabase
        .from("rider_locations")
        .select("rider_id, is_online")
        .in("rider_id", roles.map(r => r.user_id));

      const onlineMap = new Map((locations || []).map(l => [l.rider_id, l.is_online]));

      return (profiles || []).map(p => ({
        ...p,
        is_online: onlineMap.get(p.user_id) || false,
      }));
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ rideId, riderId }: { rideId: string; riderId: string }) => {
      const { data: ride } = await supabase.from("rides").select("distance_km").eq("id", rideId).single();
      const distanceKm = ride?.distance_km ?? 3;
      const fare = 40 + Number(distanceKm) * 10;
      const { error } = await supabase.from("rides").update({
        rider_id: riderId,
        status: "accepted" as any,
        fare: Math.round(fare * 100) / 100,
      }).eq("id", rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rider assigned!" });
      queryClient.invalidateQueries({ queryKey: ["operator-rides-monitor"] });
    },
    onError: (err: any) => toast({ title: "Error assigning rider", description: err.message, variant: "destructive" }),
  });

  const pendingRides = allRides?.filter(r => r.status === "requested" && !r.rider_id) || [];
  const activeRides = allRides?.filter(r => ["accepted", "en_route", "picked_up"].includes(r.status)) || [];
  const recentRides = allRides?.filter(r => ["completed", "cancelled"].includes(r.status)).slice(0, 20) || [];

  const statusColor: Record<string, string> = {
    requested: "bg-warning/10 text-warning border-warning/30",
    accepted: "bg-info/10 text-info border-info/30",
    en_route: "bg-info/10 text-info border-info/30",
    picked_up: "bg-primary/10 text-primary border-primary/30",
    completed: "bg-primary/10 text-primary border-primary/30",
    cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  };

  // Quick stats
  const stats = [
    { label: "Pending", value: pendingRides.length, color: "text-warning" },
    { label: "Active", value: activeRides.length, color: "text-info" },
    { label: "Completed", value: allRides?.filter(r => r.status === "completed").length || 0, color: "text-primary" },
    { label: "Cancelled", value: allRides?.filter(r => r.status === "cancelled").length || 0, color: "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="glass-card p-3 text-center"
          >
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1.5 rounded-xl bg-secondary/50 p-1">
        {([
          { key: "pending" as const, label: "Pending", count: pendingRides.length },
          { key: "active" as const, label: "Active", count: activeRides.length },
          { key: "recent" as const, label: "Recent", count: recentRides.length },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-2.5">
          {tab === "pending" && (
            pendingRides.length === 0 ? (
              <div className="glass-card p-6 text-center">
                <CheckCircle className="mx-auto mb-2 h-7 w-7 text-primary" />
                <p className="text-sm text-muted-foreground">No pending rides</p>
              </div>
            ) : (
              pendingRides.map((ride, i) => (
                <PendingRideCard
                  key={ride.id}
                  ride={ride}
                  riders={riders || []}
                  onAssign={(riderId) => assignMutation.mutate({ rideId: ride.id, riderId })}
                  assigning={assignMutation.isPending}
                  index={i}
                />
              ))
            )
          )}

          {tab === "active" && (
            activeRides.length === 0 ? (
              <div className="glass-card p-6 text-center">
                <Clock className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No active rides</p>
              </div>
            ) : (
              activeRides.map((ride, i) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <p className="truncate text-sm font-medium text-foreground">{ride.pickup_address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation className="h-3.5 w-3.5 text-warning shrink-0" />
                        <p className="truncate text-xs text-muted-foreground">{ride.dropoff_address}</p>
                      </div>
                      {ride.fare && (
                        <p className="mt-1.5 text-xs font-semibold text-primary">₱{Number(ride.fare).toFixed(2)}</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {new Date(ride.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge className={`${statusColor[ride.status] || "bg-secondary text-foreground"} border text-[10px] capitalize shrink-0`}>
                      {(ride.status as string).replace("_", " ")}
                    </Badge>
                  </div>
                </motion.div>
              ))
            )
          )}

          {tab === "recent" && (
            recentRides.length === 0 ? (
              <div className="glass-card p-6 text-center">
                <Clock className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No recent rides</p>
              </div>
            ) : (
              recentRides.map((ride, i) => (
                <motion.div
                  key={ride.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{ride.pickup_address} → {ride.dropoff_address}</p>
                      {ride.fare && (
                        <p className="text-xs font-semibold text-primary mt-0.5">₱{Number(ride.fare).toFixed(2)}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(ride.created_at).toLocaleDateString()} · {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge className={`${statusColor[ride.status] || "bg-secondary text-foreground"} border text-[10px] capitalize shrink-0`}>
                      {(ride.status as string).replace("_", " ")}
                    </Badge>
                  </div>
                </motion.div>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}

function PendingRideCard({
  ride,
  riders,
  onAssign,
  assigning,
  index,
}: {
  ride: any;
  riders: Array<{ user_id: string; full_name: string | null; phone: string | null; is_online: boolean }>;
  onAssign: (riderId: string) => void;
  assigning: boolean;
  index: number;
}) {
  const [showRiders, setShowRiders] = useState(false);
  const onlineRiders = riders.filter(r => r.is_online);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="truncate text-sm font-medium text-foreground">{ride.pickup_address}</p>
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="h-3.5 w-3.5 text-warning shrink-0" />
            <p className="truncate text-xs text-muted-foreground">{ride.dropoff_address}</p>
          </div>
          {ride.distance_km && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              ~{Number(ride.distance_km).toFixed(1)} km · est. ₱{(40 + Number(ride.distance_km) * 10).toFixed(0)}
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {new Date(ride.created_at).toLocaleTimeString()}
          </p>
        </div>
        <Badge className="bg-warning/10 text-warning border-warning/30 border text-[10px] shrink-0">
          Pending
        </Badge>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-xl text-xs gap-1.5"
        onClick={() => setShowRiders(!showRiders)}
      >
        <UserCheck className="h-3.5 w-3.5" />
        {showRiders ? "Hide Riders" : `Assign Rider (${onlineRiders.length} online)`}
      </Button>

      <AnimatePresence>
        {showRiders && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5">
              {onlineRiders.length === 0 ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30">
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No riders online</p>
                </div>
              ) : (
                onlineRiders.map(rider => (
                  <div key={rider.user_id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(rider.full_name || "?")[0].toUpperCase()}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{rider.full_name || "Rider"}</p>
                        {rider.phone && <p className="text-[10px] text-muted-foreground">{rider.phone}</p>}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="h-7 px-3 rounded-lg text-[10px]"
                      onClick={() => onAssign(rider.user_id)}
                      disabled={assigning}
                    >
                      {assigning ? <Loader2 className="h-3 w-3 animate-spin" /> : "Assign"}
                    </Button>
                  </div>
                ))
              )}

              {/* Also show offline riders in collapsed section */}
              {riders.filter(r => !r.is_online).length > 0 && (
                <p className="text-[10px] text-muted-foreground px-2 pt-1">
                  {riders.filter(r => !r.is_online).length} riders offline
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Fleet View ─── */

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
      {isLoading ? <LoadingSkeleton /> : !vehicles?.length ? (
        <div className="glass-card p-8 text-center">
          <Car className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No vehicles registered</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-4">
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
                    onClick={() => verifyMutation.mutate({ id: v.id, verified: !v.is_verified })}>
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

/* ─── Riders View ─── */

function RidersView() {
  const { data: riderProfiles, isLoading } = useQuery({
    queryKey: ["operator-riders"],
    queryFn: async () => {
      const { data: roles, error: roleErr } = await supabase.from("user_roles").select("user_id").eq("role", "rider" as any);
      if (roleErr) throw roleErr;
      if (!roles?.length) return [];

      const [profilesRes, locationsRes] = await Promise.all([
        supabase.from("profiles").select("*").in("user_id", roles.map(r => r.user_id)),
        supabase.from("rider_locations").select("rider_id, is_online, last_seen_at").in("rider_id", roles.map(r => r.user_id)),
      ]);

      const locMap = new Map((locationsRes.data || []).map(l => [l.rider_id, l]));

      return (profilesRes.data || []).map(p => ({
        ...p,
        is_online: locMap.get(p.user_id)?.is_online || false,
        last_seen: locMap.get(p.user_id)?.last_seen_at || null,
      }));
    },
    refetchInterval: 10000,
  });

  // Realtime for rider location status changes
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("operator-rider-locations-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rider_locations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["operator-riders"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const onlineRiders = riderProfiles?.filter(r => r.is_online) || [];
  const offlineRiders = riderProfiles?.filter(r => !r.is_online) || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Registered Riders</h2>
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 border text-[10px]">
            {onlineRiders.length} online
          </Badge>
          <Badge className="bg-secondary text-muted-foreground border-border border text-[10px]">
            {offlineRiders.length} offline
          </Badge>
        </div>
      </div>

      {isLoading ? <LoadingSkeleton /> : !riderProfiles?.length ? (
        <div className="glass-card p-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No riders registered</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Online riders first */}
          {[...onlineRiders, ...offlineRiders].map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                      {(r.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                      r.is_online ? "bg-primary" : "bg-muted-foreground"
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.full_name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{r.phone || "No phone"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {r.is_online ? "Online now" : r.last_seen ? `Last seen ${new Date(r.last_seen).toLocaleTimeString()}` : "Never online"}
                    </p>
                  </div>
                </div>
                <Badge className={`border text-[10px] ${r.is_online ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"}`}>
                  {r.is_online ? "Online" : "Offline"}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Reports View ─── */

function ReportsView() {
  const { data: rides } = useQuery({
    queryKey: ["operator-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: vehicles } = useQuery({
    queryKey: ["operator-vehicle-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const completedRides = rides?.filter(r => r.status === "completed") || [];
  const revenue = completedRides.reduce((s, r) => s + Number(r.fare || 0), 0);

  const stats = [
    { label: "Total Rides", value: rides?.length || 0 },
    { label: "Completed", value: completedRides.length },
    { label: "Revenue", value: `₱${revenue.toFixed(0)}` },
    { label: "Vehicles", value: vehicles?.length || 0 },
    { label: "Verified", value: vehicles?.filter(v => v.is_verified).length || 0 },
    { label: "Cancelled", value: rides?.filter(r => r.status === "cancelled").length || 0 },
  ];

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Reports</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }} className="glass-card p-5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => <div key={i} className="glass-card h-20 animate-pulse bg-secondary/50" />)}
    </div>
  );
}
