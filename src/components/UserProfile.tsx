import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  User, Star, Bike, DollarSign, Users, Car, Shield, MapPin,
  Calendar, Phone, ChevronLeft, Award, Megaphone, Plus, Trash2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, type UserProfileData } from "@/hooks/useUserProfile";
import { useShoutouts, useCreateShoutout, useDeleteShoutout, type Shoutout } from "@/hooks/useShoutouts";
import { useAllRiderRankings } from "@/hooks/useRiderRanking";
import { formatRelativeTime } from "@/hooks/useChat";

const roleIcons: Record<string, React.ElementType> = {
  customer: MapPin,
  rider: Bike,
  dispatcher: Users,
  operator: Car,
  admin: Shield,
};

const roleBadgeColors: Record<string, string> = {
  customer: "bg-info/10 text-info border-info/30",
  rider: "bg-primary/10 text-primary border-primary/30",
  dispatcher: "bg-warning/10 text-warning border-warning/30",
  operator: "bg-accent/10 text-accent border-accent/30",
  admin: "bg-destructive/10 text-destructive border-destructive/30",
};

export function UserProfileSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { roles } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const primaryRole = roles[0] || "customer";
  const canManageShoutouts = roles.includes("operator") || roles.includes("admin");
  const [showShoutouts, setShowShoutouts] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-sm bg-background border-border p-0 flex flex-col">
        <SheetHeader className="shrink-0 bg-background/90 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-3">
          {showShoutouts ? (
            <>
              <button
                onClick={() => setShowShoutouts(false)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to profile
              </button>
              <SheetTitle className="flex items-center gap-2 text-foreground">
                <Megaphone className="h-5 w-5 text-primary" />
                Shoutouts
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {canManageShoutouts ? "Create and manage rider shoutouts" : "Your received shoutouts"}
              </SheetDescription>
            </>
          ) : (
            <>
              <SheetTitle className="flex items-center gap-2 text-foreground">
                <User className="h-5 w-5 text-primary" />
                My Profile
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Your account details
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <AnimatePresence mode="wait">
          {showShoutouts ? (
            <motion.div
              key="shoutouts"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto px-5 py-4"
            >
              <ShoutoutsView canManage={canManageShoutouts} />
            </motion.div>
          ) : (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto px-5 py-4"
            >
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                </div>
              ) : profile ? (
                <ProfileContent profile={profile} primaryRole={primaryRole} onOpenShoutouts={() => setShowShoutouts(true)} />
              ) : (
                <div className="glass-card p-8 text-center">
                  <User className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Profile not found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

function ProfileContent({ profile, primaryRole, onOpenShoutouts }: { profile: UserProfileData; primaryRole: string; onOpenShoutouts: () => void }) {
  const RoleIcon = roleIcons[primaryRole] || User;
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Avatar + Name */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <span className="text-2xl font-black text-primary">
                {(profile.full_name || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{profile.full_name || "Unnamed"}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {profile.roles.map(role => (
                <Badge key={role} className={`${roleBadgeColors[role] || "bg-secondary text-foreground border-border"} border text-[10px] capitalize`}>
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {profile.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{profile.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Member since {memberSince}</span>
          </div>
        </div>
      </motion.div>

      {/* Role-specific stats */}
      <RoleStats profile={profile} primaryRole={primaryRole} />

      {/* Shoutouts shortcut */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onOpenShoutouts}
        className="glass-card w-full p-4 flex items-center gap-3 text-left hover:bg-secondary/50 transition-colors"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Shoutouts</p>
          <p className="text-[10px] text-muted-foreground">
            {profile.roles.includes("operator") || profile.roles.includes("admin")
              ? "Create & manage shoutouts"
              : "View your shoutouts"}
          </p>
        </div>
        <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
      </motion.button>
    </div>
  );
}

function RoleStats({ profile, primaryRole }: { profile: UserProfileData; primaryRole: string }) {
  const statCards: { label: string; value: string | number; icon: React.ElementType }[] = [];

  if (primaryRole === "rider") {
    statCards.push(
      { label: "Completed Rides", value: profile.completedRides || 0, icon: Bike },
      { label: "Earnings", value: `₱${(profile.totalEarnings || 0).toFixed(0)}`, icon: DollarSign },
      { label: "Avg Rating", value: (profile.avgRating || 0).toFixed(1), icon: Star },
      { label: "Reviews", value: profile.totalReviews || 0, icon: Award },
    );
  } else if (primaryRole === "customer") {
    statCards.push(
      { label: "Rides Taken", value: profile.completedRides || 0, icon: MapPin },
    );
  } else if (primaryRole === "dispatcher") {
    statCards.push(
      { label: "Dispatched", value: profile.totalDispatched || 0, icon: Users },
    );
  } else if (primaryRole === "operator") {
    statCards.push(
      { label: "Vehicles", value: profile.totalVehicles || 0, icon: Car },
    );
  } else if (primaryRole === "admin") {
    statCards.push(
      { label: "Total Users", value: profile.totalUsers || 0, icon: Users },
    );
  }

  if (!statCards.length) return null;

  return (
    <div className={`grid gap-2.5 ${statCards.length >= 4 ? "grid-cols-2" : statCards.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {statCards.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.06 }}
          className="glass-card p-3.5 text-center"
        >
          <s.icon className="mx-auto h-4 w-4 text-primary mb-1.5" />
          <p className="text-lg font-bold text-foreground">{s.value}</p>
          <p className="text-[10px] text-muted-foreground">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shoutouts View
   ═══════════════════════════════════════════════════════ */
function ShoutoutsView({ canManage }: { canManage: boolean }) {
  const { data: shoutouts, isLoading } = useShoutouts();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      {canManage && (
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl gap-1.5"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="h-3.5 w-3.5" />
          {showCreate ? "Cancel" : "Create Shoutout"}
        </Button>
      )}

      <AnimatePresence>
        {showCreate && canManage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <CreateShoutoutForm onDone={() => setShowCreate(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : !shoutouts?.length ? (
        <div className="glass-card p-8 text-center">
          <Megaphone className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No shoutouts yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shoutouts.map((s, i) => (
            <ShoutoutCard key={s.id} shoutout={s} canDelete={canManage} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateShoutoutForm({ onDone }: { onDone: () => void }) {
  const createShoutout = useCreateShoutout();
  const { data: riders, isLoading: loadingRiders } = useAllRiderRankings();
  const [selectedRider, setSelectedRider] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!selectedRider || !title.trim()) return;
    try {
      await createShoutout.mutateAsync({
        assignedTo: selectedRider,
        title: title.trim(),
        message: message.trim() || undefined,
      });
      setTitle("");
      setMessage("");
      setSelectedRider("");
      onDone();
    } catch {}
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Shoutout</p>

      {/* Rider select */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground">Assign to rider</p>
        {loadingRiders ? (
          <Skeleton className="h-10 rounded-xl" />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {riders?.map(r => (
              <button
                key={r.user_id}
                onClick={() => setSelectedRider(r.user_id)}
                className={`rounded-xl px-3 py-1.5 text-xs transition-colors ${
                  selectedRider === r.user_id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                }`}
              >
                {r.full_name || "Unnamed"}
              </button>
            ))}
          </div>
        )}
      </div>

      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Shoutout title..."
        className="h-10 rounded-xl bg-secondary border-border"
      />
      <Input
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Message (optional)..."
        className="h-10 rounded-xl bg-secondary border-border"
      />

      <Button
        className="w-full rounded-xl h-10"
        onClick={handleSubmit}
        disabled={!selectedRider || !title.trim() || createShoutout.isPending}
      >
        {createShoutout.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Megaphone className="h-4 w-4 mr-1" />}
        Send Shoutout
      </Button>
    </div>
  );
}

function ShoutoutCard({ shoutout, canDelete, index }: { shoutout: Shoutout; canDelete: boolean; index: number }) {
  const deleteShoutout = useDeleteShoutout();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="glass-card p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0 mt-0.5">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{shoutout.title}</p>
            {shoutout.message && (
              <p className="text-xs text-muted-foreground mt-1">{shoutout.message}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {formatRelativeTime(shoutout.created_at)}
            </p>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={() => deleteShoutout.mutate(shoutout.id)}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
            disabled={deleteShoutout.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
