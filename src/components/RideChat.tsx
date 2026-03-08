import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useGetOrCreateDM, useDMMessages, useSendDM } from "@/hooks/useDirectMessages";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

interface RideChatProps {
  otherUserId: string;
  otherUserName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RideChat({ otherUserId, otherUserName, open, onOpenChange }: RideChatProps) {
  const { user } = useAuth();
  const [dmChannelId, setDmChannelId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const getOrCreateDM = useGetOrCreateDM();
  const { data: messages, isLoading } = useDMMessages(dmChannelId || undefined);
  const sendDM = useSendDM();

  // Get or create DM channel when opened
  useEffect(() => {
    if (!open || !otherUserId || dmChannelId) return;
    getOrCreateDM.mutate(otherUserId, {
      onSuccess: (id) => setDmChannelId(id),
    });
  }, [open, otherUserId]);

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
          <div className="flex items-center gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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

/** Floating chat button for use during active rides */
export function RideChatButton({ otherUserId, otherUserName }: { otherUserId: string; otherUserName?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 w-10 rounded-full bg-card border-border shadow-md"
      >
        <MessageCircle className="h-4.5 w-4.5 text-primary" />
      </Button>
      <RideChat
        otherUserId={otherUserId}
        otherUserName={otherUserName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
