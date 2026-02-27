import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  User, Star, Bike, DollarSign, Users, Car, Shield, MapPin,
  Calendar, Phone, ChevronLeft, Award, Megaphone, Plus, Trash2,
  Loader2, Camera, Edit3, Check, X, Circle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, useUpdateProfile, uploadAvatar, type UserProfileData } from "@/hooks/useUserProfile";
import { useShoutouts, useCreateShoutout, useDeleteShoutout, type Shoutout } from "@/hooks/useShoutouts";
import { useAllRiderRankings } from "@/hooks/useRiderRanking";
import { formatRelativeTime } from "@/hooks/useChat";
import { useToast } from "@/hooks/use-toast";

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

const statusColors: Record<string, string> = {
  online: "bg-primary",
  away: "bg-warning",
  busy: "bg-destructive",
  offline: "bg-muted-foreground",
};

export function UserProfileSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { roles } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const primaryRole = roles[0] || "customer";
  const canManageShoutouts = roles.includes("operator") || roles.includes("admin");
  const [view, setView] = useState<"profile" | "edit" | "shoutouts">("profile");

  const handleBack = () => setView("profile");

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setView("profile"); }}>
      <SheetContent side="left" className="w-full sm:max-w-sm bg-background border-border p-0 flex flex-col">
        <SheetHeader className="shrink-0 bg-background/90 backdrop-blur-xl border-b border-border/50 px-5 pt-5 pb-3">
          {view !== "profile" && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to profile
            </button>
          )}
          <SheetTitle className="flex items-center gap-2 text-foreground">
            {view === "edit" ? (
              <><Edit3 className="h-5 w-5 text-primary" /> Edit Profile</>
            ) : view === "shoutouts" ? (
              <><Megaphone className="h-5 w-5 text-primary" /> Shoutouts</>
            ) : (
              <><User className="h-5 w-5 text-primary" /> My Profile</>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {view === "edit" ? "Customize your profile" : view === "shoutouts" ? (canManageShoutouts ? "Create & manage" : "Your shoutouts") : "Your account"}
          </SheetDescription>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {view === "edit" ? (
            <motion.div key="edit" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto px-5 py-4">
              {profile && <EditProfileView profile={profile} onDone={handleBack} />}
            </motion.div>
          ) : view === "shoutouts" ? (
            <motion.div key="shoutouts" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto px-5 py-4">
              <ShoutoutsView canManage={canManageShoutouts} />
            </motion.div>
          ) : (
            <motion.div key="profile" initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.2 }} className="flex-1 overflow-y-auto px-5 py-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                </div>
              ) : profile ? (
                <ProfileContent
                  profile={profile}
                  primaryRole={primaryRole}
                  onEditProfile={() => setView("edit")}
                  onOpenShoutouts={() => setView("shoutouts")}
                />
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

/* ═══════════════════════════════════════════════════════
   Edit Profile View
   ═══════════════════════════════════════════════════════ */
function EditProfileView({ profile, onDone }: { profile: UserProfileData; onDone: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState(profile.full_name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [statusText, setStatusText] = useState(profile.status_text || "");
  const [statusType, setStatusType] = useState(profile.status_type || "online");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file, user.id);
      await updateProfile.mutateAsync({ avatar_url: url });
      toast({ title: "Avatar updated!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        full_name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        status_text: statusText.trim() || undefined,
        status_type: statusType,
      });
      toast({ title: "Profile updated!" });
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-primary">
                {(profile.full_name || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>
      </div>

      {/* Status type */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
        <div className="flex gap-2">
          {(["online", "away", "busy", "offline"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusType(s)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs capitalize transition-colors ${
                statusType === s ? "bg-secondary ring-1 ring-primary text-foreground" : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              <Circle className={`h-2 w-2 fill-current ${statusColors[s]} rounded-full`} />
              {s}
            </button>
          ))}
        </div>
        <Input
          value={statusText}
          onChange={(e) => setStatusText(e.target.value)}
          placeholder="What's on your mind?"
          className="h-9 rounded-xl bg-secondary border-border text-sm"
        />
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Name</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-10 rounded-xl bg-secondary border-border"
        />
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone</p>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+63 9XX XXX XXXX"
          className="h-10 rounded-xl bg-secondary border-border"
        />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bio</p>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          className="rounded-xl bg-secondary border-border resize-none"
          rows={3}
        />
      </div>

      {/* Save */}
      <Button
        className="w-full rounded-xl h-11"
        onClick={handleSave}
        disabled={updateProfile.isPending}
      >
        {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
        Save Changes
      </Button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Profile Content (read view)
   ═══════════════════════════════════════════════════════ */
function ProfileContent({ profile, primaryRole, onEditProfile, onOpenShoutouts }: {
  profile: UserProfileData;
  primaryRole: string;
  onEditProfile: () => void;
  onOpenShoutouts: () => void;
}) {
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Avatar + Name + Status */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <span className="text-2xl font-black text-primary">
                  {(profile.full_name || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            {/* Status indicator */}
            <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${statusColors[profile.status_type] || statusColors.online}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{profile.full_name || "Unnamed"}</p>
            {profile.status_text && (
              <p className="text-xs text-muted-foreground truncate italic">{profile.status_text}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {profile.roles.map(role => (
                <Badge key={role} className={`${roleBadgeColors[role] || "bg-secondary text-foreground border-border"} border text-[10px] capitalize`}>
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{profile.bio}</p>
        )}

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

      {/* Edit Profile button */}
      <Button
        variant="outline"
        className="w-full rounded-xl gap-2"
        onClick={onEditProfile}
      >
        <Edit3 className="h-4 w-4" />
        Edit Profile
      </Button>

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
    statCards.push({ label: "Rides Taken", value: profile.completedRides || 0, icon: MapPin });
  } else if (primaryRole === "dispatcher") {
    statCards.push({ label: "Dispatched", value: profile.totalDispatched || 0, icon: Users });
  } else if (primaryRole === "operator") {
    statCards.push({ label: "Vehicles", value: profile.totalVehicles || 0, icon: Car });
  } else if (primaryRole === "admin") {
    statCards.push({ label: "Total Users", value: profile.totalUsers || 0, icon: Users });
  }

  if (!statCards.length) return null;

  return (
    <div className={`grid gap-2.5 ${statCards.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
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
        <Button variant="outline" size="sm" className="w-full rounded-xl gap-1.5" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3.5 w-3.5" />
          {showCreate ? "Cancel" : "Create Shoutout"}
        </Button>
      )}

      <AnimatePresence>
        {showCreate && canManage && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <CreateShoutoutForm onDone={() => setShowCreate(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
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
      await createShoutout.mutateAsync({ assignedTo: selectedRider, title: title.trim(), message: message.trim() || undefined });
      setTitle(""); setMessage(""); setSelectedRider(""); onDone();
    } catch {}
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New Shoutout</p>
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground">Assign to rider</p>
        {loadingRiders ? <Skeleton className="h-10 rounded-xl" /> : (
          <div className="flex flex-wrap gap-1.5">
            {riders?.map(r => (
              <button key={r.user_id} onClick={() => setSelectedRider(r.user_id)}
                className={`rounded-xl px-3 py-1.5 text-xs transition-colors ${selectedRider === r.user_id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/70"}`}>
                {r.full_name || "Unnamed"}
              </button>
            ))}
          </div>
        )}
      </div>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Shoutout title..." className="h-10 rounded-xl bg-secondary border-border" />
      <Input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message (optional)..." className="h-10 rounded-xl bg-secondary border-border" />
      <Button className="w-full rounded-xl h-10" onClick={handleSubmit} disabled={!selectedRider || !title.trim() || createShoutout.isPending}>
        {createShoutout.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Megaphone className="h-4 w-4 mr-1" />}
        Send Shoutout
      </Button>
    </div>
  );
}

function ShoutoutCard({ shoutout, canDelete, index }: { shoutout: Shoutout; canDelete: boolean; index: number }) {
  const deleteShoutout = useDeleteShoutout();
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="glass-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0 mt-0.5">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{shoutout.title}</p>
            {shoutout.message && <p className="text-xs text-muted-foreground mt-1">{shoutout.message}</p>}
            <p className="text-[10px] text-muted-foreground mt-1.5">{formatRelativeTime(shoutout.created_at)}</p>
          </div>
        </div>
        {canDelete && (
          <button onClick={() => deleteShoutout.mutate(shoutout.id)} className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors" disabled={deleteShoutout.isPending}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
