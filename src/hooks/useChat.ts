import { useEffect, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatChannel {
  id: string;
  rider_id: string | null;
  channel_type: string;
  name: string | null;
  description: string | null;
  icon: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_role: string;
  message_type: string;
  content: string | null;
  image_url: string | null;
  image_metadata: Record<string, any> | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

/** Fetch all shared channels visible to this user */
export function useSharedChannels() {
  return useQuery<ChatChannel[]>({
    queryKey: ["shared-channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_channels")
        .select("*")
        .is("rider_id", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as ChatChannel[]) || [];
    },
  });
}

/** Get or create the rider's private chat channel (legacy support) */
export function useChatChannel(riderId?: string) {
  const { user } = useAuth();
  const targetRiderId = riderId || user?.id;

  return useQuery<string>({
    queryKey: ["chat-channel", targetRiderId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_or_create_rider_channel" as any, {
        _rider_id: targetRiderId!,
      });
      if (error) throw error;
      return data as unknown as string;
    },
    enabled: !!targetRiderId,
    staleTime: Infinity,
  });
}

/** Fetch messages for a channel with pagination */
export function useChatMessages(channelId?: string) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const query = useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", channelId, page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", channelId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return (data as unknown as ChatMessage[])?.reverse() || [];
    },
    enabled: !!channelId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel(`chat-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            queryClient.setQueryData<ChatMessage[]>(
              ["chat-messages", channelId, 0],
              (old) => [...(old || []), payload.new as ChatMessage]
            );
          } else if (payload.eventType === "UPDATE") {
            queryClient.setQueryData<ChatMessage[]>(
              ["chat-messages", channelId, 0],
              (old) =>
                old?.map((m) =>
                  m.id === (payload.new as ChatMessage).id ? (payload.new as ChatMessage) : m
                ) || []
            );
          } else if (payload.eventType === "DELETE") {
            queryClient.setQueryData<ChatMessage[]>(
              ["chat-messages", channelId, 0],
              (old) => old?.filter((m) => m.id !== (payload.old as any).id) || []
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, queryClient]);

  const loadMore = useCallback(() => setPage((p) => p + 1), []);

  return { ...query, loadMore, page };
}

/** Send a message */
export function useSendMessage() {
  const { user, roles } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      content,
      messageType = "text",
      imageUrl,
      imageMetadata,
    }: {
      channelId: string;
      content?: string;
      messageType?: string;
      imageUrl?: string;
      imageMetadata?: Record<string, any>;
    }) => {
      const senderRole = roles.includes("operator") || roles.includes("admin")
        ? "operator"
        : "rider";

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          channel_id: channelId,
          sender_id: user!.id,
          sender_role: senderRole,
          message_type: messageType,
          content: content || null,
          image_url: imageUrl || null,
          image_metadata: imageMetadata || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", vars.channelId] });
    },
  });
}

/** Upload an image to the chat-images bucket */
export async function uploadChatImage(
  file: File,
  userId: string
): Promise<{ url: string; metadata: Record<string, any> }> {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed");
  }

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Image must be less than 10MB");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("chat-images")
    .upload(fileName, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const { data: signedData, error: signError } = await supabase.storage
    .from("chat-images")
    .createSignedUrl(fileName, 3600);
  if (signError) throw signError;

  const metadata: Record<string, any> = {
    original_filename: file.name,
    file_size: file.size,
    mime_type: file.type,
    storage_path: fileName,
    uploaded_at: new Date().toISOString(),
  };

  try {
    const dims = await getImageDimensions(file);
    metadata.image_width = dims.width;
    metadata.image_height = dims.height;
  } catch {
    // dimensions unavailable
  }

  return { url: signedData.signedUrl, metadata };
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/** Create a new shared channel (operator/admin only) */
export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      icon = "hash",
      channelType = "shared",
    }: {
      name: string;
      description?: string;
      icon?: string;
      channelType?: string;
    }) => {
      const { data, error } = await supabase
        .from("chat_channels")
        .insert({
          name,
          description: description || null,
          icon,
          channel_type: channelType,
          rider_id: null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-channels"] });
    },
  });
}

/** Delete a channel (operator/admin only) */
export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase.from("chat_channels").delete().eq("id", channelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-channels"] });
    },
  });
}

/** Format relative time */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
