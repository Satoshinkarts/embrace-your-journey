import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useZones, useOperatorZones, useZoneMutations } from "@/hooks/useZones";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MapPin, Plus, Trash2, Users, PenLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminZones() {
  return (
    <DashboardLayout>
      <ZonesView />
    </DashboardLayout>
  );
}

function ZonesView() {
  const { data: zones, isLoading } = useZones();
  const { data: operatorZones } = useOperatorZones();
  const { updateZone, deleteZone } = useZoneMutations();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Zone Management</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create Zone</DialogTitle>
            </DialogHeader>
            <CreateZoneForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-20 animate-pulse bg-secondary/50" />)}
        </div>
      ) : !zones?.length ? (
        <div className="glass-card p-8 text-center">
          <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No zones configured</p>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone, i) => {
            const assignedCount = operatorZones?.filter(oz => oz.zone_id === zone.id).length || 0;
            return (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-sm font-semibold text-foreground">{zone.name}</p>
                      {!zone.is_active && (
                        <Badge className="border border-muted-foreground/20 bg-muted text-muted-foreground text-[10px]">Inactive</Badge>
                      )}
                    </div>
                    {zone.description && (
                      <p className="text-xs text-muted-foreground mb-2">{zone.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {assignedCount} operator{assignedCount !== 1 ? "s" : ""}
                      </span>
                      {zone.premium_fee > 0 && (
                        <Badge className="border border-warning/20 bg-warning/10 text-warning text-[10px]">
                          +₱{Number(zone.premium_fee).toFixed(0)} premium
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={zone.is_active}
                      onCheckedChange={(checked) => updateZone.mutate({ id: zone.id, is_active: checked })}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive rounded-xl"
                      onClick={() => deleteZone.mutate(zone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Premium fee inline edit */}
                <PremiumFeeEditor zone={zone} />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Operator zone assignment section */}
      <OperatorZoneAssignment />
    </div>
  );
}

function PremiumFeeEditor({ zone }: { zone: any }) {
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState(String(zone.premium_fee || 0));
  const { updateZone } = useZoneMutations();

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <PenLine className="h-3 w-3" /> Edit premium fee
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-muted-foreground">₱</span>
      <Input
        type="number"
        value={fee}
        onChange={(e) => setFee(e.target.value)}
        className="h-8 w-24 rounded-lg bg-secondary border-border text-sm"
        min={0}
      />
      <Button
        size="sm"
        className="h-8 rounded-lg text-xs"
        onClick={() => {
          updateZone.mutate({ id: zone.id, premium_fee: parseFloat(fee) || 0 });
          setEditing(false);
        }}
      >
        Save
      </Button>
      <Button size="sm" variant="ghost" className="h-8 rounded-lg text-xs" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </div>
  );
}

function CreateZoneForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [premiumFee, setPremiumFee] = useState("0");
  const { createZone } = useZoneMutations();

  const handleSubmit = () => {
    if (!name.trim()) return;
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    createZone.mutate(
      { name: name.trim(), slug, description: description.trim() || undefined, premium_fee: parseFloat(premiumFee) || 0 },
      { onSuccess }
    );
  };

  return (
    <div className="space-y-3">
      <Input placeholder="Zone name (e.g., Jaro)" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl bg-secondary border-border" />
      <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl bg-secondary border-border" />
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Premium fee ₱</span>
        <Input type="number" value={premiumFee} onChange={(e) => setPremiumFee(e.target.value)} className="w-24 rounded-xl bg-secondary border-border" min={0} />
      </div>
      <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={!name.trim() || createZone.isPending}>
        Create Zone
      </Button>
    </div>
  );
}

function OperatorZoneAssignment() {
  const { data: zones } = useZones();
  const { data: operatorZones } = useOperatorZones();
  const { assignOperatorZone, removeOperatorZone } = useZoneMutations();
  const [selectedOperator, setSelectedOperator] = useState("");
  const [selectedZone, setSelectedZone] = useState("");

  const { data: operators } = useQuery({
    queryKey: ["admin-operators-for-zones"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "operator");
      if (error) throw error;
      const userIds = roles.map(r => r.user_id);
      if (!userIds.length) return [];
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("*").in("user_id", userIds);
      if (pErr) throw pErr;
      return profiles;
    },
  });

  const getOperatorName = (userId: string) => operators?.find(o => o.user_id === userId)?.full_name || "Unknown";
  const getZoneName = (zoneId: string) => zones?.find(z => z.id === zoneId)?.name || "Unknown";

  return (
    <div className="mt-8">
      <h3 className="mb-4 text-base font-bold text-foreground">Assign Operators to Zones</h3>

      <div className="glass-card p-4 mb-4">
        <div className="space-y-3">
          <Select value={selectedOperator} onValueChange={setSelectedOperator}>
            <SelectTrigger className="h-11 rounded-xl bg-secondary border-border">
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {operators?.map(o => (
                <SelectItem key={o.user_id} value={o.user_id}>{o.full_name || "Unnamed"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedZone} onValueChange={setSelectedZone}>
            <SelectTrigger className="h-11 rounded-xl bg-secondary border-border">
              <SelectValue placeholder="Select zone" />
            </SelectTrigger>
            <SelectContent>
              {zones?.filter(z => z.is_active).map(z => (
                <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full h-11 rounded-xl"
            onClick={() => assignOperatorZone.mutate({ operator_id: selectedOperator, zone_id: selectedZone })}
            disabled={!selectedOperator || !selectedZone || assignOperatorZone.isPending}
          >
            Assign Zone
          </Button>
        </div>
      </div>

      {/* Current assignments */}
      <div className="space-y-2.5">
        {operatorZones?.map((oz, i) => (
          <motion.div
            key={oz.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{getOperatorName(oz.operator_id)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="text-xs text-muted-foreground">{getZoneName(oz.zone_id)}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive rounded-xl"
                onClick={() => removeOperatorZone.mutate(oz.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
