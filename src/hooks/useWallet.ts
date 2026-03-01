import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  type: string;
  category: string;
  description: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
}

export function useWallet() {
  const { user } = useAuth();

  return useQuery<Wallet | null>({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Wallet | null;
    },
    enabled: !!user,
  });
}

export function useWalletTransactions(userId?: string) {
  const { user } = useAuth();
  const targetId = userId || user?.id;

  return useQuery<WalletTransaction[]>({
    queryKey: ["wallet-transactions", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions" as any)
        .select("*")
        .eq("user_id", targetId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as WalletTransaction[]) || [];
    },
    enabled: !!targetId,
  });
}

export function useAdminWalletAdjust() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      targetUserId: string;
      amount: number;
      type: "credit" | "debit";
      category: string;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc("admin_wallet_adjust" as any, {
        _target_user_id: params.targetUserId,
        _amount: params.amount,
        _type: params.type,
        _category: params.category,
        _description: params.description || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", vars.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["admin-wallets"] });
    },
  });
}

/** For admin: fetch all wallets with profile info */
export function useAllWallets() {
  return useQuery<(Wallet & { full_name: string | null })[]>({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data: wallets, error } = await supabase
        .from("wallets" as any)
        .select("*")
        .order("balance", { ascending: false });
      if (error) throw error;
      if (!wallets?.length) return [];

      const userIds = (wallets as any[]).map((w: any) => w.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      return (wallets as any[]).map((w: any) => ({
        ...w,
        full_name: nameMap.get(w.user_id) || null,
      }));
    },
  });
}
