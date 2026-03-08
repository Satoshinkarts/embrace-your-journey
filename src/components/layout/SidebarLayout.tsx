import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import habalLogo from "@/assets/habal-logo.png";
import {
  BarChart3, Car, CheckCircle, ChevronLeft, ChevronRight,
  Home, LogOut, MapPin, Menu, Navigation, Network, Shield,
  Users, Wallet, X, Zap, AlertTriangle, Star, Clock, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { UserProfileSheet } from "@/components/UserProfile";

type NavItem = { label: string; icon: React.ElementType; path: string; badge?: string };
type NavSection = { title: string; items: NavItem[] };

const roleNavSections: Record<string, NavSection[]> = {
  customer: [
    {
      title: "Main",
      items: [
        { label: "Book Ride", icon: MapPin, path: "/dashboard" },
        { label: "My Rides", icon: Clock, path: "/dashboard/rides" },
        { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" },
        { label: "Messages", icon: Navigation, path: "/dashboard/messages" },
      ],
    },
  ],
  rider: [
    {
      title: "Main",
      items: [
        { label: "Active Rides", icon: MapPin, path: "/dashboard" },
        { label: "Trip History", icon: Clock, path: "/dashboard/trips" },
        { label: "Earnings", icon: Wallet, path: "/dashboard/earnings" },
        { label: "Profile", icon: User, path: "/dashboard/rider-profile" },
      ],
    },
  ],
  dispatcher: [
    {
      title: "Dispatch",
      items: [
        { label: "Live Monitor", icon: Navigation, path: "/dashboard" },
        { label: "Assign Riders", icon: Users, path: "/dashboard/assign" },
        { label: "Statistics", icon: BarChart3, path: "/dashboard/stats" },
      ],
    },
  ],
  operator: [
    {
      title: "Network",
      items: [
        { label: "Dashboard", icon: Home, path: "/dashboard" },
        { label: "Live Map", icon: Navigation, path: "/dashboard/map" },
        { label: "Members", icon: Users, path: "/dashboard/riders" },
        { label: "Wallets", icon: Wallet, path: "/dashboard/operator-wallets" },
        { label: "Reports", icon: BarChart3, path: "/dashboard/reports" },
      ],
    },
    {
      title: "Governance",
      items: [
        { label: "KPI / SLA", icon: Zap, path: "/dashboard/kpi" },
        { label: "Strikes", icon: AlertTriangle, path: "/dashboard/strikes" },
      ],
    },
  ],
  admin: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", icon: Home, path: "/dashboard" },
        { label: "Live Map", icon: Navigation, path: "/dashboard/admin-map" },
      ],
    },
    {
      title: "Management",
      items: [
        { label: "Networks", icon: Network, path: "/dashboard/networks" },
        { label: "Users", icon: Users, path: "/dashboard/users" },
        { label: "Wallets", icon: Wallet, path: "/dashboard/wallets" },
        { label: "All Rides", icon: MapPin, path: "/dashboard/all-rides" },
        { label: "Zones", icon: MapPin, path: "/dashboard/zones" },
        { label: "Roles", icon: Shield, path: "/dashboard/roles" },
      ],
    },
    {
      title: "Governance",
      items: [
        { label: "KPI / SLA", icon: Zap, path: "/dashboard/kpi" },
        { label: "Strikes", icon: AlertTriangle, path: "/dashboard/strikes" },
      ],
    },
  ],
};

interface SidebarLayoutProps {
  children: ReactNode;
  fullScreen?: boolean;
}

export default function SidebarLayout({ children, fullScreen = false }: SidebarLayoutProps) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const primaryRole = roles[0] || "customer";
  const sections = roleNavSections[primaryRole] || roleNavSections.customer;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isMobileRole = primaryRole === "customer" || primaryRole === "rider";
  const isRider = primaryRole === "rider";

  // Mobile bottom-tab layout for customer/rider
  if (isMobileRole) {
    const allItems = sections.flatMap(s => s.items);
    return (
      <div className="relative flex min-h-[100dvh] flex-col bg-background">
        <header className="safe-top sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <img src={habalLogo} alt="Habal" className="h-8 w-8 object-contain" />
            <div>
              <p className="text-sm font-bold text-foreground tracking-tight">Habal</p>
              <p className="text-[10px] capitalize text-muted-foreground font-medium">{primaryRole}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isRider && (
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center justify-center rounded-full bg-primary/10 h-8 w-8 text-primary transition-colors active:bg-primary/20"
              >
                <User className="h-4 w-4" />
              </button>
            )}
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
        <main className={cn("flex-1", fullScreen ? "" : "px-4 pb-24 pt-4")}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={fullScreen ? "h-full" : ""}
          >
            {children}
          </motion.div>
        </main>
        <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl">
          <div className="flex items-stretch justify-around px-2">
            {allItems.map((item) => {
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

  // Desktop sidebar layout for dispatcher/operator/admin
  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <img src={habalLogo} alt="Habal" className="h-8 w-8 shrink-0 object-contain" />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-sidebar-foreground tracking-tight">Habal</p>
              <p className="text-[10px] capitalize text-sidebar-foreground/50 font-medium">{primaryRole}</p>
            </div>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-sidebar-foreground/50 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "bg-sidebar-primary/10 text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className={cn("h-4.5 w-4.5 shrink-0", collapsed && "mx-auto")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <Badge className="ml-auto bg-sidebar-primary/20 text-sidebar-primary border-0 text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors"
          >
            <User className={cn("h-4.5 w-4.5 shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span>Profile</span>}
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive/80 hover:bg-destructive/10 transition-colors"
          >
            <LogOut className={cn("h-4.5 w-4.5 shrink-0", collapsed && "mx-auto")} />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center rounded-lg py-2 text-sidebar-foreground/40 hover:text-sidebar-foreground/70 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <UserProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />

      {/* Main content */}
      <div className={cn("flex-1 transition-all duration-300", collapsed ? "lg:ml-[68px]" : "lg:ml-64")}>
        {/* Top bar for mobile */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <img src={habalLogo} alt="Habal" className="h-6 w-6 object-contain" />
          <span className="text-sm font-bold text-foreground">Habal</span>
        </header>

        <main className={cn(fullScreen ? "h-[calc(100vh-0px)] lg:h-screen" : "p-6")}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={fullScreen ? "h-full" : "max-w-7xl mx-auto"}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
