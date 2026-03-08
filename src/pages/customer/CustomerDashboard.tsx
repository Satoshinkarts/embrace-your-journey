import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MapboxMap from "@/components/MapboxMap";
import MapControls from "@/components/MapControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import mapboxgl from "mapbox-gl";
import {
  MapPin, Navigation, Clock, CheckCircle, XCircle, Loader2, X, Star,
  Wallet, Banknote, Bike, Car, Package, RotateCcw, TrendingUp, ChevronRight,
  Crosshair, ChevronLeft, AlertCircle, RotateCw, WifiOff,
} from "lucide-react";
import WalletCard from "@/components/WalletCard";
import RideRatingDialog from "@/components/RideRatingDialog";
import { useToast } from "@/hooks/use-toast";
import { calculateFare } from "@/lib/fareCalculation";
import { useActiveZones, type Zone } from "@/hooks/useZones";
import { useRiderLocationRealtime } from "@/hooks/useRiderLocationRealtime";
import { searchLandmarks } from "@/data/panayLandmarks";

type RideStatus = "requested" | "accepted" | "en_route" | "picked_up" | "completed" | "cancelled";

const statusConfig: Record<RideStatus, { label: string; color: string; icon: React.ElementType }> = {
  requested: { label: "Finding rider...", color: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  accepted: { label: "Rider accepted", color: "bg-info/10 text-info border-info/30", icon: CheckCircle },
  en_route: { label: "Rider en route", color: "bg-info/10 text-info border-info/30", icon: Navigation },
  picked_up: { label: "In transit", color: "bg-primary/10 text-primary border-primary/30", icon: Navigation },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
};

/* ─── Page Exports ─── */
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

export function CustomerWallet() {
  return (
    <DashboardLayout>
      <div>
        <h2 className="mb-4 text-xl font-bold text-foreground">Wallet</h2>
        <WalletCard />
      </div>
    </DashboardLayout>
  );
}

/* ─── Helpers ─── */
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

/* ─── Main Booking Section ─── */
function BookRideSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);

  // Location state
  const [pickup, setPickup] = useState("");
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"detecting" | "success" | "failed" | "idle">("detecting");

  const [dropoff, setDropoff] = useState("");
  const [dropoffInput, setDropoffInput] = useState("");
  const [dropoffCoords, setDropoffCoords] = useState<[number, number] | null>(null);

  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const { data: zones } = useActiveZones();
  const [matchedZone, setMatchedZone] = useState<Zone | null>(null);

  // Search
  const [suggestions, setSuggestions] = useState<Array<{ place_name: string; center: [number, number]; isLandmark?: boolean }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ride type
  const [rideType, setRideType] = useState<"motorcycle" | "car" | "delivery">("motorcycle");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "wallet">("cash");
  const [scheduleMode, setScheduleMode] = useState<"now" | "scheduled">("now");

  // Route
  const [routeCoords, setRouteCoords] = useState<[number, number][] | undefined>(undefined);
  const [riderRouteCoords, setRiderRouteCoords] = useState<[number, number][] | undefined>(undefined);
  const [routeEstimate, setRouteEstimate] = useState<{ distanceKm: number; durationMin: number; fare: number } | null>(null);

  // Rating
  const [ratingRide, setRatingRide] = useState<{ id: string; rider_id: string } | null>(null);

  // Fetch mapbox token
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("get-mapbox-token");
        if (data?.token) setMapboxToken(data.token);
      } catch {}
    })();
  }, []);

  // GPS timeout – if we don't get a location within 10s, show fallback
  useEffect(() => {
    if (gpsStatus !== "detecting") return;
    gpsTimeoutRef.current = setTimeout(() => {
      if (gpsStatus === "detecting") {
        setGpsStatus("failed");
        toast({
          title: "GPS unavailable",
          description: "Move the map to set your pickup location manually.",
          variant: "destructive",
        });
      }
    }, 12000);
    return () => { if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current); };
  }, [gpsStatus]);

  // Active ride
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

  // Completed unrated
  const { data: completedUnrated } = useQuery({
    queryKey: ["completed-unrated", user?.id],
    queryFn: async () => {
      const { data: ride } = await supabase
        .from("rides")
        .select("id, rider_id, completed_at")
        .eq("customer_id", user!.id)
        .eq("status", "completed" as any)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ride?.rider_id) return null;
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

  useEffect(() => {
    if (completedUnrated && !ratingRide) {
      setRatingRide({ id: completedUnrated.id, rider_id: completedUnrated.rider_id! });
    }
  }, [completedUnrated]);

  // Center pin: reverse geocode on map move
  const handleCenterChange = useCallback(async (lng: number, lat: number) => {
    if (pickupConfirmed || activeRide) return;
    setPickupCoords([lng, lat]);
    // Only update GPS status on first interaction
    if (gpsStatus === "detecting" || gpsStatus === "failed") {
      setGpsStatus("success");
    }
    if (mapboxToken) {
      const addr = await reverseGeocode(lng, lat, mapboxToken);
      setPickup(addr);
      if (zones?.length) {
        const found = zones.find(z => addr.toLowerCase().includes(z.name.toLowerCase()));
        setMatchedZone(found || null);
      }
    }
  }, [mapboxToken, pickupConfirmed, activeRide, zones, gpsStatus]);

  // GPS auto-detect
  const handleGeolocate = useCallback(async (lng: number, lat: number) => {
    if (pickupConfirmed) return;
    setPickupCoords([lng, lat]);
    setGpsStatus("success");
    if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current);
    if (mapboxToken) {
      const addr = await reverseGeocode(lng, lat, mapboxToken);
      setPickup(addr);
      if (zones?.length) {
        const found = zones.find(z => addr.toLowerCase().includes(z.name.toLowerCase()));
        setMatchedZone(found || null);
      }
    }
  }, [mapboxToken, pickupConfirmed, zones]);

  // Confirm pickup from center pin
  const confirmPickup = useCallback(() => {
    if (!pickupCoords || !pickup || pickup === "Locating address...") return;
    setPickupConfirmed(true);
  }, [pickupCoords, pickup]);

  // Reset pickup
  const resetPickup = useCallback(() => {
    setPickupConfirmed(false);
    setDropoff("");
    setDropoffInput("");
    setDropoffCoords(null);
    setRouteCoords(undefined);
    setRiderRouteCoords(undefined);
    setRouteEstimate(null);
  }, []);

  // Destination search
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!mapboxToken || query.length < 2) { setSuggestions([]); return; }
    try {
      const localMatches = searchLandmarks(query, 4).map((lm) => ({
        place_name: lm.name,
        center: [lm.lng, lm.lat] as [number, number],
        isLandmark: true,
      }));
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=6&types=address,poi,place,locality,neighborhood,district&country=PH&bbox=121.8,10.4,123.2,12.0&proximity=122.5654,10.7202&language=en`
      );
      const data = await res.json();
      const mapboxResults = (data.features || []).map((f: any) => ({
        place_name: f.place_name,
        center: f.center,
        isLandmark: false,
      }));
      const localNames = new Set(localMatches.map((l) => l.place_name.toLowerCase()));
      const filtered = mapboxResults.filter(
        (r: any) => !localNames.has(r.place_name.split(",")[0].trim().toLowerCase())
      );
      setSuggestions([...localMatches, ...filtered].slice(0, 8));
    } catch { setSuggestions([]); }
  }, [mapboxToken]);

  const handleDropoffChange = useCallback((value: string) => {
    setDropoffInput(value);
    setDropoff(value);
    setDropoffCoords(null);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }, [fetchSuggestions]);

  const selectSuggestion = useCallback((s: { place_name: string; center: [number, number] }) => {
    setDropoffInput(s.place_name);
    setDropoff(s.place_name);
    setDropoffCoords([s.center[0], s.center[1]]);
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  // Map click for destination (when pickup confirmed)
  const handleMapClick = useCallback(async (lng: number, lat: number) => {
    if (!pickupConfirmed || activeRide) return;
    setDropoffCoords([lng, lat]);
    if (mapboxToken) {
      const addr = await reverseGeocode(lng, lat, mapboxToken);
      setDropoff(addr);
      setDropoffInput(addr);
    }
  }, [mapboxToken, pickupConfirmed, activeRide]);

  // Route fetching: pickup → destination
  useEffect(() => {
    if (!mapboxToken) return;
    const pCoords = activeRide ? (activeRide.pickup_lat && activeRide.pickup_lng ? [activeRide.pickup_lng, activeRide.pickup_lat] : null) : pickupCoords;
    const dCoords = activeRide ? (activeRide.dropoff_lat && activeRide.dropoff_lng ? [activeRide.dropoff_lng, activeRide.dropoff_lat] : null) : dropoffCoords;
    if (!pCoords || !dCoords) { setRouteCoords(undefined); setRouteEstimate(null); return; }
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
  }, [mapboxToken, pickupCoords, dropoffCoords, activeRide, matchedZone]);

  // Rider tracking
  const riderLocation = useRiderLocationRealtime(activeRide?.rider_id);

  // Rider → pickup/dropoff route
  useEffect(() => {
    if (!mapboxToken || !riderLocation || !activeRide) {
      setRiderRouteCoords(undefined);
      return;
    }
    
    const isPickedUp = activeRide.status === "picked_up";
    const destLat = isPickedUp ? activeRide.dropoff_lat : activeRide.pickup_lat;
    const destLng = isPickedUp ? activeRide.dropoff_lng : activeRide.pickup_lng;
    
    if (!destLat || !destLng) { setRiderRouteCoords(undefined); return; }
    
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${riderLocation.lng},${riderLocation.lat};${destLng},${destLat}?geometries=geojson&overview=full&access_token=${mapboxToken}`
        );
        const data = await res.json();
        if (!cancelled && data.routes?.[0]) {
          setRiderRouteCoords(data.routes[0].geometry.coordinates);
        }
      } catch {
        if (!cancelled) setRiderRouteCoords(undefined);
      }
    })();
    return () => { cancelled = true; };
  }, [mapboxToken, riderLocation?.lat, riderLocation?.lng, activeRide?.id, activeRide?.status]);

  // Past rides for recent/frequent
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
    const seen = new Set<string>();
    const recent = pastRides.filter(r => { if (seen.has(r.dropoff_address)) return false; seen.add(r.dropoff_address); return true; }).slice(0, 3);
    const counts = new Map<string, { count: number; ride: typeof pastRides[0] }>();
    pastRides.forEach(r => { const e = counts.get(r.dropoff_address); if (e) e.count++; else counts.set(r.dropoff_address, { count: 1, ride: r }); });
    const frequent = [...counts.entries()].filter(([, v]) => v.count >= 2).sort((a, b) => b[1].count - a[1].count).slice(0, 3).map(([, v]) => ({ ...v.ride, count: v.count }));
    return { recent, frequent };
  }, [pastRides]);

  const handleRebook = useCallback((addr: string, lat: number, lng: number) => {
    if (!pickupConfirmed) {
      if (pickupCoords && pickup) setPickupConfirmed(true);
    }
    setDropoffInput(addr);
    setDropoff(addr);
    setDropoffCoords([lng, lat]);
  }, [pickupConfirmed, pickupCoords, pickup]);

  // Book mutation
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
      setDropoff(""); setDropoffInput(""); setDropoffCoords(null);
      setPickupConfirmed(false);
      setRouteCoords(undefined);
      setRiderRouteCoords(undefined);
      setRouteEstimate(null);
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
        .eq("id", rideId)
        .eq("customer_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ride cancelled" });
      setRouteCoords(undefined);
      setRiderRouteCoords(undefined);
      queryClient.invalidateQueries({ queryKey: ["active-ride"] });
    },
    onError: (err: any) => {
      toast({ title: "Cancel failed", description: err.message, variant: "destructive" });
    },
  });

  const markers = useMemo(() => [
    ...(pickupConfirmed && pickupCoords ? [{ id: "pickup", lng: pickupCoords[0], lat: pickupCoords[1], color: "#3A7FD9", label: "Pickup" }] : []),
    ...(dropoffCoords ? [{ id: "dropoff", lng: dropoffCoords[0], lat: dropoffCoords[1], color: "#F59E0B", label: "Destination" }] : []),
    ...(activeRide?.pickup_lat && activeRide?.pickup_lng ? [{ id: "active-pickup", lng: activeRide.pickup_lng, lat: activeRide.pickup_lat, color: "#3A7FD9", label: "Pickup" }] : []),
    ...(activeRide?.dropoff_lat && activeRide?.dropoff_lng ? [{ id: "active-dropoff", lng: activeRide.dropoff_lng, lat: activeRide.dropoff_lat, color: "#F59E0B", label: "Dropoff" }] : []),
    ...(activeRide && riderLocation ? [{
      id: "rider-live",
      lng: riderLocation.lng ?? 0,
      lat: riderLocation.lat ?? 0,
      color: "#6FA8FF",
      label: "Your Rider 🏍️",
      animate: true,
      pulse: true,
    }] : []),
  ], [pickupConfirmed, pickupCoords, dropoffCoords, activeRide, riderLocation]);

  const pickupReady = pickupConfirmed && !!pickup.trim();
  const canBook = pickupReady && !!(dropoff.trim() || dropoffInput.trim()) && !!dropoffCoords;

  const handleRecenter = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not supported", description: "Your device doesn't support location services.", variant: "destructive" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapInstanceRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 15,
          duration: 800,
        });
      },
      () => {
        toast({ title: "Location unavailable", description: "Please enable location access in your device settings.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [toast]);

  if (loadingActive) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-56px-52px)] flex-col overflow-hidden bg-background">
      {activeRide ? (
        <div className="relative z-20 shrink-0 px-4 pt-3 pb-1 bg-background">
          <ActiveRideCard
            ride={activeRide}
            onCancel={() => cancelMutation.mutate(activeRide.id)}
            cancelling={cancelMutation.isPending}
            riderLocation={riderLocation}
            mapboxToken={mapboxToken}
          />
        </div>
      ) : (
        <>
          <div className="relative z-20 shrink-0 px-4 pt-3 pb-2">
            <div className="rounded-2xl bg-card border border-border shadow-sm p-4">
              <p className="text-sm font-bold text-foreground mb-3">Where to?</p>

              {/* Pickup row */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                </div>
                <div
                  className="flex-1 min-w-0 rounded-full bg-secondary/60 px-4 py-2.5 cursor-pointer"
                  onClick={pickupConfirmed ? resetPickup : undefined}
                >
                  {gpsStatus === "detecting" && !pickupConfirmed ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Detecting your location...</span>
                    </div>
                  ) : gpsStatus === "failed" && !pickup && !pickupConfirmed ? (
                    <div className="flex items-center gap-2">
                      <WifiOff className="h-3 w-3 text-destructive" />
                      <span className="text-xs text-muted-foreground">Move map to set pickup</span>
                    </div>
                  ) : (
                    <p className="truncate text-xs font-medium text-foreground">
                      {pickup || "Move map to set pickup"}
                    </p>
                  )}
                </div>
                {!pickupConfirmed ? (
                  <button
                    onClick={confirmPickup}
                    disabled={!pickupCoords || !pickup || pickup === "Locating address..."}
                    className="shrink-0 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground disabled:opacity-40 transition-colors active:bg-primary/80"
                  >
                    <Crosshair className="h-3 w-3" />
                    Pin
                  </button>
                ) : (
                  <button onClick={resetPickup} className="shrink-0 text-[10px] font-medium text-primary">
                    Change
                  </button>
                )}
              </div>

              {/* Destination row */}
              <div className="relative flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 rounded-full bg-secondary/60 px-4 py-2.5">
                  <Input
                    value={dropoffInput}
                    onChange={(e) => handleDropoffChange(e.target.value)}
                    onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={pickupConfirmed ? "Search or tap map for destination" : "Set pickup first"}
                    disabled={!pickupConfirmed}
                    className="h-auto border-0 bg-transparent p-0 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none disabled:opacity-50"
                  />
                </div>
                {dropoffInput && (
                  <button onClick={() => { setDropoffInput(""); setDropoff(""); setDropoffCoords(null); setSuggestions([]); setRouteCoords(undefined); setRouteEstimate(null); }} className="text-muted-foreground shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 top-full z-50 mt-1 mx-4 overflow-hidden rounded-xl border border-border bg-card shadow-xl max-h-56 overflow-y-auto"
                  >
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(s)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary border-b border-border last:border-0"
                      >
                        {s.isLandmark ? (
                          <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        ) : (
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-xs text-foreground line-clamp-2">{s.place_name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Recent & Frequent */}
          {pickupConfirmed && !dropoffCoords && !showSuggestions && (recentAndFrequent.recent.length > 0 || recentAndFrequent.frequent.length > 0) && (
            <div className="shrink-0 z-20 px-4 pb-1 max-h-36 overflow-y-auto">
              {recentAndFrequent.frequent.length > 0 && (
                <div className="mb-1">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    <TrendingUp className="h-3 w-3" /> Frequent
                  </p>
                  {recentAndFrequent.frequent.map((r, i) => (
                    <button key={`freq-${i}`} onClick={() => handleRebook(r.dropoff_address, r.dropoff_lat!, r.dropoff_lng!)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary mb-0.5"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <TrendingUp className="h-3 w-3 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium text-foreground">{r.dropoff_address}</p>
                        <p className="text-[10px] text-muted-foreground">{(r as any).count} rides</p>
                      </div>
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
                    <button key={`rec-${i}`} onClick={() => handleRebook(r.dropoff_address, r.dropoff_lat!, r.dropoff_lng!)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-secondary mb-0.5"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary">
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="truncate text-[11px] font-medium text-foreground min-w-0 flex-1">{r.dropoff_address}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <MapboxMap
          className="h-full w-full"
          showCenterPin={!pickupConfirmed && !activeRide}
          onCenterChange={!pickupConfirmed && !activeRide ? handleCenterChange : undefined}
          onMapClick={pickupConfirmed && !activeRide ? handleMapClick : undefined}
          onGeolocate={!activeRide ? handleGeolocate : undefined}
          showGeolocate={!activeRide}
          markers={markers}
          routeCoords={routeCoords}
          secondaryRouteCoords={riderRouteCoords}
          mapRef={mapInstanceRef}
        />
        <MapControls mapRef={mapInstanceRef} onRecenter={handleRecenter} />

        {/* Map tap hint when pickup confirmed but no destination */}
        {pickupConfirmed && !dropoffCoords && !activeRide && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="flex items-center gap-2 rounded-full bg-card/95 backdrop-blur-sm border border-border px-4 py-2 shadow-md">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Tap map or search for destination</span>
            </div>
          </motion.div>
        )}

        {/* Route estimate badges */}
        {routeEstimate && !activeRide && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-3 left-3 z-10 flex gap-2"
          >
            <div className="flex items-center gap-1.5 rounded-xl bg-card/95 backdrop-blur-sm border border-border px-3 py-2 shadow-md">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">{routeEstimate.distanceKm.toFixed(1)} km</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-card/95 backdrop-blur-sm border border-border px-3 py-2 shadow-md">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-foreground">{routeEstimate.durationMin} min</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom booking panel */}
      {!activeRide && (
        <BottomBookingPanel
          routeEstimate={routeEstimate}
          rideType={rideType}
          onRideTypeChange={setRideType}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          scheduleMode={scheduleMode}
          onScheduleModeChange={setScheduleMode}
          onBook={() => bookMutation.mutate()}
          booking={bookMutation.isPending}
          canBook={canBook}
        />
      )}

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

/* ─── Active Ride Card ─── */
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
        const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${riderLocation.lng},${riderLocation.lat};${destLng},${destLat}?overview=false&access_token=${mapboxToken}`);
        const data = await res.json();
        if (!cancelled && data.routes?.[0]) {
          setRiderEta({ distanceKm: data.routes[0].distance / 1000, durationMin: Math.ceil(data.routes[0].duration / 60) });
        }
      } catch { if (!cancelled) setRiderEta(null); }
    };
    fetchEta();
    const interval = setInterval(fetchEta, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [riderLocation?.lat, riderLocation?.lng, ride.status, mapboxToken]);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("booking_events").insert({
        ride_id: ride.id, event_type: "customer_confirmed", actor_id: ride.customer_id, actor_role: "customer",
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
    <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}>
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <Badge className={`${config.color} border text-xs font-medium`}>
            <StatusIcon className="mr-1 h-3 w-3" />{config.label}
          </Badge>
          {ride.status === "requested" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />Searching...
            </div>
          )}
        </div>

        {/* Addresses */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(214_65%_54%/0.4)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium text-foreground">{ride.pickup_address}</p>
            </div>
          </div>
          <div className="ml-1 h-4 border-l border-dashed border-border" />
          <div className="flex items-start gap-3">
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-warning shadow-[0_0_8px_hsl(38_95%_55%/0.4)]" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dropoff</p>
              <p className="text-sm font-medium text-foreground">{ride.dropoff_address}</p>
            </div>
          </div>
        </div>

        {/* ETA display */}
        {riderEta && ride.status !== "requested" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-info/10 border border-info/20 px-3 py-2.5">
              <Navigation className="h-4 w-4 text-info" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-info/70">Distance</p>
                <p className="text-sm font-bold text-info">
                  {riderEta.distanceKm < 1 ? `${Math.round(riderEta.distanceKm * 1000)}m` : `${riderEta.distanceKm.toFixed(1)} km`}
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

        {/* Rider approaching indicator (when no ETA yet) */}
        {!riderEta && ride.status !== "requested" && riderLocation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-2 rounded-xl bg-info/10 border border-info/20 px-3 py-2.5">
            <div className="h-2 w-2 rounded-full bg-info animate-pulse" />
            <span className="text-xs font-medium text-info">
              {ride.status === "picked_up" ? "Heading to destination..." : "Rider is on the way..."}
            </span>
          </motion.div>
        )}

        {/* Fare */}
        {ride.fare && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
            <span className="text-xs text-muted-foreground">Estimated Fare</span>
            <span className="text-lg font-bold text-foreground">₱{Number(ride.fare).toFixed(2)}</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-4 flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= currentIdx ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        {/* Actions */}
        {ride.status === "picked_up" && (
          <Button className="mt-4 h-12 w-full text-sm font-semibold" onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
            {confirmMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Confirm Trip Ended
          </Button>
        )}
        {ride.status === "requested" && (
          <Button variant="ghost" className="mt-4 w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onCancel} disabled={cancelling}>
            {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Cancel Ride
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Bottom Booking Panel ─── */
function BottomBookingPanel({
  routeEstimate, rideType, onRideTypeChange, paymentMethod, onPaymentMethodChange,
  scheduleMode, onScheduleModeChange, onBook, booking, canBook,
}: {
  routeEstimate: { distanceKm: number; durationMin: number; fare: number } | null;
  rideType: "motorcycle" | "car" | "delivery";
  onRideTypeChange: (t: "motorcycle" | "car" | "delivery") => void;
  paymentMethod: "cash" | "wallet";
  onPaymentMethodChange: (p: "cash" | "wallet") => void;
  scheduleMode: "now" | "scheduled";
  onScheduleModeChange: (s: "now" | "scheduled") => void;
  onBook: () => void;
  booking: boolean;
  canBook: boolean;
}) {
  const rideTypes = [
    { id: "motorcycle" as const, label: "Motorcycle", icon: Bike },
    { id: "car" as const, label: "Car", icon: Car },
    { id: "delivery" as const, label: "Delivery", icon: Package },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-20 shrink-0 border-t border-border bg-card px-4 pt-3 pb-4 safe-bottom"
    >
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => onPaymentMethodChange(paymentMethod === "cash" ? "wallet" : "cash")}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5"
        >
          {paymentMethod === "cash" ? <Banknote className="h-4 w-4 text-muted-foreground" /> : <Wallet className="h-4 w-4 text-primary" />}
          <span className="text-sm font-medium text-foreground capitalize">{paymentMethod}</span>
        </button>
        <button
          onClick={() => onScheduleModeChange(scheduleMode === "now" ? "scheduled" : "now")}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2.5"
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {scheduleMode === "now" ? "Now" : "Scheduled"}
          </span>
        </button>
      </div>

      <div className="mb-3 flex gap-2 justify-center">
        {rideTypes.map((rt) => {
          const active = rideType === rt.id;
          return (
            <button
              key={rt.id}
              onClick={() => onRideTypeChange(rt.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border px-3 py-3 transition-all ${
                active ? "border-primary/30 bg-primary/5" : "border-transparent bg-secondary/60"
              }`}
            >
              <rt.icon className={`h-6 w-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}>{rt.label}</span>
            </button>
          );
        })}
      </div>

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
              ₱ {routeEstimate ? routeEstimate.fare.toFixed(0) : "—"}
            </span>
            <span className="text-base font-bold">Order</span>
          </div>
        )}
      </Button>
    </motion.div>
  );
}

/* ─── Ride History ─── */
function RideHistory() {
  const { user } = useAuth();
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [showSupport, setShowSupport] = useState(false);

  const { data: rides, isLoading } = useQuery({
    queryKey: ["ride-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*").eq("customer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const rideIds = rides?.filter(r => r.status === "completed").map(r => r.id) || [];
  const { data: ratings } = useQuery({
    queryKey: ["ride-ratings", rideIds],
    queryFn: async () => {
      if (!rideIds.length) return [];
      const { data, error } = await supabase.from("ratings").select("ride_id, rating, comment").eq("rater_id", user!.id).in("ride_id", rideIds);
      if (error) throw error;
      return data;
    },
    enabled: !!user && rideIds.length > 0,
  });

  const riderIds = rides?.filter(r => r.rider_id).map(r => r.rider_id!) || [];
  const { data: riderProfiles } = useQuery({
    queryKey: ["rider-profiles", riderIds],
    queryFn: async () => {
      if (!riderIds.length) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", riderIds);
      return data || [];
    },
    enabled: riderIds.length > 0,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["rider-vehicles", riderIds],
    queryFn: async () => {
      if (!riderIds.length) return [];
      const { data } = await supabase.from("vehicles").select("rider_id, vehicle_type, make, model, color, plate_number").in("rider_id", riderIds);
      return data || [];
    },
    enabled: riderIds.length > 0,
  });

  const ratingMap = new Map(ratings?.map(r => [r.ride_id, r]) || []);
  const profileMap = new Map(riderProfiles?.map(p => [p.user_id, p]) || []);
  const vehicleMap = new Map(vehicles?.map(v => [v.rider_id, v]) || []);

  if (selectedRide) {
    const config = statusConfig[selectedRide.status as RideStatus];
    const review = ratingMap.get(selectedRide.id);
    const riderProfile = selectedRide.rider_id ? profileMap.get(selectedRide.rider_id) : null;
    const vehicle = selectedRide.rider_id ? vehicleMap.get(selectedRide.rider_id) : null;

    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => { setSelectedRide(null); setShowSupport(false); }} className="text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Ride History</h2>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-card p-5 mb-6"
        >
          <div className="flex justify-end mb-2">
            <Badge className={`${config.color} border text-[10px]`}>{config.label}</Badge>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="flex flex-col items-center gap-1 mt-1">
              <div className="h-3 w-3 rounded-full border-2 border-primary bg-primary/20" />
              <div className="w-0.5 h-6 bg-border" />
              <MapPin className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground">From:</p>
                <p className="text-sm font-medium text-foreground truncate">{selectedRide.pickup_address}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">To:</p>
                <p className="text-sm font-medium text-foreground truncate">{selectedRide.dropoff_address}</p>
              </div>
            </div>
          </div>

          {riderProfile && (
            <div className="flex items-center gap-3 mb-3 py-2 border-t border-border/50">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <Bike className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Rider: <span className="font-medium text-foreground">{riderProfile.full_name || "Unknown"}</span></p>
                {vehicle && (
                  <p className="text-[10px] text-muted-foreground">
                    Motorcycle: <span className="font-medium text-foreground">{vehicle.make || ""} {vehicle.model || ""}, {vehicle.color || ""}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {vehicle?.plate_number && (
            <div className="flex items-center gap-3 py-2 border-t border-border/50">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <Car className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                License Plate Number: <span className="font-bold text-foreground">{vehicle.plate_number}</span>
              </p>
            </div>
          )}

          <div className="flex justify-center gap-1 mt-4">
            {review ? (
              Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className={`h-5 w-5 ${j < review.rating ? "fill-warning text-warning" : "text-muted-foreground/20"}`} />
              ))
            ) : (
              Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className="h-5 w-5 text-muted-foreground/20" />
              ))
            )}
          </div>
        </motion.div>

        {selectedRide.dropoff_lat && selectedRide.dropoff_lng && (
          <Button className="w-full h-12 rounded-full text-base font-bold mb-4" onClick={() => setSelectedRide(null)}>
            <RotateCw className="mr-2 h-4 w-4" />
            Repeat Order
          </Button>
        )}

        <div className="flex flex-col items-center">
          <button onClick={() => setShowSupport(!showSupport)} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">Support</span>
          </button>
        </div>

        <AnimatePresence>
          {showSupport && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-gradient-to-b from-primary/10 to-card border-t border-primary/20 shadow-2xl pb-20"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-border" />
              </div>
              <h3 className="px-5 pb-3 text-base font-bold text-foreground">Support</h3>
              <div className="px-5 space-y-1">
                {["Payment Issue", "Long Wait", "Lost and Found", "Feedback", "Cooperative Building", "Editing Personal Data", "Other Issue"].map((item) => (
                  <button
                    key={item}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary"
                    onClick={() => setShowSupport(false)}
                  >
                    <Star className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-foreground">Ride History</h2>
      {isLoading ? <LoadingSkeleton /> : !rides?.length ? (
        <div className="glass-card p-8 text-center"><Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">No rides yet</p></div>
      ) : (
        <div className="space-y-2.5">
          {rides.map((ride, i) => {
            const config = statusConfig[ride.status as RideStatus];
            const review = ratingMap.get(ride.id);
            const riderProfile = ride.rider_id ? profileMap.get(ride.rider_id) : null;
            return (
              <motion.div key={ride.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-border bg-card p-4 cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => setSelectedRide(ride)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{ride.pickup_address}</p>
                    {riderProfile && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <Bike className="inline h-3 w-3 mr-1" />
                        Rider: {riderProfile.full_name || "Unknown"}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(ride.created_at).toLocaleDateString()} · {new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right space-y-1.5">
                    <Badge className={`${config.color} border text-[10px]`}>{config.label}</Badge>
                    {ride.fare && <p className="text-sm font-bold text-foreground">₱{Number(ride.fare).toFixed(2)}</p>}
                  </div>
                </div>

                {ride.status === "completed" && review && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: review.rating }).map((_, j) => (<Star key={j} className="h-3.5 w-3.5 fill-warning text-warning" />))}
                      {Array.from({ length: 5 - review.rating }).map((_, j) => (<Star key={j} className="h-3.5 w-3.5 text-muted-foreground/20" />))}
                    </div>
                    {review.comment && <p className="text-xs text-muted-foreground italic">"{review.comment}"</p>}
                  </div>
                )}
                {ride.status === "completed" && !review && (
                  <p className="text-[10px] text-muted-foreground/50 italic">No reviews available</p>
                )}
                {ride.status === "cancelled" && (
                  <p className="text-[10px] text-muted-foreground/50 italic">No reviews available</p>
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
      {[1, 2, 3].map((i) => (<div key={i} className="glass-card h-20 animate-pulse bg-secondary/50" />))}
    </div>
  );
}
