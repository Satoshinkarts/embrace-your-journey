import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RiderLiveLocation {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
}

/**
 * Subscribe to a specific rider's real-time location.
 * Used by customers to see their rider on the map during an active ride.
 */
export function useRiderLocationRealtime(riderId: string | null | undefined) {
  const [location, setLocation] = useState<RiderLiveLocation | null>(null);

  useEffect(() => {
    if (!riderId) {
      setLocation(null);
      return;
    }

    // Initial fetch
    (async () => {
      const { data } = await supabase
        .from("rider_locations")
        .select("lat, lng, heading, speed")
        .eq("rider_id", riderId)
        .maybeSingle();
      if (data) {
        setLocation({ lat: data.lat, lng: data.lng, heading: data.heading, speed: data.speed });
      }
    })();

    // Realtime subscription
    const channel = supabase
      .channel(`rider-loc-${riderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rider_locations",
          filter: `rider_id=eq.${riderId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (row?.lat && row?.lng) {
            setLocation({ lat: row.lat, lng: row.lng, heading: row.heading, speed: row.speed });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderId]);

  return location;
}
