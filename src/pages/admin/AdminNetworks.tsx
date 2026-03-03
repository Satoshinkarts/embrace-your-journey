import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { useNetworks, useNetworkMembers, useNetworkZones, useNetworkMutations, type Network } from "@/hooks/useNetworks";
import { useZones } from "@/hooks/useZones";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Network as NetworkIcon, CheckCircle, XCircle, Shield, Users, MapPin,
  Search, AlertTriangle, Ban, Loader2, Plus, Trash2,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: "bg-warning/10 text-warning border-warning/30" },
  approved: { label: "Verified", color: "bg-primary/10 text-primary border-primary/30" },
  suspended: { label: "Suspended", color: "bg-destructive/10 text-destructive border-destructive/30" },
  banned: { label: "Banned", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function AdminNetworks() {
  return <SidebarLayout><NetworksView /></SidebarLayout>;
}

function NetworksView() {
  const { data: networks, isLoading } = useNetworks();
  const { approveNetwork, suspendNetwork } = useNetworkMutations();
  const [selected, setSelected] = useState<Network | null>(null);
  const [search, setSearch] = useState("");

  const filtered = networks?.filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const pending = filtered.filter(n => n.status === "pending");
  const approved = filtered.filter(n => n.status === "approved");
  const others = filtered.filter(n => !["pending", "approved"].includes(n.status));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Partner Networks</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage licensed operator networks</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search networks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 rounded-xl bg-secondary border-border"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-warning mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Pending Approval ({pending.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pending.map((network) => (
                  <NetworkCard
                    key={network.id}
                    network={network}
                    onSelect={() => setSelected(network)}
                    onApprove={() => approveNetwork.mutate(network.id)}
                    onSuspend={() => suspendNetwork.mutate(network.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Approved */}
          {approved.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Verified Networks ({approved.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {approved.map((network) => (
                  <NetworkCard
                    key={network.id}
                    network={network}
                    onSelect={() => setSelected(network)}
                    onSuspend={() => suspendNetwork.mutate(network.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Others */}
          {others.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                Suspended / Banned ({others.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((network) => (
                  <NetworkCard
                    key={network.id}
                    network={network}
                    onSelect={() => setSelected(network)}
                    onApprove={() => approveNetwork.mutate(network.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <NetworkIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No networks found</p>
            </div>
          )}
        </div>
      )}

      <NetworkDetailSheet network={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NetworkCard({ network, onSelect, onApprove, onSuspend }: {
  network: Network;
  onSelect: () => void;
  onApprove?: () => void;
  onSuspend?: () => void;
}) {
  const config = statusConfig[network.status];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <NetworkIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{network.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {network.max_seats} seats · ₱{Number(network.subscription_fee).toLocaleString()}/mo
            </p>
          </div>
        </div>
        <Badge className={`${config.color} border text-[10px]`}>{config.label}</Badge>
      </div>

      {network.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{network.description}</p>
      )}

      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {onApprove && network.status !== "approved" && (
          <Button size="sm" className="rounded-lg text-xs gap-1 flex-1" onClick={onApprove}>
            <CheckCircle className="h-3 w-3" /> Approve
          </Button>
        )}
        {onSuspend && network.status === "approved" && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs gap-1 flex-1 border-destructive/30 text-destructive" onClick={onSuspend}>
            <Ban className="h-3 w-3" /> Suspend
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function NetworkDetailSheet({ network, open, onClose }: { network: Network | null; open: boolean; onClose: () => void }) {
  const { data: members } = useNetworkMembers(network?.id);
  const { data: networkZones } = useNetworkZones(network?.id);
  const { data: zones } = useZones();
  const { assignNetworkZone, removeNetworkZone } = useNetworkMutations();
  const [selectedZone, setSelectedZone] = useState("");

  const { data: memberProfiles } = useQuery({
    queryKey: ["network-member-profiles", network?.id],
    queryFn: async () => {
      if (!members?.length) return [];
      const userIds = members.map(m => m.user_id);
      const { data, error } = await supabase.from("profiles").select("*").in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: !!members?.length,
  });

  const getProfile = (userId: string) => memberProfiles?.find(p => p.user_id === userId);
  const getZoneName = (zoneId: string) => zones?.find(z => z.id === zoneId)?.name || zoneId;
  const assignedZoneIds = networkZones?.map(nz => nz.zone_id) || [];
  const availableZones = zones?.filter(z => z.is_active && !assignedZoneIds.includes(z.id)) || [];

  if (!network) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <NetworkIcon className="h-5 w-5 text-primary" />
            {network.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Info */}
          <div className="glass-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge className={`${statusConfig[network.status].color} border text-[10px]`}>
                {statusConfig[network.status].label}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Max Seats</span>
              <span className="text-foreground font-medium">{network.max_seats}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subscription</span>
              <span className="text-foreground font-medium">₱{Number(network.subscription_fee).toLocaleString()}/mo</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="text-foreground">{new Date(network.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Zones */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Assigned Zones
            </h3>
            <div className="space-y-2 mb-3">
              {networkZones?.map(nz => (
                <div key={nz.id} className="flex items-center justify-between glass-card px-3 py-2">
                  <span className="text-sm text-foreground">{getZoneName(nz.zone_id)}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeNetworkZone.mutate(nz.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {!networkZones?.length && <p className="text-xs text-muted-foreground">No zones assigned</p>}
            </div>
            {availableZones.length > 0 && (
              <div className="flex gap-2">
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger className="h-9 rounded-lg bg-secondary border-border text-xs flex-1">
                    <SelectValue placeholder="Add zone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableZones.map(z => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="rounded-lg"
                  disabled={!selectedZone}
                  onClick={() => {
                    assignNetworkZone.mutate({ network_id: network.id, zone_id: selectedZone });
                    setSelectedZone("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Members ({members?.length || 0}/{network.max_seats})
            </h3>
            <div className="space-y-2">
              {members?.map(m => {
                const profile = getProfile(m.user_id);
                return (
                  <div key={m.id} className="flex items-center justify-between glass-card px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                        {(profile?.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{profile?.full_name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{m.role} · {m.status}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] border ${m.status === "approved" ? "bg-primary/10 text-primary border-primary/30" : m.status === "suspended" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/10 text-warning border-warning/30"}`}>
                      {m.status}
                    </Badge>
                  </div>
                );
              })}
              {!members?.length && <p className="text-xs text-muted-foreground">No members yet</p>}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
