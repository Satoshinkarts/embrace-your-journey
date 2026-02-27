import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Trophy, TrendingUp, MessageSquare, Award, ChevronRight } from "lucide-react";
import { useRiderRanking, useRiderReviews, useAllRiderRankings, type RiderRanking, type AllRiderRanking } from "@/hooks/useRiderRanking";

/* ── Rider's own ranking panel ── */
export function RiderRankingChannel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: ranking, isLoading } = useRiderRanking();
  const { data: reviews, isLoading: loadingReviews } = useRiderReviews();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-background border-border p-0">
        <SheetHeader className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-primary" />
            My Ranking
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Your private performance stats
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
          {isLoading ? <RankingSkeleton /> : ranking ? <RankingStats ranking={ranking} /> : <EmptyState />}

          {/* Reviews */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Reviews ({reviews?.length || 0})
            </p>
            {loadingReviews ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : !reviews?.length ? (
              <div className="glass-card p-6 text-center">
                <MessageSquare className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No reviews yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reviews.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass-card p-3.5"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star
                          key={si}
                          className={`h-3.5 w-3.5 ${si < r.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    {r.comment && <p className="text-xs text-foreground leading-relaxed">{r.comment}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Operator/Admin: all rider rankings panel ── */
export function OperatorRankingChannel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: rankings, isLoading } = useAllRiderRankings();
  const [selectedRider, setSelectedRider] = useState<string | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-background border-border p-0">
        <SheetHeader className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-primary" />
            Rider Rankings
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            All rider performance data
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 py-4 space-y-3">
          {isLoading ? <RankingSkeleton /> : !rankings?.length ? (
            <div className="glass-card p-8 text-center">
              <Trophy className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No riders ranked yet</p>
            </div>
          ) : (
            rankings.map((r, i) => (
              <div key={r.user_id}>
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedRider(selectedRider === r.user_id ? null : r.user_id)}
                  className="glass-card p-4 w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                        #{r.rank_position}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.full_name || "Unnamed"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Star className="h-3 w-3 fill-primary text-primary" />
                          <span className="text-xs text-muted-foreground">{Number(r.avg_rating).toFixed(1)}</span>
                          <span className="text-[10px] text-muted-foreground">· {r.completed_rides} rides · {r.total_reviews} reviews</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedRider === r.user_id ? "rotate-90" : ""}`} />
                  </div>
                </motion.button>

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
      </SheetContent>
    </Sheet>
  );
}

/* ── Expanded reviews for operator view ── */
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

/* ── Shared ranking stats display ── */
function RankingStats({ ranking }: { ranking: RiderRanking }) {
  const level = ranking.avg_rating >= 4.5 ? "Gold" : ranking.avg_rating >= 3.5 ? "Silver" : "Bronze";
  const levelColor = level === "Gold" ? "bg-primary/10 text-primary border-primary/30" : level === "Silver" ? "bg-secondary text-foreground border-border" : "bg-warning/10 text-warning border-warning/30";

  return (
    <div className="space-y-4">
      {/* Rank card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-5 text-center"
      >
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-3">
          <span className="text-2xl font-black text-primary">#{ranking.rank_position}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          of {ranking.total_riders} riders
        </p>
        <div className="mt-3">
          <Badge className={`${levelColor} border text-xs`}>
            <Award className="mr-1 h-3 w-3" />
            {level} Rider
          </Badge>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          </div>
          <p className="text-lg font-bold text-foreground">{Number(ranking.avg_rating).toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">Rating</p>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MessageSquare className="h-3.5 w-3.5 text-info" />
          </div>
          <p className="text-lg font-bold text-foreground">{ranking.total_reviews}</p>
          <p className="text-[10px] text-muted-foreground">Reviews</p>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
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
