import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Megaphone, Send, ChevronLeft, ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useDMChannels, useDMMessages, useSendDM, type DMChannel } from "@/hooks/useDirectMessages";
import { useNotifications } from "@/hooks/useNotifications";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CustomerMessages() {
  return (
    <DashboardLayout>
      <MessagesContent />
    </DashboardLayout>
  );
}

function MessagesContent() {
  const [tab, setTab] = useState<"chats" | "notifications">("chats");
  const [selectedChannel, setSelectedChannel] = useState<DMChannel | null>(null);

  if (selectedChannel) {
    return <ChatConversation channel={selectedChannel} onBack={() => setSelectedChannel(null)} />;
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Messages</h2>

      {/* Tab toggle */}
      <div className="flex mb-5 rounded-full bg-secondary p-1">
        <button
          onClick={() => setTab("chats")}
          className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${
            tab === "chats" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Chats
        </button>
        <button
          onClick={() => setTab("notifications")}
          className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all ${
            tab === "notifications" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Notifications
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "chats" ? (
          <motion.div key="chats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <ChatsList onSelectChannel={setSelectedChannel} />
          </motion.div>
        ) : (
          <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <NotificationsList />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatsList({ onSelectChannel }: { onSelectChannel: (ch: DMChannel) => void }) {
  const { data: channels, isLoading } = useDMChannels();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-secondary/50 animate-pulse" />)}
      </div>
    );
  }

  if (!channels?.length) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {channels.map((ch, i) => (
        <motion.button
          key={ch.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelectChannel(ch)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/50 active:scale-[0.98]"
        >
          <div className="h-11 w-11 shrink-0 rounded-full bg-secondary flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {ch.other_user?.full_name || "Unknown User"}
            </p>
            {ch.last_message && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                "{ch.last_message}"
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(ch.created_at).toLocaleDateString()} · {new Date(ch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {(ch.unread_count ?? 0) > 0 && (
            <div className="h-2.5 w-2.5 rounded-full bg-destructive shrink-0" />
          )}
        </motion.button>
      ))}
    </div>
  );
}

function ChatConversation({ channel, onBack }: { channel: DMChannel; onBack: () => void }) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useDMMessages(channel.id);
  const sendDM = useSendDM();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendDM.mutate({ dmChannelId: channel.id, content: input.trim() });
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-56px-52px-32px)]">
      <div className="flex items-center gap-3 pb-4">
        <button onClick={onBack} className="text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-bold text-foreground">{channel.other_user?.full_name || "Unknown"}</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pb-4">
        {isLoading ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Loading messages...</div>
        ) : !messages?.length ? (
          <div className="text-center py-8 text-xs text-muted-foreground">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[9px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Type a message..."
          className="flex-1 rounded-full"
        />
        <Button size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={handleSend} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function NotificationsList() {
  const { notifications, isLoading, markAsRead } = useNotifications();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-secondary/50 animate-pulse" />)}
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="text-center py-12">
        <Megaphone className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notif, i) => (
        <motion.div
          key={notif.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => { if (!notif.read_at) markAsRead(notif.id); }}
          className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 cursor-pointer transition-colors hover:bg-secondary/50"
        >
          <div className="h-11 w-11 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{notif.title}</p>
            {notif.body && <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>}
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(notif.created_at).toLocaleDateString()} · {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {!notif.read_at && (
            <div className="h-2.5 w-2.5 rounded-full bg-destructive shrink-0 mt-1" />
          )}
        </motion.div>
      ))}
    </div>
  );
}
