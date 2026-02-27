import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGetOrCreateDM } from "@/hooks/useDirectMessages";
import {
  User, MessageSquare, Phone, Video, Star, Circle,
  Loader2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  online: "bg-primary",
  away: "bg-warning",
  busy: "bg-destructive",
  offline: "bg-muted-foreground",
};

interface UserProfilePopupProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  onOpenDM?: (dmChannelId: string) => void;
}

export function UserProfilePopup({ userId, open, onClose, onOpenDM }: UserProfilePopupProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const getOrCreateDM = useGetOrCreateDM();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-popup-profile", userId],
    queryFn: async () => {
      const [{ data: profileData }, { data: roleData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      return {
        ...profileData,
        roles: roleData?.map((r: any) => r.role) || [],
      };
    },
    enabled: open && !!userId,
  });

  const handleDM = async () => {
    try {
      const dmId = await getOrCreateDM.mutateAsync(userId);
      onOpenDM?.(dmId);
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleCall = () => {
    toast({ title: "Coming soon", description: "Voice calling will be available soon" });
  };

  const handleVideo = () => {
    toast({ title: "Coming soon", description: "Video calling will be available soon" });
  };

  if (!open) return null;

  const isOwnProfile = user?.id === userId;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="glass-card w-full max-w-xs p-0 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Banner */}
            <div className="h-16 bg-gradient-to-r from-primary/30 to-info/20 relative">
              <button
                onClick={onClose}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/50 flex items-center justify-center text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {isLoading ? (
              <div className="p-5 space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-secondary animate-pulse -mt-10" />
                <div className="h-4 w-24 bg-secondary animate-pulse rounded" />
              </div>
            ) : profile ? (
              <div className="px-5 pb-5">
                {/* Avatar */}
                <div className="relative -mt-8 mb-3">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border-4 border-background">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-black text-primary">
                        {(profile.full_name || "?")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background ${statusColors[(profile as any).status_type || "online"]}`} />
                </div>

                {/* Name & roles */}
                <p className="text-base font-bold text-foreground">{profile.full_name || "Unnamed"}</p>
                {(profile as any).status_text && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">{(profile as any).status_text}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {profile.roles.map((role: string) => (
                    <Badge key={role} className="text-[10px] capitalize bg-secondary text-foreground border-border border">
                      {role}
                    </Badge>
                  ))}
                </div>

                {(profile as any).bio && (
                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{(profile as any).bio}</p>
                )}

                {/* Action buttons */}
                {!isOwnProfile && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl gap-1.5 h-9"
                      onClick={handleDM}
                      disabled={getOrCreateDM.isPending}
                    >
                      {getOrCreateDM.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                      Message
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl h-9 w-9 p-0" onClick={handleCall}>
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl h-9 w-9 p-0" onClick={handleVideo}>
                      <Video className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 text-center text-sm text-muted-foreground">User not found</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
