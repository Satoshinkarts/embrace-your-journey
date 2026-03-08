import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, useUpdateProfile, uploadAvatar, type UserProfileData } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Star, Bike, DollarSign, Award, Calendar, Phone, 
  Edit3, Check, Camera, Loader2, Circle, ChevronLeft,
} from "lucide-react";
import { useRef } from "react";

const statusColors: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-warning",
  busy: "bg-destructive",
  offline: "bg-muted-foreground",
};

const springTransition = { type: "spring" as const, stiffness: 400, damping: 17 };

export default function RiderProfile() {
  return (
    <DashboardLayout>
      <RiderProfileContent />
    </DashboardLayout>
  );
}

function RiderProfileContent() {
  const { data: profile, isLoading } = useUserProfile();
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="glass-card p-8 text-center">
        <User className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {editing ? (
        <motion.div
          key="edit"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <EditRiderProfile profile={profile} onDone={() => setEditing(false)} />
        </motion.div>
      ) : (
        <motion.div
          key="view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <ViewRiderProfile profile={profile} onEdit={() => setEditing(true)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ViewRiderProfile({ profile, onEdit }: { profile: UserProfileData; onEdit: () => void }) {
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const statCards = [
    { label: "Completed Rides", value: profile.completedRides || 0, icon: Bike },
    { label: "Earnings", value: `₱${(profile.totalEarnings || 0).toFixed(0)}`, icon: DollarSign },
    { label: "Avg Rating", value: (profile.avgRating || 0).toFixed(1), icon: Star },
    { label: "Reviews", value: profile.totalReviews || 0, icon: Award },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">My Profile</h2>

      {/* Avatar + Info Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: "backOut" }}
        className="glass-card p-5"
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={springTransition}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                <span className="text-2xl font-black text-primary">
                  {(profile.full_name || "?")[0].toUpperCase()}
                </span>
              )}
            </motion.div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${statusColors[profile.status_type] || statusColors.online}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{profile.full_name || "Unnamed"}</p>
            {profile.status_text && (
              <p className="text-xs text-muted-foreground truncate italic">{profile.status_text}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {profile.roles.map(role => (
                <Badge key={role} className="bg-primary/10 text-primary border-primary/30 border text-[10px] capitalize">
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

      {/* Edit button */}
      <motion.div whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }} transition={springTransition}>
        <Button variant="outline" className="w-full rounded-xl gap-2" onClick={onEdit}>
          <Edit3 className="h-4 w-4" />
          Edit Profile
        </Button>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.35, ease: "easeOut" }}
            whileHover={{ y: -2 }}
            className="glass-card p-3.5 text-center"
          >
            <s.icon className="mx-auto h-4 w-4 text-primary mb-1.5" />
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function EditRiderProfile({ profile, onDone }: { profile: UserProfileData; onDone: () => void }) {
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
      <div className="flex items-center gap-3">
        <button onClick={onDone} className="text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-foreground">Edit Profile</h2>
      </div>

      {/* Avatar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "backOut" }}
        className="flex flex-col items-center"
      >
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
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={springTransition}
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </motion.button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>
      </motion.div>

      {/* Status */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
        <div className="flex gap-2">
          {(["online", "away", "busy", "offline"] as const).map((s) => (
            <motion.button
              key={s}
              whileTap={{ scale: 0.95 }}
              transition={springTransition}
              onClick={() => setStatusType(s)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs capitalize transition-colors ${
                statusType === s ? "bg-secondary ring-1 ring-primary text-foreground" : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              <Circle className={`h-2 w-2 fill-current ${statusColors[s]} rounded-full`} />
              {s}
            </motion.button>
          ))}
        </div>
        <Input
          value={statusText}
          onChange={(e) => setStatusText(e.target.value)}
          placeholder="What's on your mind?"
          className="h-9 rounded-xl bg-secondary border-border text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Name</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-10 rounded-xl bg-secondary border-border" />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone</p>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 9XX XXX XXXX" className="h-10 rounded-xl bg-secondary border-border" />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bio</p>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." className="rounded-xl bg-secondary border-border resize-none" rows={3} />
      </div>

      <motion.div whileTap={{ scale: 0.97 }} transition={springTransition}>
        <Button className="w-full rounded-xl h-11" onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </motion.div>
    </div>
  );
}
