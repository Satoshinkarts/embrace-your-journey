import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ActiveRidesMap from "@/components/ActiveRidesMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Users, MapPin, Shield, BarChart3, Trash2, TrendingUp, Trophy, Plus, Ban, CheckCircle, UserPlus, ShieldAlert, ShieldCheck, Search, Filter, X, Calendar, Phone, User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperatorRankingChannel } from "@/components/RankingChannel";
import BookingTimeline from "@/components/BookingTimeline";

const ALL_ROLES = ["customer", "rider", "dispatcher", "operator", "admin"] as const;

export default function AdminDashboard() {
  const [rankingOpen, setRankingOpen] = useState(false);
  return (
    <SidebarLayout>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setRankingOpen(true)}>
          <Trophy className="h-3.5 w-3.5" />
          Rankings
        </Button>
      </div>
      <OverviewView />
      <OperatorRankingChannel open={rankingOpen} onOpenChange={setRankingOpen} />
    </SidebarLayout>
  );
}

export function AdminUsers() {
  return <SidebarLayout><UsersView /></SidebarLayout>;
}

export function AdminAllRides() {
  return <SidebarLayout><AdminRidesView /></SidebarLayout>;
}

export function AdminMap() {
  return <SidebarLayout fullScreen><ActiveRidesMap /></SidebarLayout>;
}

export function AdminRoles() {
  return <SidebarLayout><RolesView /></SidebarLayout>;
}

// ─── Overview ────────────────────────────────────────────────────────

