import { useState } from "react";
import { motion } from "framer-motion";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, ArrowUpRight, ArrowDownRight, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAllWallets, useAdminWalletAdjust, useWalletTransactions } from "@/hooks/useWallet";

export default function AdminWallets() {
  return (
    <SidebarLayout>
      <WalletsView />
    </SidebarLayout>
  );
}

function WalletsView() {
  const { toast } = useToast();
  const { data: wallets, isLoading } = useAllWallets();
  const adjustMutation = useAdminWalletAdjust();
  const [adjustDialog, setAdjustDialog] = useState<{ userId: string; name: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [category, setCategory] = useState("general");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [txUser, setTxUser] = useState<string | null>(null);

  const filtered = wallets?.filter(w => {
    if (!searchQuery) return true;
    return (w.full_name || "").toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const handleAdjust = async () => {
    if (!adjustDialog || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    try {
      await adjustMutation.mutateAsync({
        targetUserId: adjustDialog.userId,
        amount: Number(amount),
        type,
        category,
        description: description || undefined,
      });
      toast({ title: `${type === "credit" ? "Credited" : "Debited"} ₱${Number(amount).toFixed(2)}` });
      setAdjustDialog(null);
      setAmount("");
      setDescription("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-foreground">Wallet Management</h2>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-secondary border-border"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-16 animate-pulse bg-secondary/50" />)}
        </div>
      ) : !filtered.length ? (
        <div className="glass-card p-8 text-center">
          <Wallet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No wallets found</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {(w.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{w.full_name || "Unnamed"}</p>
                    <p className="text-lg font-bold text-foreground">₱{Number(w.balance).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => { setAdjustDialog({ userId: w.user_id, name: w.full_name || "User" }); setType("credit"); }}
                  >
                    <ArrowUpRight className="h-3 w-3" /> Credit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => { setAdjustDialog({ userId: w.user_id, name: w.full_name || "User" }); setType("debit"); }}
                  >
                    <ArrowDownRight className="h-3 w-3" /> Debit
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setTxUser(txUser === w.user_id ? null : w.user_id)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {txUser === w.user_id ? "Hide" : "View"} transactions
              </button>
              {txUser === w.user_id && <TransactionList userId={w.user_id} />}
            </motion.div>
          ))}
        </div>
      )}

      {/* Adjust Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={(o) => !o && setAdjustDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{type === "credit" ? "Credit" : "Debit"} — {adjustDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Amount (₱)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="top_up">Top Up</SelectItem>
                  <SelectItem value="penalty">Penalty</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description (optional)</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Reason..." className="rounded-xl" />
            </div>
            <Button className="w-full rounded-xl" onClick={handleAdjust} disabled={adjustMutation.isPending}>
              {adjustMutation.isPending ? "Processing..." : `${type === "credit" ? "Credit" : "Debit"} ₱${amount || "0"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionList({ userId }: { userId: string }) {
  const { data: transactions, isLoading } = useWalletTransactions(userId);

  if (isLoading) return <div className="mt-2 h-8 animate-pulse bg-secondary/50 rounded" />;
  if (!transactions?.length) return <p className="mt-2 text-[10px] text-muted-foreground">No transactions</p>;

  return (
    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
      {transactions.slice(0, 10).map(tx => (
        <div key={tx.id} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-foreground truncate">{tx.description || tx.category}</p>
            <p className="text-[9px] text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
          </div>
          <span className={`text-xs font-bold ${tx.type === "credit" ? "text-primary" : "text-destructive"}`}>
            {tx.type === "credit" ? "+" : "-"}₱{Number(tx.amount).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
