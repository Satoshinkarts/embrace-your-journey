import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MapboxMap from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, CheckCircle, XCircle, Loader2, X, Star, Wallet, CalendarClock, ChevronRight, Banknote, SlidersHorizontal, Bike, RotateCcw, TrendingUp } from "lucide-react";
import WalletCard from "@/components/WalletCard";
import RideRatingDialog from "@/components/RideRatingDialog";
import { useToast } from "@/hooks/use-toast";
import { calculateFare } from "@/lib/fareCalculation";
import { useActiveZones, type Zone } from "@/hooks/useZones";
import { useRiderLocationRealtime } from "@/hooks/useRiderLocationRealtime";

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
        <h2 className="mb-4 text-xl font-bold text-foreground">My Ratings</h2>
        <RatingsSection />
      </div>
    </DashboardLayout>
  );
}

export function CustomerWallet() {
  return (
    <DashboardLayout>
      <div>
        <h2 className="mb-4 text-xl font-bold text-foreground">My Wallet</h2>
        <WalletCard />
      </div>
    </DashboardLayout>
  );
}

function RatingsSection() {
  const { user } = useAuth();
  const { data: ratings, isLoading } = useQuery({
    queryKey: ["my-given-ratings", user?.id],
    queryFn: async () => {
      // Get ratings the customer has given (rater_id = user)
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("*")
        .eq("rater_id", user!.id)
        .order("created_at", { ascending: false });
      if (ratingsError) throw ratingsError;
      if (!ratingsData?.length) return [];

      // Fetch associated rides for context
      const rideIds = ratingsData.map(r => r.ride_id);
      const { data: rides } = await supabase
        .from("rides")
        .select("id, pickup_address, dropoff_address, fare, completed_at")
        .in("id", rideIds);

      const rideMap = new Map(rides?.map(r => [r.id, r]) || []);
      return ratingsData.map(r => ({ ...r, ride: rideMap.get(r.ride_id) }));
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
          {r.ride && (
            <div className="mb-2">
              <p className="truncate text-sm font-semibold text-foreground">{r.ride.dropoff_address}</p>
              <p className="truncate text-xs text-muted-foreground mt-0.5">
                <span className="text-muted-foreground/60">→</span> {r.ride.pickup_address}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: r.rating }).map((_, j) => (
                <Star key={j} className="h-3.5 w-3.5 fill-warning text-warning" />
              ))}
              {Array.from({ length: 5 - r.rating }).map((_, j) => (
                <Star key={`e-${j}`} className="h-3.5 w-3.5 text-muted-foreground/20" />
              ))}
            </div>
            <div className="text-right">
              {r.ride?.fare && <p className="text-sm font-bold text-foreground">₱{Number(r.ride.fare).toFixed(2)}</p>}
              <span className="text-[10px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          {r.comment && <p className="mt-2 text-xs text-muted-foreground italic">"{r.comment}"</p>}
        </motion.div>
      ))}
    </div>
  );
}

