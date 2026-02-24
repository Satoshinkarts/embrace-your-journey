import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, MapPin, Shield, BarChart3, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function AdminDashboard() {
  return (
    <DashboardLayout>
      <OverviewView />
    </DashboardLayout>
  );
}

export function AdminUsers() {
  return (
    <DashboardLayout>
      <UsersView />
    </DashboardLayout>
  );
}

export function AdminAllRides() {
  return (
    <DashboardLayout>
      <AdminRidesView />
    </DashboardLayout>
  );
}

export function AdminRoles() {
  return (
    <DashboardLayout>
      <RolesView />
    </DashboardLayout>
  );
}

function OverviewView() {
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: rides } = useQuery({
    queryKey: ["admin-rides"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ["admin-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalUsers = profiles?.length || 0;
  const totalRides = rides?.length || 0;
  const completedRides = rides?.filter((r) => r.status === "completed").length || 0;
  const activeRides = rides?.filter((r) => ["requested", "accepted", "en_route", "picked_up"].includes(r.status)).length || 0;
  const revenue = rides?.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.fare || 0), 0) || 0;
  const totalVehicles = vehicles?.length || 0;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Admin Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-info" />
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalUsers}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="text-xs text-muted-foreground">Total Rides</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalRides}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-warning" />
            <p className="text-xs text-muted-foreground">Active Now</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-info">{activeRides}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-bold text-primary">{completedRides}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="mt-1 text-2xl font-bold text-foreground">₱{revenue.toFixed(2)}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Vehicles</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{totalVehicles}</p>
        </Card>
      </div>
    </div>
  );
}

function UsersView() {
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

  const getRoles = (userId: string) =>
    allRoles?.filter((r) => r.user_id === userId).map((r) => r.role as string) || [];

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">All Users</h2>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-3">
          {profiles?.map((p) => (
            <Card key={p.id} className="border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{p.phone || "No phone"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getRoles(p.user_id).map((role) => (
                    <Badge key={role} className="border border-info/30 bg-info/10 text-info text-xs capitalize">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminRidesView() {
  const { data: rides, isLoading } = useQuery({
    queryKey: ["admin-all-rides-detail"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
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
      <h2 className="mb-4 text-xl font-bold text-foreground">All Rides</h2>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-3">
          {rides?.map((ride) => (
            <Card key={ride.id} className="border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{ride.pickup_address} → {ride.dropoff_address}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ride.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <Badge className={`${statusColor[ride.status] || ""} border text-xs capitalize`}>
                    {(ride.status as string).replace("_", " ")}
                  </Badge>
                  {ride.fare && <p className="mt-1 text-sm font-semibold text-foreground">₱{Number(ride.fare).toFixed(2)}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RolesView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-for-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["admin-roles-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: selectedUser,
        role: selectedRole as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role added!" });
      queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] });
      setSelectedUser("");
      setSelectedRole("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role removed!" });
      queryClient.invalidateQueries({ queryKey: ["admin-roles-list"] });
    },
  });

  const getName = (userId: string) => profiles?.find((p) => p.user_id === userId)?.full_name || "Unknown";

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Role Management</h2>

      {/* Add role */}
      <Card className="mb-6 border-border bg-card p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Assign Role</p>
        <div className="flex gap-3">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="bg-secondary border-border flex-1">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              {profiles?.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>
                  {p.full_name || "Unnamed"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="bg-secondary border-border w-40">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              {["customer", "rider", "dispatcher", "operator", "admin"].map((r) => (
                <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => addRoleMutation.mutate()}
            disabled={!selectedUser || !selectedRole || addRoleMutation.isPending}
          >
            Add
          </Button>
        </div>
      </Card>

      {/* Existing roles */}
      <div className="space-y-3">
        {allRoles?.map((r) => (
          <Card key={r.id} className="border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-info" />
                <div>
                  <p className="text-sm font-medium text-foreground">{getName(r.user_id)}</p>
                  <Badge className="mt-1 border border-info/30 bg-info/10 text-info text-xs capitalize">{r.role as string}</Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeRoleMutation.mutate(r.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
