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
