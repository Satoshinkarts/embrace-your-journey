import { useBookingEvents, type BookingEvent } from "@/hooks/useNetworks";
import { motion } from "framer-motion";
import { Clock, MapPin, CheckCircle, XCircle, Navigation, User, Star, Zap } from "lucide-react";

const eventIcons: Record<string, React.ElementType> = {
  ride_requested: MapPin,
  ride_accepted: CheckCircle,
  ride_en_route: Navigation,
  ride_picked_up: User,
  ride_completed: Star,
  ride_cancelled: XCircle,
  ride_assigned: Zap,
  status_change: Clock,
};

const eventColors: Record<string, string> = {
  ride_requested: "text-warning",
  ride_accepted: "text-info",
  ride_en_route: "text-info",
  ride_picked_up: "text-primary",
  ride_completed: "text-primary",
  ride_cancelled: "text-destructive",
  ride_assigned: "text-accent",
  status_change: "text-muted-foreground",
};

export default function BookingTimeline({ rideId }: { rideId: string | null }) {
  const { data: events, isLoading } = useBookingEvents(rideId);

  if (!rideId) return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-secondary/50 animate-pulse" />
            <div className="flex-1 h-12 rounded-lg bg-secondary/50 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!events?.length) {
    return (
      <div className="text-center py-12">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No audit events recorded yet</p>
        <p className="text-[10px] text-muted-foreground mt-1">Events will appear as the booking progresses</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

      <div className="space-y-4">
        {events.map((event, i) => {
          const Icon = eventIcons[event.event_type] || Clock;
          const color = eventColors[event.event_type] || "text-muted-foreground";

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative flex gap-3 pl-1"
            >
              <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card border border-border ${color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 glass-card p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground capitalize">
                    {event.event_type.replace(/_/g, " ")}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(event.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  by {event.actor_role} · {new Date(event.created_at).toLocaleDateString()}
                </p>
                {event.metadata && (
                  <div className="mt-1.5 text-[10px] text-muted-foreground/80 bg-secondary/50 rounded px-2 py-1">
                    {typeof event.metadata === "object"
                      ? Object.entries(event.metadata as Record<string, any>).map(([k, v]) => (
                          <span key={k} className="mr-3">{k}: {String(v)}</span>
                        ))
                      : String(event.metadata)}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
