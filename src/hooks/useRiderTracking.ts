import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RiderLocation {
  id: string;
  rider_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  is_online: boolean;
  last_seen_at: string;
}

export interface DispatchDirective {
  id: string;
  rider_id: string;
  operator_id: string;
  destination_address: string;
  destination_lat: number | null;
  destination_lng: number | null;
  instructions: string | null;
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
}

/**
 * Tracks rider's GPS location and sends updates every N seconds.
 * Also sets the rider as "online" when active, "offline" on unmount.
 */
export function useRiderLocationTracker(intervalMs = 10000) {
  // intervalMs = 0 means disabled (offline)
  const { user } = useAuth();
  const watchIdRef = useRef<number | null>(null);
  const latestPos = useRef<{ lat: number; lng: number; heading: number | null; speed: number | null } | null>(null);

  useEffect(() => {
    if (!user || !navigator.geolocation || intervalMs === 0) return;

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        latestPos.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        };
      },
      (err) => console.warn("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    // Send updates periodically
    const sendUpdate = async () => {
      if (!latestPos.current) return;
      const { lat, lng, heading, speed } = latestPos.current;

      await supabase
        .from("rider_locations")
        .upsert(
          {
            rider_id: user.id,
            lat,
            lng,
            heading,
            speed,
            is_online: true,
            last_seen_at: new Date().toISOString(),
          } as any,
          { onConflict: "rider_id" }
        );
    };

    // Initial send
    const initialTimeout = setTimeout(sendUpdate, 2000);
    const interval = setInterval(sendUpdate, intervalMs);

    // Go offline on unmount
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      // Mark offline
      supabase
        .from("rider_locations")
        .update({ is_online: false } as any)
        .eq("rider_id", user.id)
        .then(() => {});
    };
  }, [user, intervalMs]);
}

/** Fetch all rider locations (for operator/admin map) */
export function useAllRiderLocations() {
  const queryClient = useQueryClient();

  const query = useQuery<RiderLocation[]>({
    queryKey: ["all-rider-locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rider_locations")
        .select("*")
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as RiderLocation[]) || [];
    },
    refetchInterval: 5000,
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("rider-locations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rider_locations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-rider-locations"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

/** Fetch rider profiles for name lookup */
export function useRiderProfiles() {
  return useQuery({
    queryKey: ["rider-profiles-for-dispatch"],
    queryFn: async () => {
      const { data: roles, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider" as any);
      if (roleErr) throw roleErr;
      if (!roles?.length) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", roles.map((r) => r.user_id));
      if (error) throw error;
      return data || [];
    },
  });
}

/** Create a dispatch directive */
export function useCreateDirective() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      riderId: string;
      destinationAddress: string;
      destinationLat?: number;
      destinationLng?: number;
      instructions?: string;
    }) => {
      const { error } = await supabase.from("dispatch_directives").insert({
        rider_id: params.riderId,
        operator_id: user!.id,
        destination_address: params.destinationAddress,
        destination_lat: params.destinationLat || null,
        destination_lng: params.destinationLng || null,
        instructions: params.instructions || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-directives"] });
    },
  });
}

/** Fetch active directives for a rider (pending/acknowledged) */
export function useRiderDirectives() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<DispatchDirective[]>({
    queryKey: ["rider-directives", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_directives")
        .select("*")
        .eq("rider_id", user!.id)
        .in("status", ["pending", "acknowledged"] as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as DispatchDirective[]) || [];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`directives-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dispatch_directives",
          filter: `rider_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["rider-directives", user.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
}

/** Acknowledge or complete a directive */
export function useUpdateDirective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "acknowledged" | "completed" | "cancelled" }) => {
      const updates: Record<string, any> = { status };
      if (status === "acknowledged") updates.acknowledged_at = new Date().toISOString();
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
      const { error } = await supabase.from("dispatch_directives").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-directives"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-directives"] });
    },
  });
}
