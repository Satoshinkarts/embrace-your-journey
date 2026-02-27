import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DMChannel {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  other_user?: { full_name: string | null; avatar_url: string | null; status_type: string };
  last_message?: string;
  unread_count?: number;
}

export interface DMMessage {
  id: string;
  dm_channel_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
}

/** Get or create a DM channel with another user */
export function useGetOrCreateDM() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Ensure consistent ordering
      const [u1, u2] = [user.id, otherUserId].sort();

      // Check existing
      const { data: existing } = await supabase
        .from("dm_channels")
        .select("*")
        .or(`and(user1_id.eq.${u1},user2_id.eq.${u2})`)
        .maybeSingle();

      if (existing) return existing.id as string;

      // Create new
      const { data, error } = await supabase
        .from("dm_channels")
        .insert({ user1_id: u1, user2_id: u2 } as any)
        .select()
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dm-channels"] });
    },
  });
}

/** Fetch all DM channels for current user */
export function useDMChannels() {
  const { user } = useAuth();

  return useQuery<DMChannel[]>({
    queryKey: ["dm-channels", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dm_channels")
        .select("*")
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const channels = (data || []) as unknown as DMChannel[];

      // Fetch other user profiles
      const otherIds = channels.map((ch) =>
        ch.user1_id === user!.id ? ch.user2_id : ch.user1_id
      );

      if (otherIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, status_type")
          .in("user_id", otherIds);

        const profileMap = new Map(
          (profiles || []).map((p) => [p.user_id, p])
        );

        channels.forEach((ch) => {
          const otherId = ch.user1_id === user!.id ? ch.user2_id : ch.user1_id;
          const p = profileMap.get(otherId);
          if (p) {
            ch.other_user = {
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              status_type: p.status_type || "online",
            };
          }
        });
      }

      return channels;
    },
    enabled: !!user,
  });
}

/** Fetch DM messages */
export function useDMMessages(dmChannelId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery<DMMessage[]>({
    queryKey: ["dm-messages", dmChannelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("dm_channel_id", dmChannelId!)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data as unknown as DMMessage[]) || [];
    },
    enabled: !!dmChannelId,
  });

  // Realtime
  useEffect(() => {
    if (!dmChannelId) return;

    const channel = supabase
      .channel(`dm-${dmChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `dm_channel_id=eq.${dmChannelId}`,
        },
        (payload) => {
          queryClient.setQueryData<DMMessage[]>(
            ["dm-messages", dmChannelId],
            (old) => [...(old || []), payload.new as DMMessage]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dmChannelId, queryClient]);

  return query;
}

/** Send a DM */
export function useSendDM() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dmChannelId,
      content,
    }: {
      dmChannelId: string;
      content: string;
    }) => {
      const { error } = await supabase.from("dm_messages").insert({
        dm_channel_id: dmChannelId,
        sender_id: user!.id,
        content,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["dm-messages", vars.dmChannelId] });
    },
  });
}
