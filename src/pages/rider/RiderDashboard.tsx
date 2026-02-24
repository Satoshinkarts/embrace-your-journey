import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, CheckCircle, Clock, DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RideStatus = "requested" | "accepted" | "en_route" | "picked_up" | "completed" | "cancelled";

const statusFlow: { from: RideStatus; to: RideStatus; label: string; icon: React.ElementType }[] = [
  { from: "accepted", to: "en_route", label: "Start En Route", icon: Navigation },
  { from: "en_route", to: "picked_up", label: "Picked Up Passenger", icon: CheckCircle },
  { from: "picked_up", to: "completed", label: "Complete Ride", icon: CheckCircle },
];

export default function RiderDashboard() {
  return (
    <DashboardLayout>
      <ActiveRideOrAvailable />
    </DashboardLayout>
  );
}

export function RiderTrips() {
  return (
    <DashboardLayout>
      <TripHistory />
    </DashboardLayout>
  );
}

export function RiderEarnings() {
  return (
    <DashboardLayout>
      <EarningsView />
    </DashboardLayout>
  );
}

function ActiveRideOrAvailable() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for active ride first
  const { data: activeRide, isLoading: loadingActive } = useQuery({
    queryKey: ["rider-active-ride", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("rider_id", user!.id)
        .in("status", ["accepted", "en_route", "picked_up"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 3000,
  });

  // Available rides
  const { data: availableRides, isLoading: loadingAvailable } = useQuery({
    queryKey: ["available-rides"],
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
    enabled: !!user && !activeRide,
    refetchInterval: 5000,
  });

  const acceptMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const { error } = await supabase
        .from("rides")
        .update({
          rider_id: user!.id,
          status: "accepted" as any,
          fare: parseFloat((Math.random() * 80 + 30).toFixed(2)),
        })
        .eq("id", rideId)
        .eq("status", "requested" as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ride accepted!" });
      queryClient.invalidateQueries({ queryKey: ["rider-active-ride"] });
      queryClient.invalidateQueries({ queryKey: ["available-rides"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const advanceMutation = useMutation({
    mutationFn: async ({ rideId, newStatus }: { rideId: string; newStatus: RideStatus }) => {
      const updates: Record<string, any> = { status: newStatus as any };
      if (newStatus === "en_route") updates.started_at = new Date().toISOString();
      if (newStatus === "completed") updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from("rides").update(updates).eq("id", rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ride updated!" });
      queryClient.invalidateQueries({ queryKey: ["rider-active-ride"] });
    },
  });

  if (loadingActive || loadingAvailable) return <p className="text-muted-foreground">Loading...</p>;

  // Active ride view
  if (activeRide) {
    const nextStep = statusFlow.find((s) => s.from === activeRide.status);
    return (
      <div>
        <h2 className="mb-4 text-xl font-bold text-foreground">Active Trip</h2>
        <Card className="border-border bg-card">
          <CardContent className="p-6 space-y-4">
            <Badge className="bg-info/10 text-info border border-info/30 capitalize">
              {(activeRide.status as string).replace("_", " ")}
            </Badge>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Pickup</p>
                  <p className="text-sm font-medium text-foreground">{activeRide.pickup_address}</p>
                </div>
              </div>
              <div className="ml-1.5 h-6 border-l border-dashed border-border" />
              <div className="flex items-start gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-warning" />
                <div>
                  <p className="text-xs text-muted-foreground">Dropoff</p>
                  <p className="text-sm font-medium text-foreground">{activeRide.dropoff_address}</p>
                </div>
              </div>
            </div>

            {activeRide.fare && (
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Fare</p>
                <p className="text-lg font-bold text-foreground">₱{Number(activeRide.fare).toFixed(2)}</p>
              </div>
            )}

            {nextStep && (
              <Button
                className="w-full"
                onClick={() => advanceMutation.mutate({ rideId: activeRide.id, newStatus: nextStep.to })}
                disabled={advanceMutation.isPending}
              >
                {advanceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <nextStep.icon className="mr-2 h-4 w-4" />}
                {nextStep.label}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Available rides
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Available Rides</h2>
      {!availableRides?.length ? (
        <Card className="border-border bg-card p-8 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No rides available right now. Check back soon!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {availableRides.map((ride) => (
            <Card key={ride.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">{ride.pickup_address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-warning" />
                      <p className="text-sm text-muted-foreground">{ride.dropoff_address}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ride.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => acceptMutation.mutate(ride.id)}
                    disabled={acceptMutation.isPending}
                    size="sm"
                  >
                    Accept
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TripHistory() {
  const { user } = useAuth();
  const { data: trips, isLoading } = useQuery({
    queryKey: ["rider-trips", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("rider_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Trip History</h2>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !trips?.length ? (
        <Card className="border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No trips yet. Accept rides to start earning!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Card key={trip.id} className="border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{trip.pickup_address}</p>
                  <p className="text-xs text-muted-foreground">→ {trip.dropoff_address}</p>
                </div>
                <div className="text-right">
                  <Badge className="capitalize border bg-secondary text-foreground border-border text-xs">
                    {(trip.status as string).replace("_", " ")}
                  </Badge>
                  {trip.fare && <p className="mt-1 text-sm font-semibold text-primary">₱{Number(trip.fare).toFixed(2)}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function EarningsView() {
  const { user } = useAuth();
  const { data: completedTrips } = useQuery({
    queryKey: ["rider-earnings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("rider_id", user!.id)
        .eq("status", "completed" as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalEarnings = completedTrips?.reduce((sum, t) => sum + Number(t.fare || 0), 0) || 0;
  const todayEarnings = completedTrips
    ?.filter((t) => new Date(t.completed_at!).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + Number(t.fare || 0), 0) || 0;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Earnings</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-2xl font-bold text-primary">₱{todayEarnings.toFixed(2)}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Earnings</p>
          <p className="text-2xl font-bold text-foreground">₱{totalEarnings.toFixed(2)}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Completed Trips</p>
          <p className="text-2xl font-bold text-foreground">{completedTrips?.length || 0}</p>
        </Card>
      </div>

      {completedTrips && completedTrips.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Recent Completed</h3>
          {completedTrips.slice(0, 10).map((t) => (
            <Card key={t.id} className="border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">{t.pickup_address} → {t.dropoff_address}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.completed_at!).toLocaleString()}</p>
                </div>
                <p className="font-semibold text-primary">₱{Number(t.fare).toFixed(2)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
