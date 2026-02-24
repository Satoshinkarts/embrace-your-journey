import { useState, useEffect, useCallback, useRef } from "react";
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

// Reverse geocode using Mapbox API
async function reverseGeocode(lng: number, lat: number, token: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1&types=address,poi`
    );
    const data = await res.json();
    if (data.features?.length) {
      return data.features[0].place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  } catch {}
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function BookRideSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);
  const [locatingPickup, setLocatingPickup] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch mapbox token for geocoding
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("get-mapbox-token");
        if (data?.token) setMapboxToken(data.token);
      } catch {}
    })();
  }, []);

  const [pickupMode, setPickupMode] = useState<"gps" | "manual">("gps");

  // GPS auto-detect pickup location
  const handleGeolocate = useCallback(async (lng: number, lat: number) => {
    if (pickupMode !== "gps") return;
    setPickupCoords([lng, lat]);
    setLocatingPickup(false);
    if (mapboxToken) {
      const addr = await reverseGeocode(lng, lat, mapboxToken);
      setPickup(addr);
    } else {
      setPickup(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }, [mapboxToken, pickupMode]);

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
      const finalDropoff = dropoff || dropoffInput.trim();
      const { error } = await supabase.from("rides").insert({
        customer_id: user!.id,
        pickup_address: pickup.trim(),
        dropoff_address: finalDropoff,
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
      setDropoff("");
      setDropoffInput("");
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

  // Map click sets pickup (manual mode) or dropoff
  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    if (pickupMode === "manual") {
      setPickupCoords([lng, lat]);
      setLocatingPickup(false);
      if (mapboxToken) {
        const addr = await reverseGeocode(lng, lat, mapboxToken);
        setPickup(addr);
      } else {
        setPickup(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
      // After setting pickup, switch back so next tap sets dropoff
      setPickupMode("gps");
    } else {
      setDropoffCoords([lng, lat]);
      if (mapboxToken) {
        const addr = await reverseGeocode(lng, lat, mapboxToken);
        setDropoff(addr);
        setDropoffInput(addr);
      } else {
        const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setDropoff(fallback);
        setDropoffInput(fallback);
      }
    }
  }, [mapboxToken, pickupMode]);

  const markers = [
    ...(pickupCoords ? [{ id: "pickup", lng: pickupCoords[0], lat: pickupCoords[1], color: "#22c55e", label: "You are here" }] : []),
    ...(dropoffCoords ? [{ id: "dropoff", lng: dropoffCoords[0], lat: dropoffCoords[1], color: "#f59e0b", label: "Dropoff" }] : []),
    ...(activeRide?.pickup_lat && activeRide?.pickup_lng
      ? [{ id: "active-pickup", lng: activeRide.pickup_lng, lat: activeRide.pickup_lat, color: "#22c55e", label: "Pickup" }]
      : []),
    ...(activeRide?.dropoff_lat && activeRide?.dropoff_lng
      ? [{ id: "active-dropoff", lng: activeRide.dropoff_lng, lat: activeRide.dropoff_lat, color: "#f59e0b", label: "Dropoff" }]
      : []),
  ];

  const canBook = !!pickup.trim() && !!(dropoff.trim() || dropoffInput.trim());

  if (loadingActive) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100dvh-56px)] flex-col">
      {/* Map — auto-geolocate for pickup, click for dropoff */}
      <MapboxMap
        className="absolute inset-0"
        onMapClick={!activeRide ? handleMapClick : undefined}
        onGeolocate={!activeRide ? handleGeolocate : undefined}
        showGeolocate={!activeRide}
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
                locatingPickup={locatingPickup}
                dropoff={dropoff}
                dropoffInput={dropoffInput}
                setDropoffInput={setDropoffInput}
                setDropoff={setDropoff}
                setDropoffCoords={setDropoffCoords}
                onBook={() => bookMutation.mutate()}
                booking={bookMutation.isPending}
                canBook={canBook}
                pickupMode={pickupMode}
                onTogglePickupMode={() => {
                  setPickupMode(pickupMode === "gps" ? "manual" : "gps");
                }}
                mapboxToken={mapboxToken}
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
  pickup, locatingPickup, dropoff, dropoffInput, setDropoffInput, setDropoff, setDropoffCoords, onBook, booking, canBook, pickupMode, onTogglePickupMode, mapboxToken,
}: {
  pickup: string; locatingPickup: boolean;
  dropoff: string; dropoffInput: string;
  setDropoffInput: (v: string) => void;
  setDropoff: (v: string) => void;
  setDropoffCoords: (v: [number, number] | null) => void;
  onBook: () => void; booking: boolean; canBook: boolean;
  pickupMode: "gps" | "manual";
  onTogglePickupMode: () => void;
  mapboxToken: string | null;
}) {
  const [suggestions, setSuggestions] = useState<Array<{ place_name: string; center: [number, number] }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!mapboxToken || query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5&types=address,poi,place,locality`
      );
      const data = await res.json();
      setSuggestions(data.features?.map((f: any) => ({ place_name: f.place_name, center: f.center })) || []);
    } catch {
      setSuggestions([]);
    }
  }, [mapboxToken]);

  const handleDropoffChange = useCallback((value: string) => {
    setDropoffInput(value);
    setDropoff(value);
    setDropoffCoords(null);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }, [setDropoffInput, setDropoff, setDropoffCoords, fetchSuggestions]);

  const selectSuggestion = useCallback((s: { place_name: string; center: [number, number] }) => {
    setDropoffInput(s.place_name);
    setDropoff(s.place_name);
    setDropoffCoords([s.center[0], s.center[1]]);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [setDropoffInput, setDropoff, setDropoffCoords]);

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
          {/* Pickup — GPS or manual pin */}
          <div className={`flex w-full items-center gap-3 rounded-xl border p-3.5 ${pickupMode === "manual" ? "border-warning/50 bg-warning/5" : "border-primary/30 bg-primary/5"}`}>
            <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_6px_rgba(34,197,94,0.4)]" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {pickupMode === "manual" ? "Tap map to set pickup" : "Pickup (GPS)"}
              </p>
              {pickupMode === "manual" && !pickup ? (
                <p className="text-sm text-warning font-medium mt-0.5">Tap the map to pin your pickup</p>
              ) : locatingPickup ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Getting GPS location...</p>
                </div>
              ) : (
                <p className="truncate text-sm font-medium text-foreground">{pickup}</p>
              )}
            </div>
            <button onClick={onTogglePickupMode} className="shrink-0 rounded-lg border border-border bg-secondary/80 px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              {pickupMode === "gps" ? "Pin" : "GPS"}
            </button>
          </div>

          {/* Dropoff — tap map, type, or select suggestion */}
          <div className="relative">
            <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-warning shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Dropoff</p>
                  <Input
                    value={dropoffInput}
                    onChange={(e) => handleDropoffChange(e.target.value)}
                    onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Search address or tap the map"
                    className="h-8 border-0 bg-transparent p-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                {dropoffInput && (
                  <button onClick={() => { setDropoffInput(""); setDropoff(""); setDropoffCoords(null); setSuggestions([]); }} className="text-muted-foreground shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestion(s)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/80 border-b border-border last:border-0"
                    >
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      <span className="text-sm text-foreground line-clamp-2">{s.place_name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
          GPS pickup • Tap "Pin" to set manually • Tap map for dropoff
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
