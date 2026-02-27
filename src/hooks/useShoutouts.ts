import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Shoutout {
  id: string;
  created_by: string;
  assigned_to: string;
  title: string;
  message: string | null;
  category: string;
  created_at: string;
}

/** Fetch shoutouts visible to the current user */
export function useShoutouts() {
  return useQuery<Shoutout[]>({
    queryKey: ["shoutouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoutouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Shoutout[]) || [];
    },
  });
}

/** Create a shoutout (operator/admin only) */
export function useCreateShoutout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignedTo,
      title,
      message,
      category = "recognition",
    }: {
      assignedTo: string;
      title: string;
      message?: string;
      category?: string;
    }) => {
      const { data, error } = await supabase
        .from("shoutouts")
        .insert({
          created_by: user!.id,
          assigned_to: assignedTo,
          title,
          message: message || null,
          category,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoutouts"] });
    },
  });
}

/** Delete a shoutout */
export function useDeleteShoutout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shoutouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoutouts"] });
    },
  });
}
