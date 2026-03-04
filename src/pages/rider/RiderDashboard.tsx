import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MapboxMap from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, CheckCircle, Clock, DollarSign, Loader2, Star, Trophy, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { RiderRankingChannel } from "@/components/RankingChannel";
import { useRiderLocationTracker, useRiderDirectives, useUpdateDirective, type DispatchDirective } from "@/hooks/useRiderTracking";
import { useUnreadDMCount } from "@/hooks/useUnreadDMs";
import WalletCard from "@/components/WalletCard";

type RideStatus = "requested" | "accepted" | "en_route" | "picked_up" | "completed" | "cancelled";

const statusFlow: { from: RideStatus; to: RideStatus; label: string; icon: React.ElementType }[] = [
  { from: "accepted", to: "en_route", label: "Start En Route", icon: Navigation },
  { from: "en_route", to: "picked_up", label: "Picked Up Passenger", icon: CheckCircle },
  { from: "picked_up", to: "completed", label: "Complete Ride", icon: CheckCircle },
];

export default function RiderDashboard() {
  const [rankingOpen, setRankingOpen] = useState(false);
  const unreadCount = useUnreadDMCount();

  // Start tracking rider location
  useRiderLocationTracker(10000);

  return (
    <DashboardLayout fullScreen>
      <ActiveRideOrAvailable />
      {/* Dispatch directive banner */}
      <DirectiveBanner />
      {/* Floating ranking button */}
      <button
        onClick={() => setRankingOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex h-12 w-7 items-center justify-center rounded-l-lg bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        aria-label="My Ranking"
      >
        <span className="text-sm font-bold leading-none">H</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -left-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <RiderRankingChannel open={rankingOpen} onOpenChange={setRankingOpen} />
    </DashboardLayout>
  );
}

/** Shows dispatch directives from operator as a floating banner */
function DirectiveBanner() {
  const { data: directives } = useRiderDirectives();
  const updateDirective = useUpdateDirective();
  const { toast } = useToast();

  const activeDirective = directives?.[0];
  if (!activeDirective) return null;

  const handleAcknowledge = async () => {
    try {
      await updateDirective.mutateAsync({ id: activeDirective.id, status: "acknowledged" });
      toast({ title: "Directive acknowledged" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleComplete = async () => {
    try {
      await updateDirective.mutateAsync({ id: activeDirective.id, status: "completed" });
      toast({ title: "Directive completed!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-16 left-4 right-14 z-30"
      >
        <div className="glass-card border border-warning/30 bg-warning/5 p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-warning font-bold">Dispatch Directive</p>
              <p className="text-sm font-medium text-foreground mt-1">
                <MapPin className="inline h-3.5 w-3.5 text-primary mr-1" />
                {activeDirective.destination_address}
              </p>
              {activeDirective.instructions && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{activeDirective.instructions}"</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(activeDirective.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {activeDirective.status === "pending" ? (
              <Button
                size="sm"
                className="flex-1 rounded-xl text-xs h-8"
                onClick={handleAcknowledge}
                disabled={updateDirective.isPending}
              >
                {updateDirective.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Acknowledge
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1 rounded-xl text-xs h-8"
                onClick={handleComplete}
                disabled={updateDirective.isPending}
              >
                {updateDirective.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                Mark Complete
              </Button>
            )}
          </div>
          <Badge className="bg-secondary text-foreground border-border border text-[10px] capitalize">
            {activeDirective.status}
          </Badge>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function RiderTrips() {
  return <DashboardLayout><TripHistory /></DashboardLayout>;
}

export function RiderEarnings() {
  return <DashboardLayout><EarningsView /></DashboardLayout>;
}

function ActiveRideOrAvailable() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: mapboxToken } = useMapboxToken();

  const { data: activeRide, isLoading: loadingActive } = useQuery({
    queryKey: ["rider-active-ride", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*")
        .eq("rider_id", user!.id)
        .in("status", ["accepted", "en_route", "picked_up"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 3000,
  });

  const { data: availableRides, isLoading: loadingAvailable } = useQuery({
    queryKey: ["available-rides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*")
        .eq("status", "requested" as any).is("rider_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !activeRide,
    refetchInterval: 5000,
  });

  const acceptMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const { data, error } = await supabase.rpc("accept_ride", {
        _ride_id: rideId,
        _rider_id: user!.id,
      });
      if (error) throw error;
      if (data === false) throw new Error("Ride is no longer available");
    },
    onSuccess: () => {
      toast({ title: "Ride accepted!" });
      queryClient.invalidateQueries({ queryKey: ["rider-active-ride"] });
      queryClient.invalidateQueries({ queryKey: ["available-rides"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const advanceMutation = useMutation({
    mutationFn: async ({ rideId, newStatus }: { rideId: string; newStatus: RideStatus }) => {
      const updates: Record<string, any> = { status: newStatus as any };
      if (newStatus === "en_route") updates.started_at = new Date().toISOString();
      if (newStatus === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("rides").update(updates).eq("id", rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ride updated!" });
      queryClient.invalidateQueries({ queryKey: ["rider-active-ride"] });
    },
  });

  // Rider's own GPS position (live)
  const [riderPos, setRiderPos] = useState<[number, number] | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const wid = navigator.geolocation.watchPosition(
      (pos) => setRiderPos([pos.coords.longitude, pos.coords.latitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(wid);
  }, []);

  // Route: rider → pickup (accepted/en_route) or rider → dropoff (picked_up)
  const [routeCoords, setRouteCoords] = useState<[number, number][] | undefined>(undefined);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  useEffect(() => {
    if (!mapboxToken || !riderPos || !activeRide) {
      setRouteCoords(undefined);
      setRouteInfo(null);
      return;
    }

    let destCoords: [number, number] | null = null;
    if (activeRide.status === "picked_up") {
      if (activeRide.dropoff_lat && activeRide.dropoff_lng)
        destCoords = [activeRide.dropoff_lng, activeRide.dropoff_lat];
    } else {
      if (activeRide.pickup_lat && activeRide.pickup_lng)
        destCoords = [activeRide.pickup_lng, activeRide.pickup_lat];
    }

    if (!destCoords) { setRouteCoords(undefined); setRouteInfo(null); return; }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${riderPos[0]},${riderPos[1]};${destCoords![0]},${destCoords![1]}?geometries=geojson&overview=full&access_token=${mapboxToken}`
        );
        const data = await res.json();
        if (!cancelled && data.routes?.[0]) {
          setRouteCoords(data.routes[0].geometry.coordinates);
          setRouteInfo({
            distanceKm: data.routes[0].distance / 1000,
            durationMin: Math.ceil(data.routes[0].duration / 60),
          });
        }
      } catch {
        if (!cancelled) { setRouteCoords(undefined); setRouteInfo(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [mapboxToken, riderPos?.[0], riderPos?.[1], activeRide?.id, activeRide?.status]);

  // Build markers
  const markers = [
    ...(riderPos ? [{ id: "rider-self", lng: riderPos[0], lat: riderPos[1], color: "#3b82f6", label: "You 🏍️" }] : []),
    ...(activeRide?.pickup_lat && activeRide?.pickup_lng
      ? [{ id: "pickup", lng: activeRide.pickup_lng, lat: activeRide.pickup_lat, color: "#22c55e", label: "Pickup" }] : []),
    ...(activeRide?.dropoff_lat && activeRide?.dropoff_lng
      ? [{ id: "dropoff", lng: activeRide.dropoff_lng, lat: activeRide.dropoff_lat, color: "#f59e0b", label: "Dropoff" }] : []),
    ...((!activeRide && availableRides) ? availableRides.filter(r => r.pickup_lat && r.pickup_lng).map(r => ({
      id: r.id, lng: r.pickup_lng!, lat: r.pickup_lat!, color: "#4facfe", label: r.pickup_address,
    })) : []),
  ];

  if (loadingActive) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="relative flex h-[calc(100dvh-56px)] flex-col">
      <MapboxMap className="absolute inset-0" markers={markers} routeCoords={routeCoords} />

      {/* Status bar overlay */}
      <div className="map-gradient-top pointer-events-none absolute top-0 left-0 right-0 h-16 z-10" />

      {activeRide && (
        <div className="absolute top-3 left-4 right-4 z-20">
          <div className="glass-card flex items-center gap-2 px-3 py-2">
            <span className="pulse-dot" />
            <span className="text-xs font-medium text-foreground capitalize">
              {(activeRide.status as string).replace("_", " ")}
            </span>
            {routeInfo && (
              <span className="ml-auto text-xs text-muted-foreground">
                {routeInfo.distanceKm.toFixed(1)} km · ~{routeInfo.durationMin} min
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottom sheet */}
      <div className="relative z-20 mt-auto">
        <div className="map-gradient-bottom pt-16 pb-20">
          {activeRide ? (
            <ActiveTripCard ride={activeRide} advanceMutation={advanceMutation} routeInfo={routeInfo} />
          ) : (
            <AvailableRidesSheet rides={availableRides || []} onAccept={(id) => acceptMutation.mutate(id)} accepting={acceptMutation.isPending} />
          )}
        </div>
      </div>
    </div>
  );
}

function ActiveTripCard({ ride, advanceMutation }: { ride: any; advanceMutation: any }) {
  const nextStep = statusFlow.find((s) => s.from === ride.status);

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="mx-4">
      <div className="glass-card p-5">
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium text-foreground">{ride.pickup_address}</p>
            </div>
          </div>
          <div className="ml-1 h-3 border-l border-dashed border-border" />
          <div className="flex items-start gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dropoff</p>
              <p className="text-sm font-medium text-foreground">{ride.dropoff_address}</p>
            </div>
          </div>
        </div>

        {ride.fare && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
            <span className="text-xs text-muted-foreground">Fare</span>
            <span className="text-lg font-bold text-primary">₱{Number(ride.fare).toFixed(2)}</span>
          </div>
        )}

        {nextStep && (
          <Button
            className="h-12 w-full rounded-xl text-sm font-semibold"
            onClick={() => advanceMutation.mutate({ rideId: ride.id, newStatus: nextStep.to })}
            disabled={advanceMutation.isPending}
          >
            {advanceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <nextStep.icon className="mr-2 h-4 w-4" />}
            {nextStep.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function AvailableRidesSheet({ rides, onAccept, accepting }: { rides: any[]; onAccept: (id: string) => void; accepting: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="mx-4">
      {!rides.length ? (
        <div className="glass-card p-6 text-center">
          <Clock className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No rides available</p>
          <p className="mt-1 text-xs text-muted-foreground">New requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-bold text-foreground">Available Rides</p>
            <Badge className="bg-primary/10 text-primary border-primary/20 border text-[10px]">
              {rides.length} nearby
            </Badge>
          </div>
          {rides.slice(0, 5).map((ride, i) => (
            <motion.div
              key={ride.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="truncate text-sm font-medium text-foreground">{ride.pickup_address}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Navigation className="h-3.5 w-3.5 shrink-0 text-warning" />
                    <p className="truncate text-xs text-muted-foreground">{ride.dropoff_address}</p>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {new Date(ride.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <Button
                  onClick={() => onAccept(ride.id)}
                  disabled={accepting}
                  size="sm"
                  className="shrink-0 rounded-xl px-5"
                >
                  Accept
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function TripHistory() {
  const { user } = useAuth();
  const { data: trips, isLoading } = useQuery({
    queryKey: ["rider-trips", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*").eq("rider_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Trip History</h2>
      {isLoading ? <LoadingSkeleton /> : !trips?.length ? (
        <div className="glass-card p-8 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No trips yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {trips.map((trip, i) => (
            <motion.div key={trip.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{trip.pickup_address}</p>
                  <p className="truncate text-xs text-muted-foreground">→ {trip.dropoff_address}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge className="border bg-secondary text-foreground border-border text-[10px] capitalize">
                    {(trip.status as string).replace("_", " ")}
                  </Badge>
                  {trip.fare && <p className="mt-1 text-sm font-bold text-primary">₱{Number(trip.fare).toFixed(2)}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function EarningsView() {
  const { user } = useAuth();
  const { data: completedTrips } = useQuery({
    queryKey: ["rider-earnings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*").eq("rider_id", user!.id).eq("status", "completed" as any).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalEarnings = completedTrips?.reduce((sum, t) => sum + Number(t.fare || 0), 0) || 0;
  const todayEarnings = completedTrips
    ?.filter((t) => new Date(t.completed_at!).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + Number(t.fare || 0), 0) || 0;

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Earnings</h2>

      {/* Wallet */}
      <div className="mb-4">
        <WalletCard />
      </div>

      {/* Main earnings card */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card mb-4 p-5 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Today's Earnings</p>
        <p className="mt-1 text-3xl font-bold text-primary">₱{todayEarnings.toFixed(2)}</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="mt-1 text-xl font-bold text-foreground">₱{totalEarnings.toFixed(2)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trips</p>
          <p className="mt-1 text-xl font-bold text-foreground">{completedTrips?.length || 0}</p>
        </div>
      </div>

      {completedTrips && completedTrips.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent</p>
          <div className="space-y-2">
            {completedTrips.slice(0, 10).map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="glass-card flex items-center justify-between p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{t.pickup_address} → {t.dropoff_address}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.completed_at!).toLocaleString()}</p>
                </div>
                <p className="shrink-0 ml-3 font-bold text-primary">₱{Number(t.fare).toFixed(2)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card h-20 animate-pulse bg-secondary/50" />
      ))}
    </div>
  );
}
