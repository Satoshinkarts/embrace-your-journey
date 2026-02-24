import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MapboxMap from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, CheckCircle, XCircle, Loader2, X, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RideStatus = "requested" | "accepted" | "en_route" | "picked_up" | "completed" | "cancelled";

const statusConfig: Record<RideStatus, { label: string; color: string; icon: React.ElementType }> = {
  requested: { label: "Finding rider...", color: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  accepted: { label: "Rider accepted", color: "bg-info/10 text-info border-info/30", icon: CheckCircle },
  en_route: { label: "Rider en route", color: "bg-info/10 text-info border-info/30", icon: Navigation },
  picked_up: { label: "In transit", color: "bg-primary/10 text-primary border-primary/30", icon: Navigation },
  completed: { label: "Completed", color: "bg-primary/10 text-primary border-primary/30", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
};

export default function CustomerDashboard() {
  return (
    <DashboardLayout fullScreen>
      <BookRideSection />
    </DashboardLayout>
  );
}

export function CustomerRides() {
  return (
    <DashboardLayout>
      <RideHistory />
    </DashboardLayout>
  );
}

export function CustomerRatings() {
  return (
    <DashboardLayout>
      <div>
        <h2 className="mb-4 text-lg font-bold text-foreground">My Ratings</h2>
        <RatingsSection />
      </div>
    </DashboardLayout>
  );
}

function RatingsSection() {
  const { user } = useAuth();
  const { data: ratings, isLoading } = useQuery({
    queryKey: ["my-ratings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ratings").select("*").eq("rated_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) return <LoadingSkeleton />;

  if (!ratings?.length) {
    return (
      <div className="glass-card p-8 text-center">
        <Star className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No ratings yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {ratings.map((r, i) => (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {Array.from({ length: r.rating }).map((_, j) => (
                <Star key={j} className="h-3.5 w-3.5 fill-warning text-warning" />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
          </div>
          {r.comment && <p className="mt-2 text-sm text-foreground">{r.comment}</p>}
        </motion.div>
      ))}
    </div>
  );
}

function BookRideSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);
  const [selectingFor, setSelectingFor] = useState<"pickup" | "dropoff">("pickup");

  const { data: activeRide, isLoading: loadingActive } = useQuery({
    queryKey: ["active-ride", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("customer_id", user!.id)
        .in("status", ["requested", "accepted", "en_route", "picked_up"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 3000,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rides").insert({
        customer_id: user!.id,
        pickup_address: pickup.trim(),
        dropoff_address: dropoff.trim(),
        pickup_lat: pickupCoords?.[1] || null,
        pickup_lng: pickupCoords?.[0] || null,
        dropoff_lat: dropoffCoords?.[1] || null,
        dropoff_lng: dropoffCoords?.[0] || null,
        status: "requested" as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ride requested!", description: "Looking for a rider nearby..." });
      setPickup("");
      setDropoff("");
      setPickupCoords(null);
      setDropoffCoords(null);
      queryClient.invalidateQueries({ queryKey: ["active-ride"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const { error } = await supabase
        .from("rides")
        .update({ status: "cancelled" as any, cancelled_at: new Date().toISOString(), cancel_reason: "Cancelled by customer" })
        .eq("id", rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ride cancelled" });
      queryClient.invalidateQueries({ queryKey: ["active-ride"] });
    },
  });

  const handleMapClick = (lng: number, lat: number) => {
    if (selectingFor === "pickup") {
      setPickupCoords([lng, lat]);
      setPickup(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setSelectingFor("dropoff");
    } else {
      setDropoffCoords([lng, lat]);
      setDropoff(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const markers = [
    ...(pickupCoords ? [{ id: "pickup", lng: pickupCoords[0], lat: pickupCoords[1], color: "#22c55e", label: "Pickup" }] : []),
    ...(dropoffCoords ? [{ id: "dropoff", lng: dropoffCoords[0], lat: dropoffCoords[1], color: "#f59e0b", label: "Dropoff" }] : []),
    ...(activeRide?.pickup_lat && activeRide?.pickup_lng
      ? [{ id: "active-pickup", lng: activeRide.pickup_lng, lat: activeRide.pickup_lat, color: "#22c55e", label: "Pickup" }]
      : []),
    ...(activeRide?.dropoff_lat && activeRide?.dropoff_lng
      ? [{ id: "active-dropoff", lng: activeRide.dropoff_lng, lat: activeRide.dropoff_lat, color: "#f59e0b", label: "Dropoff" }]
      : []),
  ];

  if (loadingActive) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100dvh-56px)] flex-col">
      {/* Map */}
      <MapboxMap
        className="absolute inset-0"
        onMapClick={!activeRide ? handleMapClick : undefined}
        markers={markers}
      />

      {/* Top overlay */}
      {!activeRide && (
        <div className="map-gradient-top pointer-events-none absolute top-0 left-0 right-0 h-20 z-10" />
      )}

      {/* Bottom Sheet */}
      <div className="relative z-20 mt-auto">
        <div className="map-gradient-bottom pt-16 pb-20">
          <AnimatePresence mode="wait">
            {activeRide ? (
              <ActiveRideCard
                key="active"
                ride={activeRide}
                onCancel={() => cancelMutation.mutate(activeRide.id)}
                cancelling={cancelMutation.isPending}
              />
            ) : (
              <BookingCard
                key="booking"
                pickup={pickup}
                dropoff={dropoff}
                setPickup={setPickup}
                setDropoff={setDropoff}
                selectingFor={selectingFor}
                setSelectingFor={setSelectingFor}
                onBook={() => bookMutation.mutate()}
                booking={bookMutation.isPending}
                canBook={!!pickup.trim() && !!dropoff.trim()}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ActiveRideCard({ ride, onCancel, cancelling }: { ride: any; onCancel: () => void; cancelling: boolean }) {
  const config = statusConfig[ride.status as RideStatus];
  const StatusIcon = config.icon;
  const steps: RideStatus[] = ["requested", "accepted", "en_route", "picked_up"];
  const currentIdx = steps.indexOf(ride.status as RideStatus);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="mx-4"
    >
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <Badge className={`${config.color} border text-xs font-medium`}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
          {ride.status === "requested" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Searching...
            </div>
          )}
        </div>

        {/* Route */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium text-foreground">{ride.pickup_address}</p>
            </div>
          </div>
          <div className="ml-1 h-4 border-l border-dashed border-border" />
          <div className="flex items-start gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dropoff</p>
              <p className="text-sm font-medium text-foreground">{ride.dropoff_address}</p>
            </div>
          </div>
        </div>

        {ride.fare && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
            <span className="text-xs text-muted-foreground">Estimated Fare</span>
            <span className="text-lg font-bold text-foreground">₱{Number(ride.fare).toFixed(2)}</span>
          </div>
        )}

        {/* Progress */}
        <div className="mt-4 flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= currentIdx ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        {ride.status === "requested" && (
          <Button
            variant="ghost"
            className="mt-4 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onCancel}
            disabled={cancelling}
          >
            Cancel Ride
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function BookingCard({
  pickup, dropoff, setPickup, setDropoff, selectingFor, setSelectingFor, onBook, booking, canBook,
}: {
  pickup: string; dropoff: string;
  setPickup: (v: string) => void; setDropoff: (v: string) => void;
  selectingFor: "pickup" | "dropoff";
  setSelectingFor: (v: "pickup" | "dropoff") => void;
  onBook: () => void; booking: boolean; canBook: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="mx-4"
    >
      <div className="glass-card p-5">
        <p className="mb-4 text-lg font-bold text-foreground">Where to?</p>

        <div className="space-y-3">
          <button
            onClick={() => setSelectingFor("pickup")}
            className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
              selectingFor === "pickup" ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/50"
            }`}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pickup</p>
              <p className="truncate text-sm font-medium text-foreground">
                {pickup || "Tap on map to set"}
              </p>
            </div>
            {pickup && (
              <button onClick={(e) => { e.stopPropagation(); setPickup(""); }} className="text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </button>

          <button
            onClick={() => setSelectingFor("dropoff")}
            className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
              selectingFor === "dropoff" ? "border-warning/40 bg-warning/5" : "border-border bg-secondary/50"
            }`}
          >
            <div className="h-2.5 w-2.5 rounded-full bg-warning shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dropoff</p>
              <p className="truncate text-sm font-medium text-foreground">
                {dropoff || "Tap on map to set"}
              </p>
            </div>
            {dropoff && (
              <button onClick={(e) => { e.stopPropagation(); setDropoff(""); }} className="text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </button>
        </div>

        <Button
          className="mt-4 h-12 w-full rounded-xl text-sm font-semibold"
          onClick={onBook}
          disabled={!canBook || booking}
        >
          {booking ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Requesting...</>
          ) : (
            "Request Ride"
          )}
        </Button>

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Tap the map to set your pickup and dropoff locations
        </p>
      </div>
    </motion.div>
  );
}

function RideHistory() {
  const { user } = useAuth();
  const { data: rides, isLoading } = useQuery({
    queryKey: ["ride-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Ride History</h2>
      {isLoading ? <LoadingSkeleton /> : !rides?.length ? (
        <div className="glass-card p-8 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No rides yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rides.map((ride, i) => {
            const config = statusConfig[ride.status as RideStatus];
            return (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{ride.pickup_address}</p>
                    <p className="truncate text-xs text-muted-foreground">→ {ride.dropoff_address}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{new Date(ride.created_at).toLocaleString()}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge className={`${config.color} border text-[10px]`}>{config.label}</Badge>
                    {ride.fare && (
                      <p className="mt-1 text-sm font-bold text-foreground">₱{Number(ride.fare).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
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
