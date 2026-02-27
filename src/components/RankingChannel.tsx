import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Star, Trophy, TrendingUp, MessageSquare, Award, ChevronRight,
  Send, ImagePlus, X, Loader2, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRiderRanking, useRiderReviews, useAllRiderRankings, type RiderRanking, type AllRiderRanking } from "@/hooks/useRiderRanking";
import { useChatChannel, useChatMessages, useSendMessage, uploadChatImage, formatRelativeTime, type ChatMessage } from "@/hooks/useChat";

/* ═══════════════════════════════════════════════════════
   Rider's own ranking panel (with chat tab)
   ═══════════════════════════════════════════════════════ */
export function RiderRankingChannel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: ranking, isLoading } = useRiderRanking();
  const { data: reviews, isLoading: loadingReviews } = useRiderReviews();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border p-0 flex flex-col">
        <SheetHeader className="shrink-0 bg-background/90 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-0">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-primary" />
            My Channel
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Your private ranking &amp; chat
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="ranking" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 mb-0 grid w-auto grid-cols-2 bg-secondary/50 rounded-xl">
            <TabsTrigger value="ranking" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Ranking
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking" className="flex-1 overflow-y-auto px-5 py-4 space-y-5 mt-0">
            {isLoading ? <RankingSkeleton /> : ranking ? <RankingStats ranking={ranking} /> : <EmptyState />}
            <ReviewsList reviews={reviews || []} loading={loadingReviews} />
          </TabsContent>

          <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
            <RiderChatTab />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════
   Operator/Admin: all rider rankings panel (with chat)
   ═══════════════════════════════════════════════════════ */
