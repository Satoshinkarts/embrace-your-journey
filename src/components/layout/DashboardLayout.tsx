import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import habalLogo from "@/assets/habal-logo.png";
import {
  Bike, LogOut, Home, MapPin, Clock, DollarSign, Users,
  Navigation, Settings, Shield, BarChart3, Car, UserCheck, Star, User, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserProfileSheet } from "@/components/UserProfile";

type NavItem = { label: string; icon: React.ElementType; path: string };

const roleNavItems: Record<string, NavItem[]> = {
  customer: [
    { label: "Home", icon: Home, path: "/dashboard" },
    { label: "Activity", icon: Clock, path: "/dashboard/rides" },
    { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" },
    { label: "Profile", icon: User, path: "/dashboard/ratings" },
  ],
  rider: [
    { label: "Home", icon: Home, path: "/dashboard" },
    { label: "Trips", icon: Clock, path: "/dashboard/trips" },
    { label: "Earnings", icon: DollarSign, path: "/dashboard/earnings" },
    { label: "Profile", icon: User, path: "/dashboard/ratings" },
  ],
  dispatcher: [
    { label: "Monitor", icon: Navigation, path: "/dashboard" },
    { label: "Assign", icon: UserCheck, path: "/dashboard/assign" },
    { label: "Stats", icon: BarChart3, path: "/dashboard/stats" },
  ],
  operator: [
    { label: "Fleet", icon: Car, path: "/dashboard" },
    { label: "Map", icon: Navigation, path: "/dashboard/map" },
    { label: "Riders", icon: Users, path: "/dashboard/riders" },
    { label: "Wallets", icon: Wallet, path: "/dashboard/operator-wallets" },
    { label: "Reports", icon: BarChart3, path: "/dashboard/reports" },
  ],
  admin: [
    { label: "Overview", icon: BarChart3, path: "/dashboard" },
    { label: "Map", icon: Navigation, path: "/dashboard/admin-map" },
    { label: "Users", icon: Users, path: "/dashboard/users" },
    { label: "Wallets", icon: Wallet, path: "/dashboard/wallets" },
    { label: "Rides", icon: MapPin, path: "/dashboard/all-rides" },
    { label: "Zones", icon: MapPin, path: "/dashboard/zones" },
    { label: "Roles", icon: Shield, path: "/dashboard/roles" },
  ],
};

interface DashboardLayoutProps {
  children: ReactNode;
  fullScreen?: boolean;
}

export default function DashboardLayout({ children, fullScreen = false }: DashboardLayoutProps) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const primaryRole = roles[0] || "customer";
  const navItems = roleNavItems[primaryRole] || roleNavItems.customer;
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background">
      {/* Top bar */}
      <header className="safe-top sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <img src={habalLogo} alt="Habal" className="h-8 w-8 object-contain" />
          <div>
            <p className="text-sm font-bold text-foreground tracking-tight">Habal</p>
            <p className="text-[10px] capitalize text-muted-foreground font-medium">{primaryRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center justify-center rounded-full bg-primary/10 h-8 w-8 text-primary transition-colors active:bg-primary/20"
            aria-label="My Profile"
          >
            <User className="h-4 w-4" />
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors active:bg-muted"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit
          </button>
        </div>
      </header>

      <UserProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />

      {/* Content */}
      <main className={cn(
        "flex-1",
        fullScreen ? "" : "px-4 pb-24 pt-4"
      )}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={fullScreen ? "h-full" : ""}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="flex items-stretch justify-around px-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 transition-all",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                  {active && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span className={cn("text-[10px] font-medium", active && "text-primary")}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
