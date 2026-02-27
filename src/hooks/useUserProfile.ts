import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfileData {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  status_text: string | null;
  status_type: string;
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
        bio: (profile as any).bio || null,
        status_text: (profile as any).status_text || null,
        status_type: (profile as any).status_type || "online",
        created_at: profile.created_at,
        roles,
      };

      const primaryRole = roles[0];

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

/** Update own profile */
export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      full_name?: string;
      phone?: string;
      bio?: string;
      status_text?: string;
      status_type?: string;
      avatar_url?: string;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
    },
  });
}

/** Upload avatar */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { contentType: file.type, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
  return `${data.publicUrl}?t=${Date.now()}`;
}
