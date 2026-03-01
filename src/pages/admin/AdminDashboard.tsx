import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
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

const ALL_ROLES = ["customer", "rider", "dispatcher", "operator", "admin"] as const;

export default function AdminDashboard() {
  const [rankingOpen, setRankingOpen] = useState(false);
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => setRankingOpen(true)}>
          <Trophy className="h-3.5 w-3.5" />
          Rankings
        </Button>
      </div>
      <OverviewView />
      <OperatorRankingChannel open={rankingOpen} onOpenChange={setRankingOpen} />
    </DashboardLayout>
  );
}

export function AdminUsers() {
  return <DashboardLayout><UsersView /></DashboardLayout>;
}

export function AdminAllRides() {
  return <DashboardLayout><AdminRidesView /></DashboardLayout>;
}

export function AdminMap() {
  return <DashboardLayout fullScreen><ActiveRidesMap /></DashboardLayout>;
}

export function AdminRoles() {
  return <DashboardLayout><RolesView /></DashboardLayout>;
}

// ─── Overview ────────────────────────────────────────────────────────

function OverviewView() {
  const { data: profiles } = useQuery({ queryKey: ["admin-profiles"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*"); if (error) throw error; return data; } });
  const { data: rides } = useQuery({ queryKey: ["admin-rides"], queryFn: async () => { const { data, error } = await supabase.from("rides").select("*"); if (error) throw error; return data; } });
  const { data: vehicles } = useQuery({ queryKey: ["admin-vehicles"], queryFn: async () => { const { data, error } = await supabase.from("vehicles").select("*"); if (error) throw error; return data; } });

  const totalUsers = profiles?.length || 0;
  const totalRides = rides?.length || 0;
  const completedRides = rides?.filter(r => r.status === "completed").length || 0;
  const activeRides = rides?.filter(r => ["requested", "accepted", "en_route", "picked_up"].includes(r.status)).length || 0;
  const revenue = rides?.filter(r => r.status === "completed").reduce((s, r) => s + Number(r.fare || 0), 0) || 0;
  const bannedUsers = profiles?.filter(p => p.is_banned).length || 0;

  const stats = [
    { label: "Users", value: totalUsers, icon: Users, color: "text-info" },
    { label: "Total Rides", value: totalRides, icon: MapPin, color: "text-foreground" },
    { label: "Active", value: activeRides, icon: TrendingUp, color: "text-warning" },
    { label: "Completed", value: completedRides, icon: BarChart3, color: "text-primary" },
    { label: "Revenue", value: `₱${revenue.toFixed(0)}`, icon: TrendingUp, color: "text-foreground" },
    { label: "Banned", value: bannedUsers, icon: Ban, color: "text-destructive" },
  ];

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Admin Overview</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Users View (with create, ban, role management) ──────────────────

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

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter(p => {
      // Search by name or phone
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = (p.full_name || "").toLowerCase().includes(q);
        const matchesPhone = (p.phone || "").toLowerCase().includes(q);
        if (!matchesName && !matchesPhone) return false;
      }
      // Filter by role
      if (roleFilter !== "all") {
        const userRoles = getRoles(p.user_id);
        if (!userRoles.some(r => r.role === roleFilter)) return false;
      }
      // Filter by status
      if (statusFilter === "banned" && !p.is_banned) return false;
      if (statusFilter === "active" && p.is_banned) return false;
      return true;
    });
  }, [profiles, allRoles, searchQuery, roleFilter, statusFilter]);

  // Ban / Unban
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

  // Add role
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

  // Remove role
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">User Management</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create New Account</DialogTitle>
            </DialogHeader>
            <CreateUserForm onSuccess={() => {
              setCreateOpen(false);
              queryClient.invalidateQueries({ queryKey: ["admin-all-profiles"] });
              queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 rounded-xl bg-secondary border-border text-xs flex-1">
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
            <SelectTrigger className="h-9 rounded-xl bg-secondary border-border text-xs flex-1">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setSearchQuery(""); setRoleFilter("all"); setStatusFilter("all"); }}
            >
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2.5">
        {filteredProfiles.length} user{filteredProfiles.length !== 1 ? "s" : ""}{hasActiveFilters ? " found" : ""}
      </p>

      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {filteredProfiles.map((p, i) => {
              const userRoles = getRoles(p.user_id);
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.02 }}
                  className="glass-card p-4 cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
                  onClick={() => setSelectedUser(p)}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${p.is_banned ? "bg-destructive/20 text-destructive" : "bg-secondary text-foreground"}`}>
                        {(p.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{p.full_name || "Unnamed"}</p>
                          {p.is_banned && (
                            <Badge className="border border-destructive/30 bg-destructive/10 text-destructive text-[10px]">Banned</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{p.phone || "No phone"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap items-center gap-1 mb-3">
                    {userRoles.map(r => (
                      <Badge key={r.id} className="border border-info/20 bg-info/10 text-info text-[10px] capitalize gap-1 pr-1">
                        {r.role as string}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeRoleMutation.mutate(r.id); }}
                          className="ml-0.5 rounded-full hover:bg-info/20 p-0.5 transition-colors"
                          title="Remove role"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                    <button
                      onClick={(e) => { e.stopPropagation(); setRoleUser(p); setNewRole(""); }}
                      className="flex items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    >
                      <Plus className="h-2.5 w-2.5" /> Add role
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {p.is_banned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={(e) => { e.stopPropagation(); banMutation.mutate({ userId: p.user_id, ban: false }); }}
                        disabled={banMutation.isPending}
                      >
                        <CheckCircle className="h-3 w-3" /> Unban
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); setBanDialogUser(p); }}
                      >
                        <Ban className="h-3 w-3" /> Ban
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredProfiles.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No users found</p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs mt-1 text-primary"
                  onClick={() => { setSearchQuery(""); setRoleFilter("all"); setStatusFilter("all"); }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* User Detail Sheet */}
      <UserDetailSheet
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
        roles={selectedUser ? getRoles(selectedUser.user_id) : []}
        rides={selectedUser ? getUserRides(selectedUser.user_id) : []}
        onBan={() => { setSelectedUser(null); setBanDialogUser(selectedUser); }}
        onUnban={() => { banMutation.mutate({ userId: selectedUser.user_id, ban: false }); setSelectedUser(null); }}
        onAddRole={() => { setRoleUser(selectedUser); setNewRole(""); }}
      />

      {/* Ban confirmation dialog */}
      <Dialog open={!!banDialogUser} onOpenChange={(open) => { if (!open) { setBanDialogUser(null); setBanReason(""); } }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Ban {banDialogUser?.full_name || "User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">This will prevent the user from accessing the platform.</p>
            <Textarea
              placeholder="Reason for ban (optional)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="rounded-xl bg-secondary border-border"
              maxLength={500}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => { setBanDialogUser(null); setBanReason(""); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => banMutation.mutate({ userId: banDialogUser.user_id, ban: true, reason: banReason })}
                disabled={banMutation.isPending}
              >
                Confirm Ban
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add role dialog */}
      <Dialog open={!!roleUser} onOpenChange={(open) => { if (!open) setRoleUser(null); }}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-info" />
              Add Role — {roleUser?.full_name || "User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="h-11 rounded-xl bg-secondary border-border">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map(r => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full h-11 rounded-xl"
              onClick={() => addRoleMutation.mutate({ userId: roleUser.user_id, role: newRole })}
              disabled={!newRole || addRoleMutation.isPending}
            >
              Add Role
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── User Detail Sheet ───────────────────────────────────────────────

function UserDetailSheet({
  user,
  open,
  onOpenChange,
  roles,
  rides,
  onBan,
  onUnban,
  onAddRole,
}: {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: any[];
  rides: any[];
  onBan: () => void;
  onUnban: () => void;
  onAddRole: () => void;
}) {
  if (!user) return null;

  const completedRides = rides.filter(r => r.status === "completed").length;
  const totalFare = rides.filter(r => r.status === "completed").reduce((s, r) => s + Number(r.fare || 0), 0);
  const joinedDate = new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-background border-border overflow-y-auto">
        <SheetHeader className="pb-0">
          <SheetTitle className="sr-only">User Profile</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 pt-2">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${user.is_banned ? "bg-destructive/20 text-destructive" : "bg-primary/15 text-primary"}`}>
              {(user.full_name || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground truncate">{user.full_name || "Unnamed"}</h3>
                {user.is_banned && (
                  <Badge className="border border-destructive/30 bg-destructive/10 text-destructive text-[10px] shrink-0">Banned</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{user.status_text || user.status_type || "online"}</p>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</p>
                <p className="text-xs font-medium text-foreground">{user.phone || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Joined</p>
                <p className="text-xs font-medium text-foreground">{joinedDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rides</p>
                <p className="text-xs font-medium text-foreground">{rides.length} total · {completedRides} completed</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</p>
                <p className="text-xs font-medium text-foreground">₱{totalFare.toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <>
              <Separator className="bg-border" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Bio</p>
                <p className="text-xs text-foreground leading-relaxed">{user.bio}</p>
              </div>
            </>
          )}

          <Separator className="bg-border" />

          {/* Roles */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Roles</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {roles.map(r => (
                <Badge key={r.id} className="border border-info/20 bg-info/10 text-info text-[10px] capitalize">
                  {r.role as string}
                </Badge>
              ))}
              {roles.length === 0 && <p className="text-xs text-muted-foreground italic">No roles assigned</p>}
              <button
                onClick={onAddRole}
                className="flex items-center gap-0.5 rounded-full border border-dashed border-border px-2.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <Plus className="h-2.5 w-2.5" /> Add
              </button>
            </div>
          </div>

          {/* Ban Info */}
          {user.is_banned && (
            <>
              <Separator className="bg-border" />
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-xs font-medium text-destructive">Account Banned</p>
                </div>
                {user.ban_reason && (
                  <p className="text-[11px] text-destructive/80 mt-1">{user.ban_reason}</p>
                )}
                {user.banned_at && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Banned on {new Date(user.banned_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
            </>
          )}

          <Separator className="bg-border" />

          {/* Recent Rides */}
          {rides.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Recent Rides</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {rides.slice(0, 5).map(ride => (
                  <div key={ride.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-foreground truncate">{ride.pickup_address} → {ride.dropoff_address}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(ride.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={`shrink-0 ml-2 text-[9px] capitalize ${
                      ride.status === "completed" ? "bg-primary/10 text-primary border-primary/30" :
                      ride.status === "cancelled" ? "bg-destructive/10 text-destructive border-destructive/30" :
                      "bg-warning/10 text-warning border-warning/30"
                    } border`}>
                      {(ride.status as string).replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {user.is_banned ? (
              <Button
                size="sm"
                className="flex-1 rounded-xl gap-1.5 bg-primary text-primary-foreground"
                onClick={onUnban}
              >
                <CheckCircle className="h-3.5 w-3.5" /> Unban User
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 rounded-xl gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={onBan}
              >
                <Ban className="h-3.5 w-3.5" /> Ban User
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Create User Form ────────────────────────────────────────────────

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: email.trim(), password, full_name: fullName.trim() || undefined, role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Account created", description: `${email} added as ${role}` });
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
      <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl bg-secondary border-border" />
      <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl bg-secondary border-border" />
      <Select value={role} onValueChange={setRole}>
        <SelectTrigger className="h-11 rounded-xl bg-secondary border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_ROLES.map(r => (
            <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button className="w-full h-11 rounded-xl" onClick={handleSubmit} disabled={loading || !email.trim() || !password.trim()}>
        {loading ? "Creating..." : "Create Account"}
      </Button>
    </div>
  );
}

// ─── Rides View ──────────────────────────────────────────────────────

function AdminRidesView() {
  const { data: rides, isLoading } = useQuery({
    queryKey: ["admin-all-rides-detail"],
    queryFn: async () => { const { data, error } = await supabase.from("rides").select("*").order("created_at", { ascending: false }).limit(100); if (error) throw error; return data; },
    refetchInterval: 5000,
  });

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
      <h2 className="mb-4 text-lg font-bold text-foreground">All Rides</h2>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2.5">
          {rides?.map((ride, i) => (
            <motion.div key={ride.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{ride.pickup_address} → {ride.dropoff_address}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(ride.created_at).toLocaleString()}</p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge className={`${statusColor[ride.status] || ""} border text-[10px] capitalize`}>{(ride.status as string).replace("_", " ")}</Badge>
                  {ride.fare && <p className="mt-1 text-sm font-bold text-foreground">₱{Number(ride.fare).toFixed(2)}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Roles View ──────────────────────────────────────────────────────

function RolesView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const { data: profiles } = useQuery({ queryKey: ["admin-profiles-for-roles"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*"); if (error) throw error; return data; } });
  const { data: allRoles } = useQuery({ queryKey: ["admin-roles-list"], queryFn: async () => { const { data, error } = await supabase.from("user_roles").select("*"); if (error) throw error; return data; } });

  const addRoleMutation = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("user_roles").insert({ user_id: selectedUser, role: selectedRole as any }); if (error) throw error; },
    onSuccess: () => { toast({ title: "Role added!" }); queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] }); setSelectedUser(""); setSelectedRole(""); },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => { const { error } = await supabase.from("user_roles").delete().eq("id", roleId); if (error) throw error; },
    onSuccess: () => { toast({ title: "Role removed!" }); queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] }); },
  });

  const getName = (userId: string) => profiles?.find(p => p.user_id === userId)?.full_name || "Unknown";

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Role Management</h2>

      <div className="glass-card mb-6 p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Assign Role</p>
        <div className="space-y-3">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="h-11 rounded-xl bg-secondary border-border">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {profiles?.map(p => (
                <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || "Unnamed"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="h-11 rounded-xl bg-secondary border-border">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map(r => (
                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="h-11 w-full rounded-xl"
            onClick={() => addRoleMutation.mutate()}
            disabled={!selectedUser || !selectedRole || addRoleMutation.isPending}
          >
            Add Role
          </Button>
        </div>
      </div>

      <div className="space-y-2.5">
        {allRoles?.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-info" />
                <div>
                  <p className="text-sm font-medium text-foreground">{getName(r.user_id)}</p>
                  <Badge className="mt-0.5 border border-info/20 bg-info/10 text-info text-[10px] capitalize">{r.role as string}</Badge>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive rounded-xl"
                onClick={() => removeRoleMutation.mutate(r.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-card h-16 animate-pulse bg-secondary/50" />
      ))}
    </div>
  );
}
