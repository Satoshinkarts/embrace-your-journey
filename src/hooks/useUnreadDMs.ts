import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Returns the total count of unread DM messages for the current user */
export function useUnreadDMCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<number>({
    queryKey: ["unread-dm-count", user?.id],
    queryFn: async () => {
      // Get all DM channels for user
      const { data: channels, error: chErr } = await supabase
        .from("dm_channels")
        .select("id")
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`);
      if (chErr || !channels?.length) return 0;

      const channelIds = channels.map((c) => c.id);

      // Count unread messages (not sent by me, not read)
      const { count, error } = await supabase
        .from("dm_messages")
        .select("*", { count: "exact", head: true })
        .in("dm_channel_id", channelIds)
        .neq("sender_id", user!.id)
        .is("read_at", null);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // poll every 30s as backup
  });

  // Realtime: invalidate on new DM messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("unread-dm-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-dm-count", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query.data || 0;
}
