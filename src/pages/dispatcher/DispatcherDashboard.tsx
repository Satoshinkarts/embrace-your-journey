import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, Users, CheckCircle, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RideStatus = "requested" | "accepted" | "en_route" | "picked_up" | "completed" | "cancelled";

export default function DispatcherDashboard() {
  return (
    <DashboardLayout>
      <AllRidesView />
    </DashboardLayout>
  );
}

export function DispatcherAssign() {
  return (
    <DashboardLayout>
      <AssignView />
    </DashboardLayout>
  );
}

export function DispatcherStats() {
  return (
    <DashboardLayout>
      <StatsView />
    </DashboardLayout>
  );
}

function AllRidesView() {
  const { data: rides, isLoading } = useQuery({
    queryKey: ["dispatcher-all-rides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">All Rides</h2>
        <Badge className="bg-secondary text-foreground border-border border">{rides?.length || 0} rides</Badge>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !rides?.length ? (
        <Card className="border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No rides in the system yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => (
            <Card key={ride.id} className="border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span className="text-foreground">{ride.pickup_address}</span>
                    <span className="text-muted-foreground">→</span>
                    <Navigation className="h-3 w-3 text-warning" />
                    <span className="text-foreground">{ride.dropoff_address}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(ride.created_at).toLocaleString()}
                    {ride.rider_id && " • Rider assigned"}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={`${statusColor[ride.status] || "bg-secondary text-foreground"} border text-xs capitalize`}>
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

function AssignView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unassignedRides } = useQuery({
    queryKey: ["unassigned-rides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("status", "requested" as any)
        .is("rider_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: riders } = useQuery({
    queryKey: ["available-riders"],
    queryFn: async () => {
      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider" as any);
      if (error) throw error;
      if (!roleData?.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", roleData.map((r) => r.user_id));
      return profiles || [];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ rideId, riderId }: { rideId: string; riderId: string }) => {
      const { error } = await supabase
        .from("rides")
        .update({
          rider_id: riderId,
          status: "accepted" as any,
          fare: parseFloat((Math.random() * 80 + 30).toFixed(2)),
        })
        .eq("id", rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rider assigned!" });
      queryClient.invalidateQueries({ queryKey: ["unassigned-rides"] });
    },
  });

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Assign Riders</h2>
      {!unassignedRides?.length ? (
        <Card className="border-border bg-card p-8 text-center">
          <CheckCircle className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="text-muted-foreground">All rides are assigned!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {unassignedRides.map((ride) => (
            <Card key={ride.id} className="border-border bg-card p-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-foreground">{ride.pickup_address} → {ride.dropoff_address}</p>
                <p className="text-xs text-muted-foreground">{new Date(ride.created_at).toLocaleString()}</p>
              </div>
              {riders && riders.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {riders.map((rider) => (
                    <Button
                      key={rider.user_id}
                      size="sm"
                      variant="outline"
                      onClick={() => assignMutation.mutate({ rideId: ride.id, riderId: rider.user_id })}
                      disabled={assignMutation.isPending}
                    >
                      <Users className="mr-1 h-3 w-3" />
                      {rider.full_name || "Rider"}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No riders available</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsView() {
  const { data: rides } = useQuery({
    queryKey: ["dispatcher-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rides").select("*");
      if (error) throw error;
      return data;
    },
  });

  const total = rides?.length || 0;
  const completed = rides?.filter((r) => r.status === "completed").length || 0;
  const active = rides?.filter((r) => ["requested", "accepted", "en_route", "picked_up"].includes(r.status)).length || 0;
  const cancelled = rides?.filter((r) => r.status === "cancelled").length || 0;
  const revenue = rides?.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.fare || 0), 0) || 0;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Statistics</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Rides</p>
          <p className="text-2xl font-bold text-foreground">{total}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-info">{active}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-primary">{completed}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="text-2xl font-bold text-foreground">₱{revenue.toFixed(2)}</p>
        </Card>
      </div>
    </div>
  );
}
