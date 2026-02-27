import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ActiveRidesMap from "@/components/ActiveRidesMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, MapPin, Shield, BarChart3, Trash2, TrendingUp, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperatorRankingChannel } from "@/components/RankingChannel";

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

function OverviewView() {
  const { data: profiles } = useQuery({ queryKey: ["admin-profiles"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*"); if (error) throw error; return data; } });
  const { data: rides } = useQuery({ queryKey: ["admin-rides"], queryFn: async () => { const { data, error } = await supabase.from("rides").select("*"); if (error) throw error; return data; } });
  const { data: vehicles } = useQuery({ queryKey: ["admin-vehicles"], queryFn: async () => { const { data, error } = await supabase.from("vehicles").select("*"); if (error) throw error; return data; } });

  const totalUsers = profiles?.length || 0;
  const totalRides = rides?.length || 0;
  const completedRides = rides?.filter(r => r.status === "completed").length || 0;
  const activeRides = rides?.filter(r => ["requested", "accepted", "en_route", "picked_up"].includes(r.status)).length || 0;
  const revenue = rides?.filter(r => r.status === "completed").reduce((s, r) => s + Number(r.fare || 0), 0) || 0;

  const stats = [
    { label: "Users", value: totalUsers, icon: Users, color: "text-info" },
    { label: "Total Rides", value: totalRides, icon: MapPin, color: "text-foreground" },
    { label: "Active", value: activeRides, icon: TrendingUp, color: "text-warning" },
    { label: "Completed", value: completedRides, icon: BarChart3, color: "text-primary" },
    { label: "Revenue", value: `₱${revenue.toFixed(0)}`, icon: TrendingUp, color: "text-foreground" },
    { label: "Vehicles", value: vehicles?.length || 0, icon: MapPin, color: "text-foreground" },
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

function UsersView() {
  const { data: profiles, isLoading } = useQuery({ queryKey: ["admin-all-profiles"], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; } });
  const { data: allRoles } = useQuery({ queryKey: ["admin-all-roles"], queryFn: async () => { const { data, error } = await supabase.from("user_roles").select("*"); if (error) throw error; return data; } });

  const getRoles = (userId: string) => allRoles?.filter(r => r.user_id === userId).map(r => r.role as string) || [];

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">All Users</h2>
      {isLoading ? <LoadingSkeleton /> : (
        <div className="space-y-2.5">
          {profiles?.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                    {(p.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.full_name || "Unnamed"}</p>
                    <p className="text-[10px] text-muted-foreground">{p.phone || "No phone"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {getRoles(p.user_id).map(role => (
                    <Badge key={role} className="border border-info/20 bg-info/10 text-info text-[10px] capitalize">{role}</Badge>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

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
              {["customer", "rider", "dispatcher", "operator", "admin"].map(r => (
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

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-card h-16 animate-pulse bg-secondary/50" />
      ))}
    </div>
  );
}
