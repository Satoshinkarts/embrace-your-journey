import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface RideRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rideId: string;
  riderId: string;
}

export default function RideRatingDialog({ open, onOpenChange, rideId, riderId }: RideRatingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");

  const submitRating = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ratings").insert({
        ride_id: rideId,
        rater_id: user!.id,
        rated_id: riderId,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Thanks for your feedback!" });
      queryClient.invalidateQueries({ queryKey: ["ride-history"] });
      queryClient.invalidateQueries({ queryKey: ["my-ratings"] });
      onOpenChange(false);
      setRating(0);
      setComment("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const labels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Rate your ride</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Stars */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${
                      star <= (hoveredStar || rating)
                        ? "fill-warning text-warning"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </motion.button>
              ))}
            </div>
            {(hoveredStar || rating) > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium text-foreground"
              >
                {labels[hoveredStar || rating]}
              </motion.p>
            )}
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Leave a comment (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-xl bg-secondary border-border min-h-[80px] resize-none"
          />

          {/* Submit */}
          <Button
            className="w-full h-11 rounded-xl font-semibold"
            onClick={() => submitRating.mutate()}
            disabled={rating === 0 || submitRating.isPending}
          >
            {submitRating.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Submit Rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
