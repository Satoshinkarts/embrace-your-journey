import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfileData {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
  // Role-specific stats
  completedRides?: number;
  totalEarnings?: number;
  avgRating?: number;
  totalReviews?: number;
  totalDispatched?: number;
  totalVehicles?: number;
  totalUsers?: number;
}

export function useUserProfile() {
  const { user, roles } = useAuth();

  return useQuery<UserProfileData>({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      // Fetch profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;

      const result: UserProfileData = {
        full_name: profile.full_name,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
        roles,
      };

      const primaryRole = roles[0];

      // Fetch role-specific stats
      if (primaryRole === "rider") {
        const [ridesRes, ratingsRes] = await Promise.all([
          supabase.from("rides").select("id, fare", { count: "exact" }).eq("rider_id", user!.id).eq("status", "completed" as any),
          supabase.from("ratings").select("rating").eq("rated_id", user!.id),
        ]);
        result.completedRides = ridesRes.count || 0;
        result.totalEarnings = (ridesRes.data || []).reduce((s, r) => s + Number(r.fare || 0), 0);
        const ratings = ratingsRes.data || [];
        result.totalReviews = ratings.length;
        result.avgRating = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
      } else if (primaryRole === "customer") {
        const { count } = await supabase.from("rides").select("id", { count: "exact" }).eq("customer_id", user!.id).eq("status", "completed" as any);
        result.completedRides = count || 0;
      } else if (primaryRole === "dispatcher") {
        const { count } = await supabase.from("rides").select("id", { count: "exact" }).not("dispatcher_id", "is", null);
        result.totalDispatched = count || 0;
      } else if (primaryRole === "operator") {
        const { count: vehicleCount } = await supabase.from("vehicles").select("id", { count: "exact" });
        result.totalVehicles = vehicleCount || 0;
      } else if (primaryRole === "admin") {
        const { count: userCount } = await supabase.from("profiles").select("id", { count: "exact" });
        result.totalUsers = userCount || 0;
      }

      return result;
    },
    enabled: !!user,
  });
}
