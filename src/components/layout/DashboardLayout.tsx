import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Bike, LogOut, Home, MapPin, Clock, DollarSign, Users, Navigation, Settings, Shield, BarChart3, Car, UserCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { label: string; icon: React.ElementType; path: string };

const roleNavItems: Record<string, NavItem[]> = {
  customer: [
    { label: "Book Ride", icon: MapPin, path: "/dashboard" },
    { label: "My Rides", icon: Clock, path: "/dashboard/rides" },
    { label: "Ratings", icon: Star, path: "/dashboard/ratings" },
  ],
  rider: [
    { label: "Available Rides", icon: MapPin, path: "/dashboard" },
    { label: "My Trips", icon: Clock, path: "/dashboard/trips" },
    { label: "Earnings", icon: DollarSign, path: "/dashboard/earnings" },
  ],
  dispatcher: [
    { label: "All Rides", icon: Navigation, path: "/dashboard" },
    { label: "Assign Riders", icon: UserCheck, path: "/dashboard/assign" },
    { label: "Stats", icon: BarChart3, path: "/dashboard/stats" },
  ],
  operator: [
    { label: "Fleet", icon: Car, path: "/dashboard" },
    { label: "Riders", icon: Users, path: "/dashboard/riders" },
    { label: "Reports", icon: BarChart3, path: "/dashboard/reports" },
  ],
  admin: [
    { label: "Overview", icon: BarChart3, path: "/dashboard" },
    { label: "Users", icon: Users, path: "/dashboard/users" },
    { label: "Rides", icon: MapPin, path: "/dashboard/all-rides" },
    { label: "Roles", icon: Shield, path: "/dashboard/roles" },
  ],
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const primaryRole = roles[0] || "customer";
  const navItems = roleNavItems[primaryRole] || roleNavItems.customer;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Bike className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Habal</p>
            <p className="text-[10px] capitalize text-muted-foreground">{primaryRole}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-info/10 text-info font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-6">{children}</main>
    </div>
  );
}
