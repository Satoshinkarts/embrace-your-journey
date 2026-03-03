import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Network {
  id: string;
  name: string;
  owner_id: string;
  status: "pending" | "approved" | "suspended" | "banned";
  description: string | null;
  license_doc_url: string | null;
  logo_url: string | null;
  verified_at: string | null;
  max_seats: number;
  subscription_fee: number;
  created_at: string;
  updated_at: string;
}

export interface NetworkMember {
  id: string;
  network_id: string;
  user_id: string;
  role: "rider" | "dispatcher";
  status: "pending" | "approved" | "suspended";
  joined_at: string;
  approved_at: string | null;
  suspended_at: string | null;
}

export interface NetworkZone {
  id: string;
  network_id: string;
  zone_id: string;
  assigned_at: string;
}

export interface Strike {
  id: string;
  network_id: string | null;
  user_id: string | null;
  issued_by: string;
  reason: string;
  severity: "warning" | "suspension" | "ban";
  created_at: string;
}

export interface BookingEvent {
  id: string;
  ride_id: string;
  event_type: string;
  actor_id: string;
  actor_role: string;
  metadata: any;
  created_at: string;
}

// ─── Networks ────────────────────────────────────────

export function useNetworks() {
  return useQuery({
    queryKey: ["networks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("networks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Network[];
    },
  });
}

export function useNetwork(id: string | null) {
  return useQuery({
    queryKey: ["network", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("networks")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Network;
    },
    enabled: !!id,
  });
}

export function useMyNetwork() {
  return useQuery({
    queryKey: ["my-network"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("networks")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Network | null;
    },
  });
}

// ─── Network Members ────────────────────────────────

export function useNetworkMembers(networkId: string | null | undefined) {
  return useQuery({
    queryKey: ["network-members", networkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("network_members")
        .select("*")
        .eq("network_id", networkId!)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data as NetworkMember[];
    },
    enabled: !!networkId,
  });
}

// ─── Network Zones ────────────────────────────────

export function useNetworkZones(networkId?: string | null) {
  return useQuery({
    queryKey: ["network-zones", networkId],
    queryFn: async () => {
      let query = supabase.from("network_zones").select("*");
      if (networkId) query = query.eq("network_id", networkId);
      const { data, error } = await query;
      if (error) throw error;
      return data as NetworkZone[];
    },
  });
}

// ─── Strikes ────────────────────────────────────────

export function useStrikes(networkId?: string | null) {
  return useQuery({
    queryKey: ["strikes", networkId],
    queryFn: async () => {
      let query = supabase.from("strikes").select("*").order("created_at", { ascending: false });
      if (networkId) query = query.eq("network_id", networkId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Strike[];
    },
  });
}

// ─── Booking Events ─────────────────────────────────

export function useBookingEvents(rideId: string | null) {
  return useQuery({
    queryKey: ["booking-events", rideId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_events")
        .select("*")
        .eq("ride_id", rideId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as BookingEvent[];
    },
    enabled: !!rideId,
  });
}

// ─── Mutations ──────────────────────────────────────

export function useNetworkMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createNetwork = useMutation({
    mutationFn: async (network: { name: string; description?: string; owner_id: string }) => {
      const { error } = await supabase.from("networks").insert(network);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Network application submitted" });
      queryClient.invalidateQueries({ queryKey: ["networks"] });
      queryClient.invalidateQueries({ queryKey: ["my-network"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateNetwork = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Network> & { id: string }) => {
      const { error } = await supabase.from("networks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Network updated" });
      queryClient.invalidateQueries({ queryKey: ["networks"] });
      queryClient.invalidateQueries({ queryKey: ["my-network"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const approveNetwork = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("networks").update({
        status: "approved",
        verified_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Network approved!" });
      queryClient.invalidateQueries({ queryKey: ["networks"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const suspendNetwork = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("networks").update({ status: "suspended" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Network suspended" });
      queryClient.invalidateQueries({ queryKey: ["networks"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addMember = useMutation({
    mutationFn: async (member: { network_id: string; user_id: string; role: "rider" | "dispatcher" }) => {
      const { error } = await supabase.from("network_members").insert(member);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member added" });
      queryClient.invalidateQueries({ queryKey: ["network-members"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NetworkMember> & { id: string }) => {
      const { error } = await supabase.from("network_members").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Member updated" });
      queryClient.invalidateQueries({ queryKey: ["network-members"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const assignNetworkZone = useMutation({
    mutationFn: async ({ network_id, zone_id }: { network_id: string; zone_id: string }) => {
      const { error } = await supabase.from("network_zones").insert({ network_id, zone_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Zone assigned to network" });
      queryClient.invalidateQueries({ queryKey: ["network-zones"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeNetworkZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("network_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Zone removed from network" });
      queryClient.invalidateQueries({ queryKey: ["network-zones"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const issueStrike = useMutation({
    mutationFn: async (strike: { network_id?: string; user_id?: string; issued_by: string; reason: string; severity: "warning" | "suspension" | "ban" }) => {
      const { error } = await supabase.from("strikes").insert(strike);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Strike issued" });
      queryClient.invalidateQueries({ queryKey: ["strikes"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addBookingEvent = useMutation({
    mutationFn: async (event: { ride_id: string; event_type: string; actor_id: string; actor_role: string; metadata?: any }) => {
      const { error } = await supabase.from("booking_events").insert(event);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-events"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return {
    createNetwork, updateNetwork, approveNetwork, suspendNetwork,
    addMember, updateMember,
    assignNetworkZone, removeNetworkZone,
    issueStrike, addBookingEvent,
  };
}
