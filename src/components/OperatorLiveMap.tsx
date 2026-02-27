import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MapboxMap from "@/components/MapboxMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin, Send, X, Loader2, Navigation, Radio, Users, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  useAllRiderLocations,
  useRiderProfiles,
  useCreateDirective,
  type RiderLocation,
} from "@/hooks/useRiderTracking";
import { useToast } from "@/hooks/use-toast";

export default function OperatorLiveMap() {
  const { data: locations } = useAllRiderLocations();
  const { data: profiles } = useRiderProfiles();
  const [selectedRider, setSelectedRider] = useState<RiderLocation | null>(null);
  const [showDispatch, setShowDispatch] = useState(false);
  const [riderListExpanded, setRiderListExpanded] = useState(true);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.user_id, p.full_name || "Unnamed"])
  );

  const onlineRiders = locations?.filter((l) => l.is_online) || [];
  const offlineRiders = locations?.filter((l) => !l.is_online) || [];

  // Map markers for all rider locations
  const markers = (locations || []).map((loc) => ({
    id: loc.rider_id,
    lng: loc.lng,
    lat: loc.lat,
    color: loc.is_online ? "#22c55e" : "#6b7280",
    label: `${profileMap.get(loc.rider_id) || "Rider"} ${loc.is_online ? "(Online)" : "(Offline)"}`,
  }));

  return (
    <div className="relative flex h-[calc(100dvh-56px)] flex-col">
      <MapboxMap className="absolute inset-0" markers={markers} />

      {/* Header overlay */}
      <div className="absolute top-3 left-4 right-4 z-20">
        <div className="glass-card flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="text-xs font-medium text-foreground">Live Rider Tracking</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 border text-[10px]">
              {onlineRiders.length} online
            </Badge>
            <Badge className="bg-secondary text-muted-foreground border-border border text-[10px]">
              {offlineRiders.length} offline
            </Badge>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="relative z-20 mt-auto">
        <div className="map-gradient-bottom pt-8 pb-20">
          <div className="mx-4 space-y-2">
            {/* Toggle rider list */}
            <button
              onClick={() => setRiderListExpanded(!riderListExpanded)}
              className="flex w-full items-center justify-between glass-card px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">
                  Riders ({locations?.length || 0})
                </span>
              </div>
              {riderListExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {riderListExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {!locations?.length ? (
                      <div className="glass-card p-4 text-center">
                        <p className="text-xs text-muted-foreground">No rider location data yet</p>
                      </div>
                    ) : (
                      locations.map((loc, i) => {
                        const name = profileMap.get(loc.rider_id) || "Rider";
                        const isOnline = loc.is_online;
                        const lastSeen = new Date(loc.last_seen_at);
                        const isSelected = selectedRider?.rider_id === loc.rider_id;

                        return (
                          <motion.div
                            key={loc.rider_id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={`glass-card p-3 cursor-pointer transition-colors ${isSelected ? "ring-1 ring-primary" : ""}`}
                            onClick={() => {
                              setSelectedRider(isSelected ? null : loc);
                              setShowDispatch(false);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                                    {name[0].toUpperCase()}
                                  </div>
                                  <div
                                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                                      isOnline ? "bg-primary" : "bg-muted-foreground"
                                    }`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">{name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {isOnline ? "Online" : `Last seen ${lastSeen.toLocaleTimeString()}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isOnline && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 rounded-lg text-[10px]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedRider(loc);
                                      setShowDispatch(true);
                                    }}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    Dispatch
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Dispatch modal */}
      <AnimatePresence>
        {showDispatch && selectedRider && (
          <DispatchModal
            riderName={profileMap.get(selectedRider.rider_id) || "Rider"}
            riderId={selectedRider.rider_id}
            onClose={() => setShowDispatch(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DispatchModal({
  riderName,
  riderId,
  onClose,
}: {
  riderName: string;
  riderId: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const createDirective = useCreateDirective();
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");

  const handleSend = async () => {
    if (!address.trim()) return;
    try {
      await createDirective.mutateAsync({
        riderId,
        destinationAddress: address.trim(),
        instructions: instructions.trim() || undefined,
      });
      toast({ title: "Directive sent!", description: `${riderName} will be notified.` });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-md glass-card p-5 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-foreground">Dispatch Rider</p>
            <p className="text-xs text-muted-foreground">Send {riderName} to a location</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
              Destination Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter destination address..."
                className="pl-9 rounded-xl bg-secondary border-border"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5 block">
              Instructions (optional)
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any special instructions..."
              rows={2}
              className="rounded-xl bg-secondary border-border resize-none"
            />
          </div>

          <Button
            onClick={handleSend}
            disabled={!address.trim() || createDirective.isPending}
            className="w-full h-11 rounded-xl font-semibold"
          >
            {createDirective.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="mr-2 h-4 w-4" />
            )}
            Send Directive
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
