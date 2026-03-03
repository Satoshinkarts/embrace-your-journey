import { useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useStrikes, useNetworks, useNetworkMutations } from "@/hooks/useNetworks";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Shield, Loader2 } from "lucide-react";

const severityConfig: Record<string, { label: string; color: string }> = {
  warning: { label: "Warning", color: "bg-warning/10 text-warning border-warning/30" },
  suspension: { label: "Suspension", color: "bg-accent/10 text-accent border-accent/30" },
  ban: { label: "Ban", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function AdminStrikes() {
  return <SidebarLayout><StrikesView /></SidebarLayout>;
}

function StrikesView() {
  const { data: strikes, isLoading } = useStrikes();
  const { data: networks } = useNetworks();
  const [createOpen, setCreateOpen] = useState(false);

  const getNetworkName = (id: string | null) => {
    if (!id) return "Platform-wide";
    return networks?.find(n => n.id === id)?.name || "Unknown";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-warning" /> Strike System
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Warning → Suspension → Ban escalation</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-1.5">
              <Plus className="h-4 w-4" /> Issue Strike
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Issue Strike</DialogTitle>
            </DialogHeader>
            <IssueStrikeForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !strikes?.length ? (
        <div className="text-center py-20">
          <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No strikes issued yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {strikes.map((strike, i) => {
            const config = severityConfig[strike.severity];
            return (
              <motion.div
                key={strike.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${config.color} border text-[10px]`}>{config.label}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(strike.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{strike.reason}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Network: {getNetworkName(strike.network_id)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IssueStrikeForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { data: networks } = useNetworks();
  const { issueStrike } = useNetworkMutations();
  const [networkId, setNetworkId] = useState("");
  const [severity, setSeverity] = useState<"warning" | "suspension" | "ban">("warning");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim() || !user) return;
    issueStrike.mutate(
      {
        network_id: networkId || undefined,
        issued_by: user.id,
        reason: reason.trim(),
        severity,
      },
      { onSuccess }
    );
  };

  return (
    <div className="space-y-4">
      <Select value={networkId} onValueChange={setNetworkId}>
        <SelectTrigger className="rounded-xl bg-secondary border-border">
          <SelectValue placeholder="Select network (optional)" />
        </SelectTrigger>
        <SelectContent>
          {networks?.filter(n => n.status === "approved").map(n => (
            <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
        <SelectTrigger className="rounded-xl bg-secondary border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="warning">⚠️ Warning</SelectItem>
          <SelectItem value="suspension">🟠 Suspension</SelectItem>
          <SelectItem value="ban">🔴 Ban</SelectItem>
        </SelectContent>
      </Select>
      <Textarea
        placeholder="Reason for strike..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="rounded-xl bg-secondary border-border min-h-[80px]"
      />
      <Button
        className="w-full rounded-xl"
        onClick={handleSubmit}
        disabled={!reason.trim() || issueStrike.isPending}
      >
        {issueStrike.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Issue Strike
      </Button>
    </div>
  );
}
