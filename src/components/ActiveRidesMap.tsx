import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import MapboxMap from "@/components/MapboxMap";
import { Badge } from "@/components/ui/badge";

const statusColor: Record<string, string> = {
  requested: "bg-warning/10 text-warning border-warning/30",
  accepted: "bg-info/10 text-info border-info/30",
  en_route: "bg-info/10 text-info border-info/30",
  picked_up: "bg-primary/10 text-primary border-primary/30",
  completed: "bg-primary/10 text-primary border-primary/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const markerColor: Record<string, string> = {
  requested: "#f59e0b",
  accepted: "#4facfe",
  en_route: "#4facfe",
  picked_up: "#22c55e",
};

export default function ActiveRidesMap() {
  const { data: rides } = useQuery({
    queryKey: ["active-rides-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .in("status", ["requested", "accepted", "en_route", "picked_up"] as any)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const activeRides = rides || [];

  const markers = activeRides
    .filter((r) => r.pickup_lat && r.pickup_lng)
    .map((r) => ({
      id: r.id,
      lng: r.pickup_lng!,
      lat: r.pickup_lat!,
      color: markerColor[r.status] || "#4facfe",
      label: `${r.pickup_address} → ${r.dropoff_address} (${r.status.replace("_", " ")})`,
    }));

  return (
    <div className="relative flex h-[calc(100dvh-56px)] flex-col">
      <MapboxMap className="absolute inset-0" markers={markers} />

      {/* Header overlay */}
      <div className="absolute top-3 left-4 right-4 z-20">
        <div className="glass-card flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="pulse-dot" />
            <span className="text-xs font-medium text-foreground">Live Tracking</span>
          </div>
          <Badge className="bg-secondary text-foreground border-border border text-[10px]">
            {activeRides.length} active
          </Badge>
        </div>
      </div>

      {/* Bottom ride list */}
      <div className="relative z-20 mt-auto">
        <div className="map-gradient-bottom pt-8 pb-20">
          <div className="mx-4 space-y-2 max-h-48 overflow-y-auto">
            {activeRides.slice(0, 8).map((ride, i) => (
              <motion.div
                key={ride.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {ride.pickup_address} → {ride.dropoff_address}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ride.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge
                    className={`${statusColor[ride.status] || "bg-secondary text-foreground"} border text-[10px] capitalize shrink-0`}
                  >
                    {(ride.status as string).replace("_", " ")}
                  </Badge>
                </div>
              </motion.div>
            ))}
            {activeRides.length === 0 && (
              <div className="glass-card p-4 text-center">
                <p className="text-xs text-muted-foreground">No active rides right now</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
