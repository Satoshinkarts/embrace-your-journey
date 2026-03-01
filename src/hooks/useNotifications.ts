import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: any;
  read_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery<Notification[]>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = query.data?.filter((n) => !n.read_at).length || 0;

  // Realtime: show toast and invalidate on new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          toast({ title: newNotif.title, description: newNotif.body || undefined });
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as any)
      .eq("id", notificationId);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .is("read_at", null);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return {
    notifications: query.data || [],
    unreadCount,
    isLoading: query.isLoading,
    markAsRead,
    markAllAsRead,
  };
}
