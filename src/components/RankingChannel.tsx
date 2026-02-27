import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Star, Trophy, TrendingUp, MessageSquare, Award, ChevronLeft, ChevronDown, ChevronUp,
  Send, ImagePlus, X, Loader2, AlertCircle, Megaphone, MessageCircle,
  Headphones, ScrollText, Hash, User, Bike, Calendar, Clock, Plus, Trash2,
  Users as UsersIcon, Mail,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRiderRanking, useRiderReviews, useAllRiderRankings, useRiderRidesWithRatings, type RiderRanking, type AllRiderRanking, type RideWithRating } from "@/hooks/useRiderRanking";
import { useSharedChannels, useChatMessages, useSendMessage, useCreateChannel, useDeleteChannel, uploadChatImage, formatRelativeTime, type ChatMessage, type ChatChannel } from "@/hooks/useChat";
import { useDMChannels, useDMMessages, useSendDM, type DMChannel } from "@/hooks/useDirectMessages";
import { UserProfilePopup } from "@/components/UserProfilePopup";

const channelIcons: Record<string, React.ElementType> = {
  megaphone: Megaphone,
  "message-circle": MessageCircle,
  headphones: Headphones,
  "scroll-text": ScrollText,
  hash: Hash,
};

function getChannelIcon(icon: string | null): React.ElementType {
  return (icon && channelIcons[icon]) || Hash;
}

/* ═══════════════════════════════════════════════════════
   Rider's Channel Panel (Discord-style)
   ═══════════════════════════════════════════════════════ */
