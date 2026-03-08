import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, History, ChevronDown, ChevronUp } from "lucide-react";
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
    return <div className="h-40 animate-pulse rounded-2xl bg-secondary/50" />;
  }

  const balance = wallet?.balance ?? 0;

  return (
    <div className="space-y-3">
      {/* Teal gradient wallet card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, hsl(170 40% 65%), hsl(185 35% 55%))",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/80 font-bold">Wallet Balance</p>
        </div>
        <p className="text-3xl font-bold text-white">
          ₱ {Number(balance).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </p>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="mt-4 flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
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
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
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
                    className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between"
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
