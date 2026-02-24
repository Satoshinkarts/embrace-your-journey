import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Users, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OperatorDashboard() {
  return (
    <DashboardLayout>
      <FleetView />
    </DashboardLayout>
  );
}

export function OperatorRiders() {
  return (
    <DashboardLayout>
      <RidersView />
    </DashboardLayout>
  );
}

export function OperatorReports() {
  return (
    <DashboardLayout>
      <ReportsView />
    </DashboardLayout>
  );
}

function FleetView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["fleet-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.from("vehicles").update({ is_verified: verified }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Vehicle updated!" });
      queryClient.invalidateQueries({ queryKey: ["fleet-vehicles"] });
    },
  });

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Fleet Management</h2>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !vehicles?.length ? (
        <Card className="border-border bg-card p-8 text-center">
          <Car className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No vehicles registered yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <Card key={v.id} className="border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {v.make} {v.model} — {v.plate_number}
                  </p>
                  <p className="text-xs text-muted-foreground">{v.color} {v.vehicle_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={v.is_verified ? "bg-primary/10 text-primary border-primary/30 border" : "bg-warning/10 text-warning border-warning/30 border"}>
                    {v.is_verified ? "Verified" : "Pending"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyMutation.mutate({ id: v.id, verified: !v.is_verified })}
                  >
                    {v.is_verified ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RidersView() {
  const { data: riderProfiles, isLoading } = useQuery({
    queryKey: ["operator-riders"],
    queryFn: async () => {
      const { data: roles, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider" as any);
      if (roleErr) throw roleErr;
      if (!roles?.length) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", roles.map((r) => r.user_id));
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Registered Riders</h2>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !riderProfiles?.length ? (
        <Card className="border-border bg-card p-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No riders registered yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {riderProfiles.map((r) => (
            <Card key={r.id} className="border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{r.phone || "No phone"}</p>
                </div>
                <p className="text-xs text-muted-foreground">Joined {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsView() {
  const { data: rides } = useQuery({
    queryKey: ["operator-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ["operator-vehicle-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vehicles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalRides = rides?.length || 0;
  const totalVehicles = vehicles?.length || 0;
  const verified = vehicles?.filter((v) => v.is_verified).length || 0;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Reports</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Rides</p>
          <p className="text-2xl font-bold text-foreground">{totalRides}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Vehicles</p>
          <p className="text-2xl font-bold text-foreground">{totalVehicles}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Verified Vehicles</p>
          <p className="text-2xl font-bold text-primary">{verified}</p>
        </Card>
      </div>
    </div>
  );
}