export function OperatorRankingChannel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: rankings, isLoading } = useAllRiderRankings();
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [chatRider, setChatRider] = useState<{ id: string; name: string } | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border p-0 flex flex-col">
        <SheetHeader className="shrink-0 bg-background/90 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-0">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-primary" />
            {chatRider ? `Chat — ${chatRider.name}` : "Rider Rankings"}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {chatRider ? "Private channel with rider" : "All rider performance data"}
          </SheetDescription>
        </SheetHeader>

        {chatRider ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <button
              onClick={() => setChatRider(null)}
              className="mx-5 mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to rankings
            </button>
            <div className="flex-1 overflow-hidden">
              <OperatorChatTab riderId={chatRider.id} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {isLoading ? <RankingSkeleton /> : !rankings?.length ? (
              <div className="glass-card p-8 text-center">
                <Trophy className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No riders ranked yet</p>
              </div>
            ) : (
              rankings.map((r, i) => (
                <div key={r.user_id}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card p-4"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedRider(selectedRider === r.user_id ? null : r.user_id)}
                        className="flex items-center gap-3 text-left flex-1 min-w-0"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground shrink-0">
                          #{r.rank_position}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.full_name || "Unnamed"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Star className="h-3 w-3 fill-primary text-primary" />
                            <span className="text-xs text-muted-foreground">{Number(r.avg_rating).toFixed(1)}</span>
                            <span className="text-[10px] text-muted-foreground">· {r.completed_rides} rides</span>
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-xl"
                          onClick={() => setChatRider({ id: r.user_id, name: r.full_name || "Rider" })}
                        >
                          <MessageSquare className="h-4 w-4 text-info" />
                        </Button>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedRider === r.user_id ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {selectedRider === r.user_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <RiderReviewsExpanded riderId={r.user_id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════════════════
   Chat Tab for Rider
   ═══════════════════════════════════════════════════════ */
function RiderChatTab() {
  const { user } = useAuth();
  const { data: channelId, isLoading: loadingChannel } = useChatChannel();

  if (loadingChannel) return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!channelId) return <div className="p-5 text-center text-xs text-muted-foreground">Unable to load channel</div>;

  return <ChatView channelId={channelId} />;
}

/* ═══════════════════════════════════════════════════════
   Chat Tab for Operator (specific rider)
   ═══════════════════════════════════════════════════════ */
function OperatorChatTab({ riderId }: { riderId: string }) {
  const { data: channelId, isLoading: loadingChannel } = useChatChannel(riderId);

  if (loadingChannel) return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!channelId) return <div className="p-5 text-center text-xs text-muted-foreground">Unable to load channel</div>;

  return <ChatView channelId={channelId} />;
}

/* ═══════════════════════════════════════════════════════
   Core Chat View (shared)
   ═══════════════════════════════════════════════════════ */
function ChatView({ channelId }: { channelId: string }) {
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if ((!text.trim() && !imagePreview) || !user) return;

    if (imagePreview) {
      setUploading(true);
      try {
        const { url, metadata } = await uploadChatImage(imagePreview.file, user.id);
        await sendMessage.mutateAsync({
          channelId,
          content: text.trim() || null,
          messageType: "image",
          imageUrl: url,
          imageMetadata: metadata,
        } as any);
      } catch (err: any) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        setImagePreview(null);
      }
    } else {
      await sendMessage.mutateAsync({ channelId, content: text.trim() });
    }

    setText("");
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    setImagePreview({ file, preview: URL.createObjectURL(file) });
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImagePreview({ file, preview: URL.createObjectURL(file) });
    }
  }, []);

  return (
    <div
      className="flex h-full flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={`h-10 rounded-2xl ${i % 2 === 0 ? "ml-auto w-2/3" : "w-3/4"}`} />
            ))}
          </div>
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
                    <span className="text-[10px] text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {isSystem ? (
                  <div className="flex justify-center my-2">
                    <span className="text-[10px] text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {msg.content}
                    </span>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-secondary text-foreground rounded-bl-md"
                          }`}
                        >
                          {!isMe && (
                            <p className="text-[10px] font-medium mb-0.5 opacity-70 capitalize">
                              {msg.sender_role}
                            </p>
                          )}

                          {msg.message_type === "image" && msg.image_url && (
                            <button
                              onClick={() => setExpandedImage(msg.image_url)}
                              className="mb-1.5 block"
                            >
                              <img
                                src={msg.image_url}
                                alt="Shared image"
                                className="rounded-xl max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                loading="lazy"
                              />
                            </button>
                          )}

                          {msg.content && (
                            <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                          )}

                          <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {formatRelativeTime(msg.created_at)}
                            {msg.edited_at && " · edited"}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {new Date(msg.created_at).toLocaleString()}
                      </TooltipContent>
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/50 px-4 py-2"
          >
            <div className="relative inline-block">
              <img
                src={imagePreview.preview}
                alt="Preview"
                className="h-20 rounded-xl object-cover"
              />
              <button
                onClick={() => {
                  URL.revokeObjectURL(imagePreview.preview);
                  setImagePreview(null);
                }}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            <button
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-secondary flex items-center justify-center"
              onClick={() => setExpandedImage(null)}
            >
              <X className="h-5 w-5 text-foreground" />
            </button>
            <img
              src={expandedImage}
              alt="Full resolution"
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border/50 px-3 py-3 bg-background">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            disabled={uploading}
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-secondary rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={uploading}
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !imagePreview) || uploading || sendMessage.isPending}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
          >
            {uploading || sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared subcomponents
   ═══════════════════════════════════════════════════════ */
function ReviewsList({ reviews, loading }: { reviews: any[]; loading: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        Reviews ({reviews?.length || 0})
      </p>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !reviews?.length ? (
        <div className="glass-card p-6 text-center">
          <MessageSquare className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">No reviews yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r: any, i: number) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card p-3.5"
            >
              <div className="flex items-center gap-1.5 mb-1">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star key={si} className={`h-3.5 w-3.5 ${si < r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              {r.comment && <p className="text-xs text-foreground leading-relaxed">{r.comment}</p>}
              <p className="text-[10px] text-muted-foreground mt-1.5">{new Date(r.created_at).toLocaleDateString()}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

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

function RankingStats({ ranking }: { ranking: RiderRanking }) {
  const level = ranking.avg_rating >= 4.5 ? "Gold" : ranking.avg_rating >= 3.5 ? "Silver" : "Bronze";
  const levelColor = level === "Gold" ? "bg-primary/10 text-primary border-primary/30" : level === "Silver" ? "bg-secondary text-foreground border-border" : "bg-warning/10 text-warning border-warning/30";

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <span className="text-2xl font-black text-primary">#{ranking.rank_position}</span>
        </div>
        <p className="text-xs text-muted-foreground">of {ranking.total_riders} riders</p>
        <div className="mt-3">
          <Badge className={`${levelColor} border text-xs`}>
            <Award className="mr-1 h-3 w-3" />
            {level} Rider
          </Badge>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="glass-card p-3 text-center">
          <Star className="mx-auto h-3.5 w-3.5 fill-primary text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{Number(ranking.avg_rating).toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">Rating</p>
        </div>
        <div className="glass-card p-3 text-center">
          <MessageSquare className="mx-auto h-3.5 w-3.5 text-info mb-1" />
          <p className="text-lg font-bold text-foreground">{ranking.total_reviews}</p>
          <p className="text-[10px] text-muted-foreground">Reviews</p>
        </div>
        <div className="glass-card p-3 text-center">
          <TrendingUp className="mx-auto h-3.5 w-3.5 text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{ranking.completed_rides}</p>
          <p className="text-[10px] text-muted-foreground">Rides</p>
        </div>
      </div>
    </div>
  );
}

function RankingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-36 rounded-2xl" />
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
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