export function RiderRankingChannel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: ranking, isLoading: loadingRanking } = useRiderRanking();
  const { data: rides, isLoading: loadingRides } = useRiderRidesWithRatings();
  const { data: channels, isLoading: loadingChannels } = useSharedChannels();
  const { data: dmChannels } = useDMChannels();
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [selectedDM, setSelectedDM] = useState<DMChannel | null>(null);
  const [section, setSection] = useState<"channels" | "dms">("channels");

  useEffect(() => {
    if (!open) { setSelectedChannel(null); setSelectedDM(null); setSection("channels"); }
  }, [open]);

  const showingChat = selectedChannel || selectedDM;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border p-0 flex flex-col">
        <SheetHeader className="shrink-0 bg-background/90 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-3">
          {showingChat ? (
            <>
              <button
                onClick={() => { setSelectedChannel(null); setSelectedDM(null); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to channels
              </button>
              <SheetTitle className="flex items-center gap-2 text-foreground">
                {selectedChannel ? (
                  <>
                    {(() => { const Icon = getChannelIcon(selectedChannel.icon); return <Icon className="h-5 w-5 text-primary" />; })()}
                    # {selectedChannel.name}
                  </>
                ) : selectedDM ? (
                  <>
                    <Mail className="h-5 w-5 text-primary" />
                    {selectedDM.other_user?.full_name || "Direct Message"}
                  </>
                ) : null}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {selectedChannel?.description || "Private conversation"}
              </SheetDescription>
            </>
          ) : (
            <>
              <SheetTitle className="flex items-center gap-2 text-foreground">
                <Trophy className="h-5 w-5 text-primary" />
                My Channel
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Ranking, channels &amp; messages
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <AnimatePresence mode="wait">
          {selectedChannel ? (
            <motion.div key="chat" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
              {selectedChannel.channel_type === "system_logs" ? <SystemLogsView channelId={selectedChannel.id} /> : <ChatView channelId={selectedChannel.id} />}
            </motion.div>
          ) : selectedDM ? (
            <motion.div key="dm" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
              <DMChatView dmChannelId={selectedDM.id} />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto">
              {/* Rider Profile */}
              <div className="px-5 py-4">
                {loadingRanking ? <RankingSkeleton /> : ranking ? (
                  <RiderProfileView ranking={ranking} rides={rides || []} loadingRides={loadingRides} />
                ) : <EmptyState />}
              </div>

              {/* Section tabs */}
              <div className="px-5 border-t border-border/50">
                <div className="flex gap-1 pt-3">
                  <button onClick={() => setSection("channels")} className={`flex-1 rounded-xl py-2 text-xs font-medium transition-colors ${section === "channels" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <Hash className="inline h-3 w-3 mr-1" />Channels
                  </button>
                  <button onClick={() => setSection("dms")} className={`flex-1 rounded-xl py-2 text-xs font-medium transition-colors ${section === "dms" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                    <Mail className="inline h-3 w-3 mr-1" />DMs {dmChannels?.length ? `(${dmChannels.length})` : ""}
                  </button>
                </div>
              </div>

              {section === "channels" ? (
                <div className="px-5 py-3">
                  {loadingChannels ? (
                    <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
                  ) : (
                    <ChannelList channels={channels || []} onSelect={setSelectedChannel} />
                  )}
                </div>
              ) : (
                <div className="px-5 py-3">
                  <DMChannelList dmChannels={dmChannels || []} onSelect={setSelectedDM} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════
   Operator/Admin: all rider rankings panel (with chat)
   ═══════════════════════════════════════════════════════ */
export function OperatorRankingChannel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: rankings, isLoading } = useAllRiderRankings();
  const { data: channels, isLoading: loadingChannels } = useSharedChannels();
  const { data: dmChannels } = useDMChannels();
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [selectedDM, setSelectedDM] = useState<DMChannel | null>(null);
  const [section, setSection] = useState<"channels" | "dms" | "rankings">("channels");
  const [popupUserId, setPopupUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setSelectedRider(null); setSelectedChannel(null); setSelectedDM(null); setSection("channels"); }
  }, [open]);

  const showingChat = selectedChannel || selectedDM;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border p-0 flex flex-col">
        <SheetHeader className="shrink-0 bg-background/90 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-3">
          {showingChat ? (
            <>
              <button onClick={() => { setSelectedChannel(null); setSelectedDM(null); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <SheetTitle className="flex items-center gap-2 text-foreground">
                {selectedChannel ? (
                  <>{(() => { const Icon = getChannelIcon(selectedChannel.icon); return <Icon className="h-5 w-5 text-primary" />; })()}# {selectedChannel.name}</>
                ) : selectedDM ? (
                  <><Mail className="h-5 w-5 text-primary" />{selectedDM.other_user?.full_name || "DM"}</>
                ) : null}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">{selectedChannel?.description || "Private conversation"}</SheetDescription>
            </>
          ) : (
            <>
              <SheetTitle className="flex items-center gap-2 text-foreground"><Trophy className="h-5 w-5 text-primary" /> Rider Rankings</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">Channels, DMs &amp; performance</SheetDescription>
            </>
          )}
        </SheetHeader>

        <AnimatePresence mode="wait">
          {selectedChannel ? (
            <motion.div key="chat" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
              {selectedChannel.channel_type === "system_logs" ? <SystemLogsView channelId={selectedChannel.id} /> : <ChatView channelId={selectedChannel.id} onUserClick={setPopupUserId} />}
            </motion.div>
          ) : selectedDM ? (
            <motion.div key="dm" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
              <DMChatView dmChannelId={selectedDM.id} />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 overflow-y-auto">
              {/* Section tabs */}
              <div className="px-5 pt-4">
                <div className="flex gap-1">
                  {(["channels", "dms", "rankings"] as const).map((s) => (
                    <button key={s} onClick={() => setSection(s)} className={`flex-1 rounded-xl py-2 text-xs font-medium capitalize transition-colors ${section === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {s === "channels" ? <Hash className="inline h-3 w-3 mr-1" /> : s === "dms" ? <Mail className="inline h-3 w-3 mr-1" /> : <Trophy className="inline h-3 w-3 mr-1" />}
                      {s === "dms" ? `DMs${dmChannels?.length ? ` (${dmChannels.length})` : ""}` : s}
                    </button>
                  ))}
                </div>
              </div>

              {section === "channels" ? (
                <div className="px-5 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Channels</p>
                    <CreateChannelButton />
                  </div>
                  {loadingChannels ? (
                    <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
                  ) : (
                    <ChannelList channels={channels || []} onSelect={setSelectedChannel} canDelete />
                  )}
                </div>
              ) : section === "dms" ? (
                <div className="px-5 py-3">
                  <DMChannelList dmChannels={dmChannels || []} onSelect={setSelectedDM} />
                </div>
              ) : (
                <div className="px-5 py-3 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rankings</p>
                  {isLoading ? <RankingSkeleton /> : !rankings?.length ? (
                    <div className="glass-card p-8 text-center">
                      <Trophy className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No riders ranked yet</p>
                    </div>
                  ) : (
                    rankings.map((r, i) => (
                      <div key={r.user_id}>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-4">
                          <button onClick={() => setPopupUserId(r.user_id)} className="flex items-center gap-3 text-left w-full min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground shrink-0">#{r.rank_position}</div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">{r.full_name || "Unnamed"}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Star className="h-3 w-3 fill-primary text-primary" />
                                <span className="text-xs text-muted-foreground">{Number(r.avg_rating).toFixed(1)}</span>
                                <span className="text-[10px] text-muted-foreground">· {r.completed_rides} rides</span>
                              </div>
                            </div>
                          </button>
                        </motion.div>
                        <AnimatePresence>
                          {selectedRider === r.user_id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <RiderReviewsExpanded riderId={r.user_id} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* User profile popup */}
        <UserProfilePopup
          userId={popupUserId || ""}
          open={!!popupUserId}
          onClose={() => setPopupUserId(null)}
          onOpenDM={(dmId) => {
            const dm = dmChannels?.find(d => d.id === dmId);
            if (dm) setSelectedDM(dm);
            else {
              // Refresh and select
              setSelectedDM({ id: dmId, user1_id: "", user2_id: "", created_at: "" });
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════
   DM Channel List
   ═══════════════════════════════════════════════════════ */
function DMChannelList({ dmChannels, onSelect }: { dmChannels: DMChannel[]; onSelect: (ch: DMChannel) => void }) {
  if (!dmChannels.length) {
    return (
      <div className="glass-card p-6 text-center">
        <Mail className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No direct messages yet</p>
        <p className="text-[10px] text-muted-foreground mt-1">Click a user's name in chat to start a DM</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {dmChannels.map((ch, i) => (
        <motion.div key={ch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <button
            onClick={() => onSelect(ch)}
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-secondary/70 active:bg-secondary group"
          >
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary group-hover:bg-primary/10 transition-colors overflow-hidden">
                {ch.other_user?.avatar_url ? (
                  <img src={ch.other_user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                ch.other_user?.status_type === "online" ? "bg-primary" :
                ch.other_user?.status_type === "away" ? "bg-warning" :
                ch.other_user?.status_type === "busy" ? "bg-destructive" : "bg-muted-foreground"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{ch.other_user?.full_name || "Unknown User"}</p>
              <p className="text-[10px] text-muted-foreground">Direct message</p>
            </div>
          </button>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DM Chat View
   ═══════════════════════════════════════════════════════ */
function DMChatView({ dmChannelId }: { dmChannelId: string }) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useDMMessages(dmChannelId);
  const sendDM = useSendDM();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendDM.mutateAsync({ dmChannelId, content: text.trim() });
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-2xl w-3/4" />)}</div>
        ) : !messages?.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
                  {msg.content && <p className="text-sm leading-relaxed break-words">{msg.content}</p>}
                  <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {formatRelativeTime(msg.created_at)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-border/50 px-3 py-3 bg-background">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-secondary rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendDM.isPending}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            {sendDM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   System Logs View (read-only)
   ═══════════════════════════════════════════════════════ */
function SystemLogsView({ channelId }: { channelId: string }) {
  const { data: messages, isLoading } = useChatMessages(channelId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-2xl w-full" />)}</div>
        ) : !messages?.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <ScrollText className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No logs yet</p>
            <p className="text-xs text-muted-foreground mt-1">System events will appear here</p>
          </div>
        ) : (
          messages.filter(m => !m.deleted_at).map((msg) => (
            <div key={msg.id} className="flex items-start gap-2 rounded-xl bg-secondary/40 p-3">
              <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground break-words">{msg.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(msg.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="shrink-0 border-t border-border/50 px-4 py-3 bg-background">
        <p className="text-[10px] text-muted-foreground text-center">System logs are read-only</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Core Chat View (shared across channels)
   ═══════════════════════════════════════════════════════ */
function ChatView({ channelId, onUserClick }: { channelId: string; onUserClick?: (userId: string) => void }) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useChatMessages(channelId);
  const sendMessage = useSendMessage();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<{ file: File; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if ((!text.trim() && !imagePreview) || !user) return;
    if (imagePreview) {
      setUploading(true);
      try {
        const { url, metadata } = await uploadChatImage(imagePreview.file, user.id);
        await sendMessage.mutateAsync({ channelId, content: text.trim() || undefined, messageType: "image", imageUrl: url, imageMetadata: metadata });
      } catch (err: any) { console.error("Upload failed:", err); }
      finally { setUploading(false); setImagePreview(null); }
    } else {
      await sendMessage.mutateAsync({ channelId, content: text.trim() });
    }
    setText("");
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) return;
    setImagePreview({ file, preview: URL.createObjectURL(file) });
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) setImagePreview({ file, preview: URL.createObjectURL(file) });
  }, []);

  return (
    <div className="flex h-full flex-col" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className={`h-10 rounded-2xl ${i % 2 === 0 ? "ml-auto w-2/3" : "w-3/4"}`} />)}</div>
        ) : !messages?.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start the conversation</p>
          </div>
        ) : (
          messages.filter((m) => !m.deleted_at).map((msg, i) => {
            const isMe = msg.sender_id === user?.id;
            const isSystem = msg.message_type === "system";
            const prevMsg = messages[i - 1];
            const showTimeSeparator = !prevMsg || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 300000);

            return (
              <div key={msg.id}>
                {showTimeSeparator && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">{new Date(msg.created_at).toLocaleString()}</span>
                  </div>
                )}
                {isSystem ? (
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />{msg.content}
                    </span>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
                          {!isMe && (
                            <button
                              onClick={() => onUserClick?.(msg.sender_id)}
                              className="text-[10px] font-semibold mb-0.5 opacity-80 capitalize hover:underline cursor-pointer"
                            >
                              {msg.sender_role}
                            </button>
                          )}
                          {msg.message_type === "image" && msg.image_url && (
                            <button onClick={() => setExpandedImage(msg.image_url)} className="mb-1.5 block">
                              <img src={msg.image_url} alt="Shared image" className="rounded-xl max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" loading="lazy" />
                            </button>
                          )}
                          {msg.content && <p className="text-sm leading-relaxed break-words">{msg.content}</p>}
                          <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatRelativeTime(msg.created_at)}{msg.edited_at && " · edited"}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{new Date(msg.created_at).toLocaleString()}</TooltipContent>
                    </Tooltip>
                  </motion.div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border/50 px-4 py-2">
            <div className="relative inline-block">
              <img src={imagePreview.preview} alt="Preview" className="h-20 rounded-xl object-cover" />
              <button onClick={() => { URL.revokeObjectURL(imagePreview.preview); setImagePreview(null); }} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{imagePreview.file.name}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen image viewer */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setExpandedImage(null)}>
            <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-secondary flex items-center justify-center" onClick={() => setExpandedImage(null)}>
              <X className="h-5 w-5 text-foreground" />
            </button>
            <img src={expandedImage} alt="Full resolution" className="max-w-full max-h-full object-contain rounded-xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border/50 px-3 py-3 bg-background">
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors" disabled={uploading}>
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-secondary rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={uploading}
          />
          <button onClick={handleSend} disabled={(!text.trim() && !imagePreview) || uploading || sendMessage.isPending}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-opacity">
            {uploading || sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Rider Profile View
   ═══════════════════════════════════════════════════════ */
function RiderProfileView({ ranking, rides, loadingRides }: { ranking: RiderRanking; rides: RideWithRating[]; loadingRides: boolean }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const today = new Date().toDateString();
  const todayRides = rides.filter(r => r.completed_at && new Date(r.completed_at).toDateString() === today).length;
  const ratingOutOf10 = (Number(ranking.avg_rating) * 2).toFixed(2);

  const monthlyBreakdown = rides.reduce<Record<string, number>>((acc, r) => {
    const d = new Date(r.completed_at || r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const sortedMonths = Object.entries(monthlyBreakdown).sort(([a], [b]) => b.localeCompare(a));

  const firstRideDate = rides.length
    ? new Date(rides[rides.length - 1].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <User className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Profile</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-primary">{ratingOutOf10}</span>
              <span className="text-sm text-muted-foreground font-medium">/10.00</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Ratings · #{ranking.rank_position} of {ranking.total_riders}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`h-4 w-4 ${i < Math.round(ranking.avg_rating) ? "fill-primary text-primary" : "text-muted-foreground/25"}`} />
          ))}
          <span className="text-xs text-muted-foreground ml-1.5">{ranking.total_reviews} reviews</span>
        </div>
      </motion.div>

      <div className="glass-card p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rides</p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-secondary/50 p-3 text-center">
            <Clock className="mx-auto h-4 w-4 text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{todayRides}</p>
            <p className="text-[10px] text-muted-foreground">Today</p>
          </div>
          <button onClick={() => setShowBreakdown(!showBreakdown)} className="rounded-xl bg-secondary/50 p-3 text-center hover:bg-secondary transition-colors">
            <Bike className="mx-auto h-4 w-4 text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{ranking.completed_rides}</p>
            <p className="text-[10px] text-primary font-medium flex items-center justify-center gap-0.5">
              Total {showBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </p>
          </button>
        </div>

        <AnimatePresence>
          {showBreakdown && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 space-y-2">
                {firstRideDate && <p className="text-[10px] text-muted-foreground">Member since <span className="text-foreground font-medium">{firstRideDate}</span></p>}
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Monthly Overview</p>
                {loadingRides ? (
                  <div className="space-y-1.5">{[1, 2, 3].map(i => <Skeleton key={i} className="h-6 rounded-lg" />)}</div>
                ) : !sortedMonths.length ? (
                  <p className="text-xs text-muted-foreground">No rides yet</p>
                ) : (
                  <div className="space-y-1">
                    {sortedMonths.map(([month, count]) => {
                      const [y, m] = month.split("-");
                      const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
                      const pct = Math.min(100, (count / Math.max(...Object.values(monthlyBreakdown))) * 100);
                      return (
                        <div key={month} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-24 shrink-0 truncate">{label}</span>
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full rounded-full bg-primary" />
                          </div>
                          <span className="text-[10px] font-bold text-foreground w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <button onClick={() => setShowHistory(!showHistory)} className="flex items-center justify-between w-full">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ride History ({rides.length})</p>
          {showHistory ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              {loadingRides ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              ) : !rides.length ? (
                <div className="glass-card p-6 text-center"><Bike className="mx-auto mb-2 h-6 w-6 text-muted-foreground" /><p className="text-xs text-muted-foreground">No rides yet</p></div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {rides.slice(0, 50).map((ride, i) => (
                    <motion.div key={ride.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{ride.pickup_address}</p>
                          <p className="text-[10px] text-muted-foreground truncate">→ {ride.dropoff_address}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{new Date(ride.completed_at || ride.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          {ride.fare && <p className="text-sm font-bold text-primary">₱{Number(ride.fare).toFixed(2)}</p>}
                          {ride.customer_rating !== null ? (
                            <div className="flex items-center gap-0.5 justify-end">
                              {Array.from({ length: 5 }).map((_, si) => (
                                <Star key={si} className={`h-2.5 w-2.5 ${si < ride.customer_rating! ? "fill-primary text-primary" : "text-muted-foreground/25"}`} />
                              ))}
                            </div>
                          ) : <p className="text-[10px] text-muted-foreground italic">No rating</p>}
                        </div>
                      </div>
                      {ride.customer_comment && <p className="text-[10px] text-muted-foreground mt-1.5 italic">"{ride.customer_comment}"</p>}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Channel List (reusable)
   ═══════════════════════════════════════════════════════ */
function ChannelList({ channels, onSelect, canDelete = false }: { channels: ChatChannel[]; onSelect: (ch: ChatChannel) => void; canDelete?: boolean }) {
  const deleteChannel = useDeleteChannel();
  const defaultChannelNames = ["shoutouts", "general", "support", "system_logs"];

  return (
    <div className="space-y-1.5">
      {channels.map((ch, i) => {
        const Icon = getChannelIcon(ch.icon);
        const isDeletable = canDelete && !defaultChannelNames.includes(ch.name || "");
        return (
          <motion.div key={ch.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-1">
            <button onClick={() => onSelect(ch)} className="flex flex-1 items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-secondary/70 active:bg-secondary group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors">
                <Icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate"># {ch.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{ch.description}</p>
              </div>
            </button>
            {isDeletable && (
              <button onClick={() => deleteChannel.mutate(ch.id)} className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors" disabled={deleteChannel.isPending}>
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Create Channel Button (operator/admin)
   ═══════════════════════════════════════════════════════ */
function CreateChannelButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createChannel = useCreateChannel();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createChannel.mutateAsync({ name: name.trim().toLowerCase().replace(/\s+/g, "-"), description: description.trim() || undefined });
      setName(""); setDescription(""); setOpen(false);
    } catch {}
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[10px] text-primary font-medium hover:text-primary/80 transition-colors">
        <Plus className="h-3 w-3" />Add
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-6 z-50 w-64 glass-card p-3 space-y-2">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Channel name..." className="h-8 rounded-lg bg-secondary border-border text-xs" />
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)..." className="h-8 rounded-lg bg-secondary border-border text-xs" />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1 h-7 rounded-lg text-xs" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 h-7 rounded-lg text-xs" onClick={handleCreate} disabled={!name.trim() || createChannel.isPending}>
                {createChannel.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared subcomponents
   ═══════════════════════════════════════════════════════ */
function RiderReviewsExpanded({ riderId }: { riderId: string }) {
  const { data: reviews, isLoading } = useRiderReviews(riderId);
  if (isLoading) return <div className="p-3"><Skeleton className="h-12 rounded-xl" /></div>;
  if (!reviews?.length) return <p className="px-4 py-2 text-xs text-muted-foreground">No reviews</p>;

  return (
    <div className="pl-12 pr-4 py-2 space-y-1.5">
      {reviews.slice(0, 5).map((r) => (
        <div key={r.id} className="rounded-xl bg-secondary/50 p-3">
          <div className="flex items-center gap-1 mb-0.5">
            {Array.from({ length: 5 }).map((_, si) => (
              <Star key={si} className={`h-3 w-3 ${si < r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          {r.comment && <p className="text-xs text-foreground">{r.comment}</p>}
          <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}

function RankingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid grid-cols-3 gap-2.5">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card p-8 text-center">
      <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">No ranking data yet</p>
      <p className="text-xs text-muted-foreground mt-1">Complete rides and earn reviews to get ranked</p>
    </div>
  );
}
