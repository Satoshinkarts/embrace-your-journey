import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Zone {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  premium_fee: number;
  is_active: boolean;
  boundary: any;
  created_at: string;
  updated_at: string;
}

export interface OperatorZone {
  id: string;
  operator_id: string;
  zone_id: string;
  assigned_at: string;
}

export function useZones() {
  return useQuery({
    queryKey: ["zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zones")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Zone[];
    },
  });
}

export function useActiveZones() {
  return useQuery({
    queryKey: ["zones", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zones")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Zone[];
    },
  });
}

export function useOperatorZones() {
  return useQuery({
    queryKey: ["operator-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operator_zones")
        .select("*");
      if (error) throw error;
      return data as OperatorZone[];
    },
  });
}

export function useZoneMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createZone = useMutation({
    mutationFn: async (zone: { name: string; slug: string; description?: string; premium_fee?: number }) => {
      const { error } = await supabase.from("zones").insert(zone);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Zone created" });
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateZone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Zone> & { id: string }) => {
      const { error } = await supabase.from("zones").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Zone updated" });
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Zone deleted" });
      queryClient.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const assignOperatorZone = useMutation({
    mutationFn: async ({ operator_id, zone_id }: { operator_id: string; zone_id: string }) => {
      const { error } = await supabase.from("operator_zones").insert({ operator_id, zone_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Zone assigned" });
      queryClient.invalidateQueries({ queryKey: ["operator-zones"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const removeOperatorZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operator_zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Zone unassigned" });
      queryClient.invalidateQueries({ queryKey: ["operator-zones"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return { createZone, updateZone, deleteZone, assignOperatorZone, removeOperatorZone };
}