// Reverse geocode using Mapbox API
async function reverseGeocode(lng: number, lat: number, token: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1&types=address,poi,place,locality,neighborhood&language=en&country=PH`
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
  const { data: zones } = useActiveZones();
  const [matchedZone, setMatchedZone] = useState<Zone | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ place_name: string; center: [number, number] }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!mapboxToken || query.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=8&types=address,poi,place,locality,neighborhood,district&country=PH&bbox=121.8,10.4,123.2,12.0&proximity=122.5654,10.7202&language=en`
      );
      const data = await res.json();
      setSuggestions(data.features?.map((f: any) => ({ place_name: f.place_name, center: f.center })) || []);
    } catch { setSuggestions([]); }
  }, [mapboxToken]);

  const handleDropoffChange = useCallback((value: string) => {
    setDropoffInput(value);
    setDropoff(value);
    setDropoffCoords(null);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }, [setDropoffInput, setDropoff, fetchSuggestions]);

  const selectSuggestion = useCallback((s: { place_name: string; center: [number, number] }) => {
    setDropoffInput(s.place_name);
    setDropoff(s.place_name);
    setDropoffCoords([s.center[0], s.center[1]]);
    setSuggestions([]);
    setShowSuggestions(false);
  }, [setDropoffInput, setDropoff]);

  const onTogglePickupMode = useCallback(() => {
    setPickupMode(prev => prev === "gps" ? "manual" : "gps");
  }, []);

  // GPS auto-detect pickup location
  const handleGeolocate = useCallback(async (lng: number, lat: number) => {
    if (pickupMode !== "gps") return;
    setPickupCoords([lng, lat]);
    setLocatingPickup(false);
    if (mapboxToken) {
      const addr = await reverseGeocode(lng, lat, mapboxToken);
      setPickup(addr);
      // Try to match zone by name in the address
      if (zones?.length) {
        const found = zones.find(z => addr.toLowerCase().includes(z.name.toLowerCase()));
        setMatchedZone(found || null);
      }
    } else {
      setPickup("Locating address...");
    }
  }, [mapboxToken, pickupMode, zones]);

  // Retry reverse geocode when token arrives and pickup is still pending
  useEffect(() => {
    if (!mapboxToken || !pickupCoords) return;
    if (pickup && pickup !== "Locating address..." && !pickup.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) return;
    (async () => {
      const addr = await reverseGeocode(pickupCoords[0], pickupCoords[1], mapboxToken);
      setPickup(addr);
    })();
  }, [mapboxToken, pickupCoords]);

  const [ratingRide, setRatingRide] = useState<{ id: string; rider_id: string } | null>(null);

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

  // Check for recently completed ride that needs rating
  const { data: completedUnrated } = useQuery({
    queryKey: ["completed-unrated", user?.id],
    queryFn: async () => {
      // Get last completed ride
      const { data: ride } = await supabase
        .from("rides")
        .select("id, rider_id, completed_at")
        .eq("customer_id", user!.id)
        .eq("status", "completed" as any)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ride?.rider_id) return null;
      // Check if already rated
      const { data: existing } = await supabase
        .from("ratings")
        .select("id")
        .eq("ride_id", ride.id)
        .eq("rater_id", user!.id)
        .maybeSingle();
      if (existing) return null;
      return ride;
    },
    enabled: !!user && !activeRide,
  });

  // Auto-open rating dialog for completed unrated rides
  useEffect(() => {
    if (completedUnrated && !ratingRide) {
      setRatingRide({ id: completedUnrated.id, rider_id: completedUnrated.rider_id! });
    }
  }, [completedUnrated]);

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
        zone_id: matchedZone?.id || null,
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
        if (zones?.length) {
          const found = zones.find(z => addr.toLowerCase().includes(z.name.toLowerCase()));
          setMatchedZone(found || null);
        }
      } else {
        setPickup("Locating address...");
      }
      setPickupMode("gps");
    } else {
      setDropoffCoords([lng, lat]);
      if (mapboxToken) {
        const addr = await reverseGeocode(lng, lat, mapboxToken);
        setDropoff(addr);
        setDropoffInput(addr);
      } else {
        setDropoff("Locating address...");
        setDropoffInput("Locating address...");
      }
    }
  }, [mapboxToken, pickupMode]);

  // Fetch route when both coords are set
  const [routeCoords, setRouteCoords] = useState<[number, number][] | undefined>(undefined);
  const [routeEstimate, setRouteEstimate] = useState<{ distanceKm: number; durationMin: number; fare: number } | null>(null);

  useEffect(() => {
    if (!mapboxToken) return;

    const pCoords = activeRide ? (activeRide.pickup_lat && activeRide.pickup_lng ? [activeRide.pickup_lng, activeRide.pickup_lat] : null) : pickupCoords;
    const dCoords = activeRide ? (activeRide.dropoff_lat && activeRide.dropoff_lng ? [activeRide.dropoff_lng, activeRide.dropoff_lat] : null) : dropoffCoords;

    if (!pCoords || !dCoords) {
      setRouteCoords(undefined);
      setRouteEstimate(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${pCoords[0]},${pCoords[1]};${dCoords[0]},${dCoords[1]}?geometries=geojson&overview=full&access_token=${mapboxToken}`
        );
        const data = await res.json();
        if (!cancelled && data.routes?.[0]) {
          const route = data.routes[0];
          setRouteCoords(route.geometry.coordinates);
          const distanceKm = route.distance / 1000;
          const durationMin = Math.ceil(route.duration / 60);
          const fare = calculateFare(distanceKm, matchedZone?.premium_fee);
          setRouteEstimate({ distanceKm, durationMin, fare });
        }
      } catch {
        if (!cancelled) { setRouteCoords(undefined); setRouteEstimate(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [mapboxToken, pickupCoords, dropoffCoords, activeRide]);

  // Real-time rider location during active ride
  const riderLocation = useRiderLocationRealtime(activeRide?.rider_id);

  const markers = [
    ...(pickupCoords ? [{ id: "pickup", lng: pickupCoords[0], lat: pickupCoords[1], color: "#22c55e", label: "You are here" }] : []),
    ...(dropoffCoords ? [{ id: "dropoff", lng: dropoffCoords[0], lat: dropoffCoords[1], color: "#f59e0b", label: "Dropoff" }] : []),
    ...(activeRide?.pickup_lat && activeRide?.pickup_lng
      ? [{ id: "active-pickup", lng: activeRide.pickup_lng, lat: activeRide.pickup_lat, color: "#22c55e", label: "Pickup" }]
      : []),
    ...(activeRide?.dropoff_lat && activeRide?.dropoff_lng
      ? [{ id: "active-dropoff", lng: activeRide.dropoff_lng, lat: activeRide.dropoff_lat, color: "#f59e0b", label: "Dropoff" }]
      : []),
    // Rider's live location marker
    ...(activeRide && riderLocation
      ? [{ id: "rider-live", lng: riderLocation.lng ?? 0, lat: riderLocation.lat ?? 0, color: "#3b82f6", label: "Your Rider 🏍️" }]
      : []),
  ];

  const pickupReady = !!pickup.trim() && pickup !== "Locating address..." && !pickup.match(/^-?\d+\.\d{4},/);
  const canBook = pickupReady && !!(dropoff.trim() || dropoffInput.trim());

  // Recent & frequent destinations
  const { data: pastRides } = useQuery({
    queryKey: ["past-destinations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("dropoff_address, dropoff_lat, dropoff_lng, created_at")
        .eq("customer_id", user!.id)
        .not("dropoff_lat", "is", null)
        .not("dropoff_lng", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !activeRide,
  });

  const recentAndFrequent = useMemo(() => {
    if (!pastRides?.length) return { recent: [], frequent: [] };

    // Deduplicate by address for recents
    const seen = new Set<string>();
    const recent = pastRides
      .filter(r => {
        if (seen.has(r.dropoff_address)) return false;
        seen.add(r.dropoff_address);
        return true;
      })
      .slice(0, 3);

    // Frequent: count occurrences, pick top 3
    const counts = new Map<string, { count: number; ride: typeof pastRides[0] }>();
    pastRides.forEach(r => {
      const existing = counts.get(r.dropoff_address);
      if (existing) existing.count++;
      else counts.set(r.dropoff_address, { count: 1, ride: r });
    });
    const frequent = [...counts.entries()]
      .filter(([_, v]) => v.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([addr, v]) => ({ ...v.ride, count: v.count }));

    return { recent, frequent };
  }, [pastRides]);

  const handleRebook = useCallback((addr: string, lat: number, lng: number) => {
    setDropoffInput(addr);
    setDropoff(addr);
    setDropoffCoords([lng, lat]);
  }, []);

  if (loadingActive) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-56px-52px)] flex-col overflow-hidden bg-background">
      {/* Top: Pickup + Destination cards */}
      <div className="relative z-20 shrink-0 px-4 pt-3 pb-1 space-y-2 bg-background">
        <AnimatePresence mode="wait">
          {activeRide ? (
            <ActiveRideCard
              key="active"
              ride={activeRide}
              onCancel={() => cancelMutation.mutate(activeRide.id)}
              cancelling={cancelMutation.isPending}
              riderLocation={riderLocation}
              mapboxToken={mapboxToken}
            />
          ) : (
            <motion.div
              key="booking-top"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {/* Pickup card */}
              <div className={`rounded-2xl border p-4 shadow-sm ${pickupMode === "manual" ? "border-warning/40 bg-warning/5" : "border-border bg-card"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Pick-up location</p>
                    {pickupMode === "manual" && !pickup ? (
                      <p className="text-sm text-warning font-medium mt-0.5">Tap the map to pin your pickup</p>
                    ) : locatingPickup ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Getting GPS location...</p>
                      </div>
                    ) : (
                      <p className="truncate text-sm font-semibold text-foreground mt-0.5">{pickup}</p>
                    )}
                  </div>
                  <button onClick={onTogglePickupMode} className="shrink-0 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                    {pickupMode === "gps" ? "Pin" : "GPS"}
                  </button>
                </div>
              </div>

              {/* Destination card */}
              <div className="relative">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/20">
                    <MapPin className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-warning font-semibold">Destination</p>
                    <Input
                      value={dropoffInput}
                      onChange={(e) => handleDropoffChange(e.target.value)}
                      onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Search address or tap map"
                      className="h-7 border-0 bg-transparent p-0 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  {dropoffInput ? (
                    <button onClick={() => { setDropoffInput(""); setDropoff(""); setDropoffCoords(null); setSuggestions([]); }} className="text-muted-foreground shrink-0">
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Suggestions dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
                    >
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectSuggestion(s)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary border-b border-border last:border-0"
                        >
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                          <span className="text-sm text-foreground line-clamp-2">{s.place_name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent & Frequent destinations — show when no active ride and no dropoff set */}
      {!activeRide && !dropoffCoords && !showSuggestions && (recentAndFrequent.recent.length > 0 || recentAndFrequent.frequent.length > 0) && (
        <div className="shrink-0 z-20 px-4 pb-1 max-h-36 overflow-y-auto">
          {recentAndFrequent.frequent.length > 0 && (
            <div className="mb-1.5">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                <TrendingUp className="h-3 w-3" /> Frequent
              </p>
              {recentAndFrequent.frequent.map((r, i) => (
                <button
                  key={`freq-${i}`}
                  onClick={() => handleRebook(r.dropoff_address, r.dropoff_lat!, r.dropoff_lng!)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary mb-1"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{r.dropoff_address}</p>
                    <p className="text-[10px] text-muted-foreground">{(r as any).count} rides</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
          {recentAndFrequent.recent.length > 0 && (
            <div>
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                <RotateCcw className="h-3 w-3" /> Recent
              </p>
              {recentAndFrequent.recent.map((r, i) => (
                <button
                  key={`rec-${i}`}
                  onClick={() => handleRebook(r.dropoff_address, r.dropoff_lat!, r.dropoff_lng!)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary mb-1"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/10">
                    <RotateCcw className="h-3.5 w-3.5 text-warning" />
                  </div>
                  <p className="truncate text-xs font-medium text-foreground min-w-0 flex-1">{r.dropoff_address}</p>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map in the middle — shrinks to fit so bottom panel always shows */}
      <div className="relative flex-1 min-h-0">
        <MapboxMap
          className="h-full w-full"
          onMapClick={!activeRide ? handleMapClick : undefined}
          onGeolocate={!activeRide ? handleGeolocate : undefined}
          showGeolocate={!activeRide}
          markers={markers}
          routeCoords={routeCoords}
        />
      </div>

      {/* Bottom panel — always visible */}
      {!activeRide && (
        <BottomBookingPanel
          routeEstimate={routeEstimate}
          matchedZone={matchedZone}
          onBook={() => bookMutation.mutate()}
          booking={bookMutation.isPending}
          canBook={canBook}
        />
      )}

      {/* Post-ride rating dialog */}
      {ratingRide && (
        <RideRatingDialog
          open={!!ratingRide}
          onOpenChange={(open) => { if (!open) setRatingRide(null); }}
          rideId={ratingRide.id}
          riderId={ratingRide.rider_id}
        />
      )}
    </div>
  );
}

function ActiveRideCard({ ride, onCancel, cancelling, riderLocation, mapboxToken }: {
  ride: any;
  onCancel: () => void;
  cancelling: boolean;
  riderLocation: { lat: number; lng: number; heading: number | null; speed: number | null } | null;
  mapboxToken: string | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const config = statusConfig[ride.status as RideStatus];
  const StatusIcon = config.icon;
  const steps: RideStatus[] = ["requested", "accepted", "en_route", "picked_up"];
  const currentIdx = steps.indexOf(ride.status as RideStatus);

  // ETA & distance from rider to destination (pickup if not picked up, dropoff if picked up)
  const [riderEta, setRiderEta] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  useEffect(() => {
    if (!riderLocation || !mapboxToken) { setRiderEta(null); return; }

    const isPickedUp = ride.status === "picked_up";
    const destLat = isPickedUp ? ride.dropoff_lat : ride.pickup_lat;
    const destLng = isPickedUp ? ride.dropoff_lng : ride.pickup_lng;
    if (!destLat || !destLng) { setRiderEta(null); return; }

    let cancelled = false;
    const fetchEta = async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${riderLocation.lng},${riderLocation.lat};${destLng},${destLat}?overview=false&access_token=${mapboxToken}`
        );
        const data = await res.json();
        if (!cancelled && data.routes?.[0]) {
          setRiderEta({
            distanceKm: data.routes[0].distance / 1000,
            durationMin: Math.ceil(data.routes[0].duration / 60),
          });
        }
      } catch { if (!cancelled) setRiderEta(null); }
    };

    fetchEta();
    const interval = setInterval(fetchEta, 15000); // refresh every 15s
    return () => { cancelled = true; clearInterval(interval); };
  }, [riderLocation?.lat, riderLocation?.lng, ride.status, mapboxToken]);

  // Customer confirms trip completion
  const confirmMutation = useMutation({
    mutationFn: async () => {
      // Insert a booking event confirming the customer acknowledged completion
      const { error } = await supabase.from("booking_events").insert({
        ride_id: ride.id,
        event_type: "customer_confirmed",
        actor_id: ride.customer_id,
        actor_role: "customer",
        metadata: { confirmed_at: new Date().toISOString() },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Trip confirmed!", description: "Thank you for riding with us." });
      queryClient.invalidateQueries({ queryKey: ["active-ride"] });
    },
  });

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

        {/* Rider ETA & Distance */}
        {riderEta && ride.status !== "requested" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 flex gap-2"
          >
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-info/10 border border-info/20 px-3 py-2.5">
              <Navigation className="h-4 w-4 text-info" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-info/70">Distance</p>
                <p className="text-sm font-bold text-info">
                  {riderEta.distanceKm < 1
                    ? `${Math.round(riderEta.distanceKm * 1000)}m`
                    : `${riderEta.distanceKm.toFixed(1)} km`}
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-primary/70">
                  {ride.status === "picked_up" ? "Arriving in" : "ETA"}
                </p>
                <p className="text-sm font-bold text-primary">
                  {riderEta.durationMin <= 1 ? "< 1 min" : `${riderEta.durationMin} min`}
                </p>
              </div>
            </div>
          </motion.div>
        )}

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

        {/* Customer confirmation when rider marks picked_up */}
        {ride.status === "picked_up" && (
          <Button
            className="mt-4 h-12 w-full text-sm font-semibold"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Confirm Trip Ended
          </Button>
        )}

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

function BottomBookingPanel({
  routeEstimate, matchedZone, onBook, booking, canBook,
}: {
  routeEstimate: { distanceKm: number; durationMin: number; fare: number } | null;
  matchedZone: Zone | null;
  onBook: () => void;
  booking: boolean;
  canBook: boolean;
}) {
  const [advanceBooking, setAdvanceBooking] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="relative z-20 shrink-0 border-t border-border bg-card px-4 pt-3 pb-4 safe-bottom">
      {/* Payment + Schedule row */}
      <div className="mb-3 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Cash</span>
        </div>
        <button
          onClick={() => setAdvanceBooking(!advanceBooking)}
          className={`flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 transition-colors ${
            advanceBooking
              ? "bg-accent/10 border border-accent/30"
              : "bg-secondary"
          }`}
        >
          <Clock className={`h-4 w-4 ${advanceBooking ? "text-accent" : "text-muted-foreground"}`} />
          <span className={`text-sm font-medium ${advanceBooking ? "text-accent" : "text-foreground"}`}>
            {advanceBooking ? "Scheduled" : "Now"}
          </span>
        </button>
      </div>

      {/* Advance booking date/time */}
      <AnimatePresence>
        {advanceBooking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div className="flex gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Date</p>
                <Input
                  type="date"
                  min={today}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="h-8 border-0 bg-transparent p-0 text-sm font-medium text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="w-px bg-border" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Time</p>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="h-8 border-0 bg-transparent p-0 text-sm font-medium text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vehicle type - Motorcycle */}
      <div className="mb-3">
        <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-primary bg-primary/5 px-4 py-3">
          <Bike className="h-6 w-6 text-primary" />
          <span className="text-sm font-bold text-foreground">Motorcycle</span>
          {routeEstimate && (
            <span className="text-xs text-primary font-semibold">from ₱{routeEstimate.fare.toFixed(0)}</span>
          )}
        </div>
      </div>

      {/* Order button */}
      <Button
        className="h-14 w-full text-base font-bold shadow-lg"
        onClick={onBook}
        disabled={!canBook || booking}
      >
        {booking ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Requesting...</>
        ) : (
          <div className="flex w-full items-center justify-between px-2">
            <span className="text-lg font-bold">
              {routeEstimate ? `from ₱${routeEstimate.fare.toFixed(0)}` : "—"}
            </span>
            <span className="text-base font-bold">{advanceBooking && scheduleDate ? "Schedule" : "Order"}</span>
          </div>
        )}
      </Button>
    </div>
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

  // Fetch ratings for all completed rides
  const rideIds = rides?.filter(r => r.status === "completed").map(r => r.id) || [];
  const { data: ratings } = useQuery({
    queryKey: ["ride-ratings", rideIds],
    queryFn: async () => {
      if (!rideIds.length) return [];
      const { data, error } = await supabase
        .from("ratings")
        .select("ride_id, rating, comment")
        .eq("rater_id", user!.id)
        .in("ride_id", rideIds);
      if (error) throw error;
      return data;
    },
    enabled: !!user && rideIds.length > 0,
  });

  const ratingMap = new Map(ratings?.map(r => [r.ride_id, r]) || []);

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-foreground">Ride History</h2>
      {isLoading ? <LoadingSkeleton /> : !rides?.length ? (
        <div className="glass-card p-8 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No rides yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rides.map((ride, i) => {
            const config = statusConfig[ride.status as RideStatus];
            const review = ratingMap.get(ride.id);
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
                    <p className="truncate text-sm font-semibold text-foreground">{ride.dropoff_address}</p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      <span className="text-muted-foreground/60">→</span> {ride.pickup_address}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {new Date(ride.created_at).toLocaleDateString()} · {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right space-y-1.5">
                    <Badge className={`${config.color} border text-[10px]`}>{config.label}</Badge>
                    {ride.fare && (
                      <p className="text-sm font-bold text-foreground">₱{Number(ride.fare).toFixed(2)}</p>
                    )}
                  </div>
                </div>
                {/* Review section */}
                {ride.status === "completed" && review && (
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 fill-warning text-warning" />
                      ))}
                      {Array.from({ length: 5 - review.rating }).map((_, j) => (
                        <Star key={j} className="h-3.5 w-3.5 text-muted-foreground/20" />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-xs text-muted-foreground italic">"{review.comment}"</p>
                    )}
                  </div>
                )}
                {ride.status === "completed" && !review && (
                  <p className="mt-2.5 text-[10px] text-muted-foreground/50 italic">No reviews available</p>
                )}
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
