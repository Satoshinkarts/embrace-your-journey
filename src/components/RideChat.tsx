import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useGetOrCreateDM, useDMMessages, useSendDM } from "@/hooks/useDirectMessages";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RideChatProps {
  otherUserId: string;
  otherUserName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelReady?: (channelId: string) => void;
}

/** Hook: typing indicator via Realtime broadcast */
function useTypingIndicator(dmChannelId: string | null, userId: string | undefined) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!dmChannelId || !userId) return;

    const ch = supabase.channel(`typing-${dmChannelId}`);
    ch.on("broadcast", { event: "typing" }, (payload: any) => {
      if (payload.payload?.user_id !== userId) {
        setIsOtherTyping(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
      }
    }).subscribe();

    channelRef.current = ch;
    return () => {
      clearTimeout(timeoutRef.current);
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [dmChannelId, userId]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return; // throttle to every 2s
    lastSentRef.current = now;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: userId } });
  }, [userId]);

  return { isOtherTyping, sendTyping };
}

/** Hook: unread count for a specific DM channel */
function useChannelUnread(dmChannelId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<number>({
    queryKey: ["dm-channel-unread", dmChannelId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("dm_messages")
        .select("*", { count: "exact", head: true })
        .eq("dm_channel_id", dmChannelId!)
        .neq("sender_id", user!.id)
        .is("read_at", null);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!dmChannelId && !!user,
    refetchInterval: 30000,
  });

  // Realtime: refresh on new messages in this channel + alert
  useEffect(() => {
    if (!dmChannelId || !user) return;
    const channel = supabase
      .channel(`unread-ch-${dmChannelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `dm_channel_id=eq.${dmChannelId}` },
        (payload: any) => {
          if (payload.new?.sender_id !== user.id) {
            queryClient.invalidateQueries({ queryKey: ["dm-channel-unread", dmChannelId] });
            // Sound + vibration alert
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.2);
            } catch {}
            try { navigator.vibrate?.([100, 50, 100]); } catch {}
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dmChannelId, user, queryClient]);

  return query.data || 0;
}

export default function RideChat({ otherUserId, otherUserName, open, onOpenChange, onChannelReady }: RideChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dmChannelId, setDmChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const getOrCreateDM = useGetOrCreateDM();
  const { data: messages, isLoading } = useDMMessages(dmChannelId || undefined);
  const sendDM = useSendDM();
  const { isOtherTyping, sendTyping } = useTypingIndicator(dmChannelId, user?.id);

  // Get or create DM channel when opened
  useEffect(() => {
    if (!open || !otherUserId || dmChannelId) return;
    getOrCreateDM.mutate(otherUserId, {
      onSuccess: (id) => {
        setDmChannelId(id);
        onChannelReady?.(id);
      },
    });
  }, [open, otherUserId]);

  // Clear unread when chat is open and messages load
  useEffect(() => {
    if (open && dmChannelId) {
      queryClient.invalidateQueries({ queryKey: ["dm-channel-unread", dmChannelId] });
    }
  }, [open, dmChannelId, messages?.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length]);

  const handleSend = () => {
    if (!message.trim() || !dmChannelId) return;
    sendDM.mutate({ dmChannelId, content: message.trim() });
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const initials = (otherUserName || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <DrawerTitle className="text-sm font-semibold">
                {otherUserName || "Chat"}
              </DrawerTitle>
            </div>
          </div>
        </DrawerHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px] max-h-[50dvh] space-y-2">
          {isLoading || getOrCreateDM.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !messages?.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No messages yet</p>
              <p className="text-[10px] text-muted-foreground/60">Send a message to start chatting</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={`text-[9px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3">
          <AnimatePresence>
            {isOtherTyping && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 pb-2"
              >
                <span className="text-[11px] text-muted-foreground italic">
                  {otherUserName || "User"} is typing
                </span>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1 w-1 rounded-full bg-muted-foreground/60"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => { setMessage(e.target.value); sendTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 h-10 text-sm rounded-full"
              disabled={!dmChannelId}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim() || !dmChannelId || sendDM.isPending}
              className="h-10 w-10 shrink-0"
            >
              {sendDM.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** Floating chat button with unread badge for use during active rides */
export function RideChatButton({ otherUserId, otherUserName }: { otherUserId: string; otherUserName?: string }) {
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const { user } = useAuth();

  // Pre-resolve the DM channel for unread tracking (without opening chat)
  const getOrCreateDM = useGetOrCreateDM();
  useEffect(() => {
    if (!otherUserId || !user || channelId) return;
    getOrCreateDM.mutate(otherUserId, {
      onSuccess: (id) => setChannelId(id),
    });
  }, [otherUserId, user]);

  const unread = useChannelUnread(open ? null : channelId); // pause counting when chat is open

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative h-10 w-10 rounded-full bg-card border-border shadow-md"
      >
        <MessageCircle className="h-4.5 w-4.5 text-primary" />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-sm"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
      <RideChat
        otherUserId={otherUserId}
        otherUserName={otherUserName}
        open={open}
        onOpenChange={setOpen}
        onChannelReady={setChannelId}
      />
    </>
  );
}
