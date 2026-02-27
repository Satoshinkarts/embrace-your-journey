import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RiderRanking {
  rank_position: number;
  total_riders: number;
  avg_rating: number;
  total_reviews: number;
  completed_rides: number;
}

export interface AllRiderRanking extends RiderRanking {
  user_id: string;
  full_name: string;
}

export interface RideWithRating {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  status: string;
  fare: number | null;
  distance_km: number | null;
  created_at: string;
  completed_at: string | null;
  started_at: string | null;
  customer_rating: number | null;
  customer_comment: string | null;
}

export function useRiderRanking() {
  const { user } = useAuth();

  return useQuery<RiderRanking>({
    queryKey: ["rider-ranking", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_rider_ranking", {
        _rider_id: user!.id,
      } as any);
      if (error) throw error;
      return data as unknown as RiderRanking;
    },
    enabled: !!user,
  });
}

export function useAllRiderRankings() {
  return useQuery<AllRiderRanking[]>({
    queryKey: ["all-rider-rankings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_all_rider_rankings" as any);
      if (error) throw error;
      return (data as unknown as AllRiderRanking[]) || [];
    },
  });
}

export function useRiderReviews(riderId?: string) {
  const { user } = useAuth();
  const targetId = riderId || user?.id;

  return useQuery({
    queryKey: ["rider-reviews", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("rated_id", targetId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!targetId,
  });
}

/** Fetch all completed rides for the rider, with customer rating joined */
export function useRiderRidesWithRatings(riderId?: string) {
  const { user } = useAuth();
  const targetId = riderId || user?.id;

  return useQuery<RideWithRating[]>({
    queryKey: ["rider-rides-with-ratings", targetId],
    queryFn: async () => {
      // Fetch completed rides
      const { data: rides, error: ridesError } = await supabase
        .from("rides")
        .select("id, pickup_address, dropoff_address, status, fare, distance_km, created_at, completed_at, started_at")
        .eq("rider_id", targetId!)
        .eq("status", "completed" as any)
        .order("created_at", { ascending: false });
      if (ridesError) throw ridesError;

      if (!rides?.length) return [];

      // Fetch ratings for these rides (customer → rider)
      const rideIds = rides.map((r: any) => r.id);
      const { data: ratings, error: ratingsError } = await supabase
        .from("ratings")
        .select("ride_id, rating, comment")
        .eq("rated_id", targetId!)
        .in("ride_id", rideIds);
      if (ratingsError) throw ratingsError;

      const ratingMap = new Map<string, { rating: number; comment: string | null }>();
      (ratings || []).forEach((r: any) => {
        ratingMap.set(r.ride_id, { rating: r.rating, comment: r.comment });
      });

      return (rides as any[]).map((ride) => ({
        ...ride,
        customer_rating: ratingMap.get(ride.id)?.rating ?? null,
        customer_comment: ratingMap.get(ride.id)?.comment ?? null,
      }));
    },
    enabled: !!targetId,
  });
}
