import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, History, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWallet, useWalletTransactions } from "@/hooks/useWallet";

const categoryIcons: Record<string, { icon: typeof ArrowUpRight; color: string }> = {
  ride_earning: { icon: ArrowUpRight, color: "text-primary" },
  top_up: { icon: ArrowUpRight, color: "text-info" },
  penalty: { icon: ArrowDownRight, color: "text-destructive" },
  withdrawal: { icon: ArrowDownRight, color: "text-warning" },
  general: { icon: CreditCard, color: "text-muted-foreground" },
};

export default function WalletCard() {
  const { data: wallet, isLoading } = useWallet();
  const { data: transactions } = useWalletTransactions();
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) {
    return <div className="glass-card h-24 animate-pulse bg-secondary/50" />;
  }

  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-2.5">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Wallet Balance</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">
          ₱{Number(balance).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </p>

        {/* Toggle history */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-3 w-3" />
          Transaction History
          {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </motion.div>

      {/* Transaction History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            {!transactions?.length ? (
              <div className="glass-card p-4 text-center">
                <p className="text-xs text-muted-foreground">No transactions yet</p>
              </div>
            ) : (
              transactions.slice(0, 20).map((tx, i) => {
                const cat = categoryIcons[tx.category] || categoryIcons.general;
                const Icon = cat.icon;
                const isCredit = tx.type === "credit";

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Icon className={`h-4 w-4 shrink-0 ${cat.color}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {tx.description || tx.category.replace("_", " ")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${isCredit ? "text-primary" : "text-destructive"}`}>
                      {isCredit ? "+" : "-"}₱{Number(tx.amount).toFixed(2)}
                    </span>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