function OverviewView() {
  const { data: profiles } = useQuery({ queryKey: ["admin-profiles"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*"); if (error) throw error; return data; } });
  const { data: rides } = useQuery({ queryKey: ["admin-rides"], queryFn: async () => { const { data, error } = await supabase.from("rides").select("*"); if (error) throw error; return data; } });
  const { data: vehicles } = useQuery({ queryKey: ["admin-vehicles"], queryFn: async () => { const { data, error } = await supabase.from("vehicles").select("*"); if (error) throw error; return data; } });
  const { data: networks } = useQuery({ queryKey: ["admin-networks-overview"], queryFn: async () => { const { data, error } = await supabase.from("networks").select("*"); if (error) throw error; return data; } });

  const totalUsers = profiles?.length || 0;
  const totalRides = rides?.length || 0;
  const completedRides = rides?.filter(r => r.status === "completed").length || 0;
  const activeRides = rides?.filter(r => ["requested", "accepted", "en_route", "picked_up"].includes(r.status)).length || 0;
  const revenue = rides?.filter(r => r.status === "completed").reduce((s, r) => s + Number(r.fare || 0), 0) || 0;
  const bannedUsers = profiles?.filter(p => p.is_banned).length || 0;
  const totalNetworks = networks?.length || 0;
  const verifiedNetworks = networks?.filter(n => n.status === "approved").length || 0;

  const stats = [
    { label: "Users", value: totalUsers, icon: Users, color: "text-info" },
    { label: "Networks", value: totalNetworks, icon: Shield, color: "text-primary" },
    { label: "Verified", value: verifiedNetworks, icon: CheckCircle, color: "text-primary" },
    { label: "Total Rides", value: totalRides, icon: MapPin, color: "text-foreground" },
    { label: "Active", value: activeRides, icon: TrendingUp, color: "text-warning" },
    { label: "Completed", value: completedRides, icon: BarChart3, color: "text-primary" },
    { label: "Revenue", value: `₱${revenue.toFixed(0)}`, icon: TrendingUp, color: "text-foreground" },
    { label: "Banned", value: bannedUsers, icon: Ban, color: "text-destructive" },
  ];

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Platform Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Users View ──────────────────────────────────────────────────────

function UsersView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [banDialogUser, setBanDialogUser] = useState<any>(null);
  const [banReason, setBanReason] = useState("");
  const [roleUser, setRoleUser] = useState<any>(null);
  const [newRole, setNewRole] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: allRoles } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: rides } = useQuery({
    queryKey: ["admin-user-rides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getRoles = (userId: string) => allRoles?.filter(r => r.user_id === userId) || [];
  const getUserRides = (userId: string) => rides?.filter(r => r.customer_id === userId || r.rider_id === userId) || [];

  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = (p.full_name || "").toLowerCase().includes(q);
        const matchesPhone = (p.phone || "").toLowerCase().includes(q);
        if (!matchesName && !matchesPhone) return false;
      }
      if (roleFilter !== "all") {
        const userRoles = getRoles(p.user_id);
        if (!userRoles.some(r => r.role === roleFilter)) return false;
      }
      if (statusFilter === "banned" && !p.is_banned) return false;
      if (statusFilter === "active" && p.is_banned) return false;
      return true;
    });
  }, [profiles, allRoles, searchQuery, roleFilter, statusFilter]);

  const banMutation = useMutation({
    mutationFn: async ({ userId, ban, reason }: { userId: string; ban: boolean; reason?: string }) => {
      const { error } = await supabase.from("profiles").update({
        is_banned: ban,
        ban_reason: ban ? reason || null : null,
        banned_at: ban ? new Date().toISOString() : null,
      }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.ban ? "User banned" : "User unbanned" });
      queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
      setBanDialogUser(null);
      setBanReason("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role added" });
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
      setRoleUser(null);
      setNewRole("");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role removed" });
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
    },
  });

  const hasActiveFilters = searchQuery || roleFilter !== "all" || statusFilter !== "all";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">User Management</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Create New Account</DialogTitle></DialogHeader>
            <CreateUserForm onSuccess={() => {
              setCreateOpen(false);
              queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
              queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 space-y-2.5 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-secondary border-border"
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 rounded-xl bg-secondary border-border text-xs flex-1 max-w-[200px]">
              <Filter className="h-3 w-3 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ALL_ROLES.map(r => (
                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 rounded-xl bg-secondary border-border text-xs flex-1 max-w-[200px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 px-2.5 rounded-xl text-xs"
              onClick={() => { setSearchQuery(""); setRoleFilter("all"); setStatusFilter("all"); }}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
        {filteredProfiles.length} user{filteredProfiles.length !== 1 ? "s" : ""}{hasActiveFilters ? " found" : ""}
      </p>

      {isLoading ? <LoadingSkeleton /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredProfiles.map((p, i) => {
              const userRoles = getRoles(p.user_id);
              return (
                <motion.div
                  key={p.id} layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.02 }}
                  className="glass-card p-4 cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
                  onClick={() => setSelectedUser(p)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${p.is_banned ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"}`}>
                        {(p.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{p.full_name || "Unnamed"}</p>
                          {p.is_banned && <Badge className="border border-destructive/30 bg-destructive/10 text-destructive text-[10px]">Banned</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{p.phone || "No phone"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mb-3">
                    {userRoles.map(r => (
                      <Badge key={r.id} className="border border-info/20 bg-info/10 text-info text-[10px] capitalize gap-1 pr-1">
                        {r.role as string}
                        <button onClick={(e) => { e.stopPropagation(); removeRoleMutation.mutate(r.id); }}
                          className="ml-0.5 rounded-full hover:bg-info/20 p-0.5"><Trash2 className="h-2.5 w-2.5" /></button>
                      </Badge>
                    ))}
                    <button onClick={(e) => { e.stopPropagation(); setRoleUser(p); setNewRole(""); }}
                      className="flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      <Plus className="h-2.5 w-2.5" /> Add role
                    </button>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {p.is_banned ? (
                      <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs gap-1 border-primary/30 text-primary"
                        onClick={() => banMutation.mutate({ userId: p.user_id, ban: false })} disabled={banMutation.isPending}>
                        <CheckCircle className="h-3 w-3" /> Unban
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs gap-1 border-destructive/30 text-destructive"
                        onClick={() => setBanDialogUser(p)}>
                        <Ban className="h-3 w-3" /> Ban
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Ban dialog */}
      <Dialog open={!!banDialogUser} onOpenChange={() => setBanDialogUser(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Ban {banDialogUser?.full_name || "User"}</DialogTitle></DialogHeader>
          <Textarea placeholder="Reason for ban..." value={banReason} onChange={(e) => setBanReason(e.target.value)} className="rounded-xl bg-secondary border-border" />
          <Button variant="destructive" className="w-full rounded-xl" onClick={() => banMutation.mutate({ userId: banDialogUser.user_id, ban: true, reason: banReason })} disabled={banMutation.isPending}>
            Confirm Ban
          </Button>
        </DialogContent>
      </Dialog>

      {/* Add role dialog */}
      <Dialog open={!!roleUser} onOpenChange={() => setRoleUser(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Add Role to {roleUser?.full_name || "User"}</DialogTitle></DialogHeader>
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="rounded-xl bg-secondary border-border"><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="w-full rounded-xl" onClick={() => addRoleMutation.mutate({ userId: roleUser.user_id, role: newRole })} disabled={!newRole || addRoleMutation.isPending}>
            Add Role
          </Button>
        </DialogContent>
      </Dialog>

      {/* User detail sheet */}
      <UserDetailSheet user={selectedUser} open={!!selectedUser} onClose={() => setSelectedUser(null)} allRoles={allRoles} rides={rides} />
    </SidebarLayout>
  );
}

function UserDetailSheet({ user, open, onClose, allRoles, rides }: any) {
  if (!user) return null;
  const userRoles = allRoles?.filter((r: any) => r.user_id === user.user_id) || [];
  const userRides = rides?.filter((r: any) => r.customer_id === user.user_id || r.rider_id === user.user_id) || [];
  const completedRides = userRides.filter((r: any) => r.status === "completed");
  const totalRevenue = completedRides.reduce((s: number, r: any) => s + Number(r.fare || 0), 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{user.full_name || "User Details"}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-xl font-bold text-foreground">
              {(user.full_name || "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{user.full_name || "Unnamed"}</p>
              <div className="flex gap-1 mt-1">{userRoles.map((r: any) => (
                <Badge key={r.id} className="border border-info/20 bg-info/10 text-info text-[10px] capitalize">{r.role}</Badge>
              ))}</div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-3"><p className="text-[10px] text-muted-foreground uppercase">Total Rides</p><p className="text-lg font-bold text-foreground">{userRides.length}</p></div>
            <div className="glass-card p-3"><p className="text-[10px] text-muted-foreground uppercase">Completed</p><p className="text-lg font-bold text-primary">{completedRides.length}</p></div>
            <div className="glass-card p-3"><p className="text-[10px] text-muted-foreground uppercase">Revenue</p><p className="text-lg font-bold text-foreground">₱{totalRevenue.toFixed(0)}</p></div>
            <div className="glass-card p-3"><p className="text-[10px] text-muted-foreground uppercase">Joined</p><p className="text-sm font-medium text-foreground">{new Date(user.created_at).toLocaleDateString()}</p></div>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" /> {user.phone}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Admin Rides View ────────────────────────────────────────────────

function AdminRidesView() {
  const { data: rides, isLoading } = useQuery({
    queryKey: ["admin-all-rides-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);

  const statusColor: Record<string, string> = {
    requested: "bg-warning/10 text-warning border-warning/30",
    accepted: "bg-info/10 text-info border-info/30",
    en_route: "bg-info/10 text-info border-info/30",
    picked_up: "bg-primary/10 text-primary border-primary/30",
    completed: "bg-primary/10 text-primary border-primary/30",
    cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-foreground">All Rides</h2>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2.5">
          {rides?.map((ride, i) => (
            <motion.div key={ride.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
              className="glass-card p-4 cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
              onClick={() => setSelectedRideId(ride.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{ride.pickup_address} → {ride.dropoff_address}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(ride.created_at).toLocaleString()}
                    {ride.fare && <> · ₱{Number(ride.fare).toFixed(2)}</>}
                  </p>
                </div>
                <Badge className={`${statusColor[ride.status] || "bg-secondary"} border text-[10px] capitalize shrink-0`}>
                  {(ride.status as string).replace("_", " ")}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {/* Booking timeline sheet */}
      <Sheet open={!!selectedRideId} onOpenChange={() => setSelectedRideId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Booking Audit Log</SheetTitle></SheetHeader>
          <div className="mt-6">
            <BookingTimeline rideId={selectedRideId} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── Roles View ─────────────────────────────────────────────────────

function RolesView() {
  const { data: allRoles, isLoading } = useQuery({
    queryKey: ["admin-roles-view"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });
  const { data: profiles } = useQuery({
    queryKey: ["admin-roles-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name");
      if (error) throw error;
      return data;
    },
  });

  const getName = (userId: string) => profiles?.find(p => p.user_id === userId)?.full_name || "Unknown";

  const grouped = useMemo(() => {
    const map: Record<string, typeof allRoles> = {};
    ALL_ROLES.forEach(r => { map[r] = []; });
    allRoles?.forEach(r => { if (map[r.role]) map[r.role]!.push(r); });
    return map;
  }, [allRoles]);

  return (
    <div>
      <h2 className="mb-6 text-xl font-bold text-foreground">Role Distribution</h2>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_ROLES.map(role => (
            <div key={role} className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground capitalize">{role}</p>
                <Badge className="bg-info/10 text-info border-info/20 border text-[10px]">{grouped[role]?.length || 0}</Badge>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {grouped[role]?.map(r => (
                  <p key={r.id} className="text-xs text-muted-foreground truncate">{getName(r.user_id)}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create User Form ───────────────────────────────────────────────

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email, password, full_name: fullName, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "User created!", description: `${fullName} (${role})` });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl bg-secondary border-border" />
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl bg-secondary border-border" />
      <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl bg-secondary border-border" />
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="rounded-xl bg-secondary border-border"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ALL_ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button className="w-full rounded-xl" onClick={handleCreate} disabled={!email || !password || !fullName || loading}>
        {loading ? "Creating..." : "Create User"}
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="glass-card h-24 animate-pulse bg-secondary/50" />)}
    </div>
  );
}
