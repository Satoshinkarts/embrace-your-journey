import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, useUpdateProfile, uploadAvatar } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchLandmarks } from "@/data/panayLandmarks";
import {
  User, Edit3, Camera, Loader2, LogOut, Settings, HelpCircle,
  Home, Briefcase, MapPin, ChevronRight, X, Star,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerProfile() {
  return (
    <DashboardLayout>
      <ProfilePage />
    </DashboardLayout>
  );
}

function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"profile" | "saved">("profile");
  const { user, roles, signOut } = useAuth();
  const { data: profile, isLoading } = useUserProfile();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="pb-4">
      {/* Header */}
      <h1 className="text-xl font-bold text-foreground text-center mb-4">User Profile</h1>

      {/* Avatar */}
      <div className="flex justify-center mb-5">
        <div className="relative">
          <div className="h-28 w-28 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-4 border-border">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl font-black text-foreground">{initials}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mb-4 border-b border-border">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 pb-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === "profile"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex-1 pb-2.5 text-sm font-medium text-center transition-colors ${
            activeTab === "saved"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
          }`}
        >
          Saved Locations
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "profile" ? (
          <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </div>
            ) : profile ? (
              <ProfileTab profile={profile} onSignOut={handleSignOut} />
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">Profile not found</div>
            )}
          </motion.div>
        ) : (
          <motion.div key="saved" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.15 }}>
            <SavedLocationsTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Profile Tab ── */
function ProfileTab({ profile, onSignOut }: { profile: any; onSignOut: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingContact, setEditingContact] = useState(false);

  const [name, setName] = useState(profile.full_name || "");
  const [sex, setSex] = useState("");
  const [phone, setPhone] = useState(profile.phone || "");

  const handleSavePersonal = async () => {
    try {
      await updateProfile.mutateAsync({ full_name: name.trim() || undefined });
      toast({ title: "Personal info updated" });
      setEditingPersonal(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveContact = async () => {
    try {
      await updateProfile.mutateAsync({ phone: phone.trim() || undefined });
      toast({ title: "Contact info updated" });
      setEditingContact(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Personal Information */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
          <button onClick={() => editingPersonal ? handleSavePersonal() : setEditingPersonal(true)} className="text-primary">
            {editingPersonal ? (
              <span className="text-xs font-medium">Save</span>
            ) : (
              <Edit3 className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Name</p>
            {editingPersonal ? (
              <Input value={name} onChange={e => setName(e.target.value)} className="h-9 rounded-xl bg-secondary border-border text-sm" />
            ) : (
              <p className="text-sm font-medium text-foreground">{profile.full_name || "Not set"}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Sex</p>
            {editingPersonal ? (
              <Input value={sex} onChange={e => setSex(e.target.value)} placeholder="Male / Female / Other" className="h-9 rounded-xl bg-secondary border-border text-sm" />
            ) : (
              <p className="text-sm font-medium text-foreground">{sex || "Not Specified"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground">Contact Information</h3>
          <button onClick={() => editingContact ? handleSaveContact() : setEditingContact(true)} className="text-primary">
            {editingContact ? (
              <span className="text-xs font-medium">Save</span>
            ) : (
              <Edit3 className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Mobile Number</p>
            {editingContact ? (
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+639XXXXXXXXX" className="h-9 rounded-xl bg-secondary border-border text-sm" />
            ) : (
              <p className="text-sm font-medium text-foreground">{profile.phone || "Not set"}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">E-mail</p>
            <p className="text-sm font-medium text-foreground">{user?.email || "Not set"}</p>
          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3">Account Settings</h3>
      </div>

      {/* Sign Out */}
      <Button onClick={onSignOut} className="w-full h-12 text-sm font-bold bg-primary">
        SIGN OUT
      </Button>

      {/* Settings / Support */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button className="flex items-center gap-2 text-sm text-foreground font-medium">
          <Settings className="h-4 w-4" /> Settings
        </button>
        <button onClick={() => navigate("/dashboard/support")} className="flex items-center gap-2 text-sm text-foreground font-medium">
          <HelpCircle className="h-4 w-4" /> Support
        </button>
      </div>
    </div>
  );
}

/* ── Saved Locations Tab ── */
function SavedLocationsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["saved-locations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_locations" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const homeLocation = locations?.find((l: any) => l.label === "home");
  const workLocation = locations?.find((l: any) => l.label === "work");
  const customLocations = locations?.filter((l: any) => l.label === "custom") || [];

  return (
    <div className="space-y-2">
      <SavedLocationRow
        icon={Home}
        iconColor="text-primary"
        iconBg="bg-primary/10"
        label="home"
        title={homeLocation?.name || "Add Home"}
        subtitle={homeLocation?.address}
        location={homeLocation}
      />
      <SavedLocationRow
        icon={Briefcase}
        iconColor="text-primary"
        iconBg="bg-primary/10"
        label="work"
        title={workLocation?.name || "Add Work"}
        subtitle={workLocation?.address}
        location={workLocation}
      />
      {customLocations.map((loc: any) => (
        <SavedLocationRow
          key={loc.id}
          icon={MapPin}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          label="custom"
          title={loc.name || "Custom"}
          subtitle={loc.address}
          location={loc}
        />
      ))}
      <SavedLocationRow
        icon={MapPin}
        iconColor="text-primary"
        iconBg="bg-primary/10"
        label="custom"
        title="Add Custom"
        location={null}
      />
    </div>
  );
}

function SavedLocationRow({
  icon: Icon, iconColor, iconBg, label, title, subtitle, location,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: "home" | "work" | "custom";
  title: string;
  subtitle?: string;
  location: any | null;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ place_name: string; center: [number, number]; isLandmark?: boolean }>>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("get-mapbox-token");
        if (data?.token) setMapboxToken(data.token);
      } catch {}
    })();
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!mapboxToken || query.length < 2) { setSuggestions([]); return; }
    try {
      const localMatches = searchLandmarks(query, 4).map(lm => ({
        place_name: lm.context ? `${lm.name}, ${lm.context}` : lm.name, center: [lm.lng, lm.lat] as [number, number], isLandmark: true,
      }));
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5&types=address,poi,place,locality,neighborhood&country=PH&bbox=121.8,10.4,123.2,12.0&proximity=122.5654,10.7202&language=en`
      );
      const data = await res.json();
      const mapboxResults = (data.features || []).map((f: any) => ({
        place_name: f.place_name, center: f.center, isLandmark: false,
      }));
      const names = new Set(localMatches.map(l => l.place_name.toLowerCase()));
      const filtered = mapboxResults.filter((r: any) => !names.has(r.place_name.split(",")[0].trim().toLowerCase()));
      setSuggestions([...localMatches, ...filtered].slice(0, 6));
    } catch { setSuggestions([]); }
  }, [mapboxToken]);

  const handleInputChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  };

  const saveMutation = useMutation({
    mutationFn: async (selected: { place_name: string; center: [number, number] }) => {
      const payload = {
        user_id: user!.id,
        label,
        name: selected.place_name.split(",")[0].trim(),
        address: selected.place_name,
        lat: selected.center[1],
        lng: selected.center[0],
        updated_at: new Date().toISOString(),
      };

      if (location?.id) {
        const { error } = await supabase
          .from("saved_locations" as any)
          .update(payload as any)
          .eq("id", location.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_locations" as any)
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      toast({ title: "Location saved!" });
      setEditing(false);
      setSearchInput("");
      setSuggestions([]);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSelect = (s: { place_name: string; center: [number, number] }) => {
    saveMutation.mutate(s);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-3 py-3 border-b border-border">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                autoFocus
                value={searchInput}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Search location..."
                className="h-8 border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <button onClick={() => { setEditing(false); setSearchInput(""); setSuggestions([]); }}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div>
              <p className={`text-sm font-medium ${location?.address ? "text-foreground" : "text-primary"}`}>{title}</p>
              {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
            </div>
          )}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-primary shrink-0">
            <Edit3 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search suggestions */}
      {editing && suggestions.length > 0 && (
        <div className="ml-13 overflow-hidden rounded-xl border border-border bg-card shadow-lg max-h-52 overflow-y-auto mb-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSelect(s)}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary border-b border-border last:border-0"
            >
              {s.isLandmark ? (
                <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              ) : (
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className="text-xs font-medium text-foreground">{s.place_name.split(",")[0]}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{s.place_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
