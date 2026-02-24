import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RideStatus = "requested" | "accepted" | "en_route" | "picked_up" | "completed" | "cancelled";

const statusConfig: Record<RideStatus, { label: string; color: string; icon: React.ElementType }> = {
  requested: { label: "Waiting for rider", color: "bg-warning/10 text-warning border-warning/30", icon: Clock },
  accepted: { label: "Rider accepted", color: "bg-info/10 text-info border-info/30", icon: CheckCircle },
  en_route: { label: "Rider en route", color: "bg-info/10 text-info border-info/30", icon: Navigation },
  picked_up: { label: "In transit", color: "bg-primary/10 text-primary border-primary/30", icon: Navigation },
  completed: { label: "Completed", color: "bg-primary/10 text-primary border-primary/30", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/30", icon: XCircle },
};

export default function CustomerDashboard() {
  return (
    <DashboardLayout>
      <BookRideSection />
    </DashboardLayout>
  );
}

export function CustomerRides() {
  return (
    <DashboardLayout>
      <RideHistory />
    </DashboardLayout>
  );
}

export function CustomerRatings() {
  return (
    <DashboardLayout>
      <div>
        <h2 className="mb-4 text-xl font-bold text-foreground">My Ratings</h2>
        <RatingsSection />
      </div>
    </DashboardLayout>
  );
}

function RatingsSection() {
  const { user } = useAuth();
  const { data: ratings, isLoading } = useQuery({
    queryKey: ["my-ratings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("rated_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;

  if (!ratings?.length) {
    return (
      <Card className="border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">No ratings yet. Complete some rides to receive ratings!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {ratings.map((r) => (
        <Card key={r.id} className="border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {"⭐".repeat(r.rating)}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString()}
            </span>
          </div>
          {r.comment && <p className="mt-2 text-sm text-foreground">{r.comment}</p>}
        </Card>
      ))}
    </div>
  );
}

function BookRideSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");

  const { data: activeRide, isLoading: loadingActive } = useQuery({
    queryKey: ["active-ride", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("customer_id", user!.id)
        .in("status", ["requested", "accepted", "en_route", "picked_up"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 3000,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rides").insert({
        customer_id: user!.id,
        pickup_address: pickup.trim(),
        dropoff_address: dropoff.trim(),
        status: "requested" as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ride requested!", description: "Looking for a rider..." });
      setPickup("");
      setDropoff("");
      queryClient.invalidateQueries({ queryKey: ["active-ride"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const { error } = await supabase
        .from("rides")
        .update({ status: "cancelled" as any, cancelled_at: new Date().toISOString(), cancel_reason: "Cancelled by customer" })
        .eq("id", rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ride cancelled" });
      queryClient.invalidateQueries({ queryKey: ["active-ride"] });
    },
  });

  if (loadingActive) return <p className="text-muted-foreground">Loading...</p>;

  // Show active ride tracker
  if (activeRide) {
    const config = statusConfig[activeRide.status as RideStatus];
    const StatusIcon = config.icon;
    return (
      <div>
        <h2 className="mb-4 text-xl font-bold text-foreground">Active Ride</h2>
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <Badge className={`${config.color} border`}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(activeRide.created_at).toLocaleTimeString()}
              </span>
            </div>

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
              <div className="mt-4 rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Estimated Fare</p>
                <p className="text-lg font-bold text-foreground">₱{Number(activeRide.fare).toFixed(2)}</p>
              </div>
            )}

            {activeRide.status === "requested" && (
              <Button
                variant="destructive"
                className="mt-4 w-full"
                onClick={() => cancelMutation.mutate(activeRide.id)}
                disabled={cancelMutation.isPending}
              >
                Cancel Ride
              </Button>
            )}

            {/* Progress steps */}
            <div className="mt-6 grid grid-cols-4 gap-1">
              {(["requested", "accepted", "en_route", "picked_up"] as RideStatus[]).map((s, i) => {
                const steps: RideStatus[] = ["requested", "accepted", "en_route", "picked_up"];
                const currentIdx = steps.indexOf(activeRide.status as RideStatus);
                const done = i <= currentIdx;
                return (
                  <div key={s} className={`h-1.5 rounded-full ${done ? "bg-primary" : "bg-secondary"}`} />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Booking form
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Book a Ride</h2>
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Pickup Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-primary" />
                <Input
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Where should we pick you up?"
                  className="bg-secondary border-border pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Dropoff Location</Label>
              <div className="relative">
                <Navigation className="absolute left-3 top-3 h-4 w-4 text-warning" />
                <Input
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="Where are you going?"
                  className="bg-secondary border-border pl-10"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => bookMutation.mutate()}
              disabled={!pickup.trim() || !dropoff.trim() || bookMutation.isPending}
            >
              {bookMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Requesting...</>
              ) : (
                "Request Ride"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RideHistory() {
  const { user } = useAuth();
  const { data: rides, isLoading } = useQuery({
    queryKey: ["ride-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-foreground">Ride History</h2>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !rides?.length ? (
        <Card className="border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No rides yet. Book your first ride!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rides.map((ride) => {
            const config = statusConfig[ride.status as RideStatus];
            return (
              <Card key={ride.id} className="border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{ride.pickup_address}</p>
                    <p className="text-xs text-muted-foreground">→ {ride.dropoff_address}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${config.color} border text-xs`}>{config.label}</Badge>
                    {ride.fare && (
                      <p className="mt-1 text-sm font-semibold text-foreground">₱{Number(ride.fare).toFixed(2)}</p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(ride.created_at).toLocaleString()}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
