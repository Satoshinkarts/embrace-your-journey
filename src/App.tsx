import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AdminZones from "./pages/admin/AdminZones";
import AdminNetworks from "./pages/admin/AdminNetworks";
import AdminKPI from "./pages/admin/AdminKPI";
import AdminStrikes from "./pages/admin/AdminStrikes";

// Customer
import CustomerDashboard, { CustomerRides, CustomerRatings, CustomerWallet } from "./pages/customer/CustomerDashboard";
// Rider
import RiderDashboard, { RiderTrips, RiderEarnings } from "./pages/rider/RiderDashboard";
// Dispatcher
import DispatcherDashboard, { DispatcherAssign, DispatcherStats } from "./pages/dispatcher/DispatcherDashboard";
// Operator
import OperatorDashboard, { OperatorMap, OperatorRiders, OperatorReports } from "./pages/operator/OperatorDashboard";
// Admin
import AdminDashboard, { AdminUsers, AdminAllRides, AdminMap, AdminRoles } from "./pages/admin/AdminDashboard";
import AdminWallets from "./pages/admin/AdminWallets";
import OperatorWallets from "./pages/operator/OperatorWallets";

const queryClient = new QueryClient();

type AppRole = "customer" | "rider" | "dispatcher" | "operator" | "admin";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RoleGuard({ allowedRoles, children }: { allowedRoles: AppRole[]; children: React.ReactNode }) {
  const { session, roles, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
  const isAdmin = roles.includes("admin");
  if (!isAdmin && !roles.some((r) => allowedRoles.includes(r))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function RoleDashboard() {
  const { roles } = useAuth();
  const role = roles[0] || "customer";
  switch (role) {
    case "rider": return <RiderDashboard />;
    case "dispatcher": return <DispatcherDashboard />;
    case "operator": return <OperatorDashboard />;
    case "admin": return <AdminDashboard />;
    default: return <CustomerDashboard />;
  }
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />

    {/* Role-aware main dashboard */}
    <Route path="/dashboard" element={<ProtectedRoute><RoleDashboard /></ProtectedRoute>} />

    {/* Customer routes */}
    <Route path="/dashboard/rides" element={<RoleGuard allowedRoles={["customer"]}><CustomerRides /></RoleGuard>} />
    <Route path="/dashboard/wallet" element={<RoleGuard allowedRoles={["customer"]}><CustomerWallet /></RoleGuard>} />
    <Route path="/dashboard/ratings" element={<RoleGuard allowedRoles={["customer"]}><CustomerRatings /></RoleGuard>} />

    {/* Rider routes */}
    <Route path="/dashboard/trips" element={<RoleGuard allowedRoles={["rider"]}><RiderTrips /></RoleGuard>} />
    <Route path="/dashboard/earnings" element={<RoleGuard allowedRoles={["rider"]}><RiderEarnings /></RoleGuard>} />

    {/* Dispatcher routes */}
    <Route path="/dashboard/assign" element={<RoleGuard allowedRoles={["dispatcher", "admin"]}><DispatcherAssign /></RoleGuard>} />
    <Route path="/dashboard/stats" element={<RoleGuard allowedRoles={["dispatcher", "admin"]}><DispatcherStats /></RoleGuard>} />

    {/* Operator routes */}
    <Route path="/dashboard/map" element={<RoleGuard allowedRoles={["operator", "admin"]}><OperatorMap /></RoleGuard>} />
    <Route path="/dashboard/riders" element={<RoleGuard allowedRoles={["operator", "admin"]}><OperatorRiders /></RoleGuard>} />
    <Route path="/dashboard/operator-wallets" element={<RoleGuard allowedRoles={["operator"]}><OperatorWallets /></RoleGuard>} />
    <Route path="/dashboard/reports" element={<RoleGuard allowedRoles={["operator", "admin"]}><OperatorReports /></RoleGuard>} />

    {/* Admin routes */}
    <Route path="/dashboard/users" element={<RoleGuard allowedRoles={["admin"]}><AdminUsers /></RoleGuard>} />
    <Route path="/dashboard/all-rides" element={<RoleGuard allowedRoles={["admin"]}><AdminAllRides /></RoleGuard>} />
    <Route path="/dashboard/admin-map" element={<RoleGuard allowedRoles={["admin"]}><AdminMap /></RoleGuard>} />
    <Route path="/dashboard/roles" element={<RoleGuard allowedRoles={["admin"]}><AdminRoles /></RoleGuard>} />
    <Route path="/dashboard/zones" element={<RoleGuard allowedRoles={["admin"]}><AdminZones /></RoleGuard>} />
    <Route path="/dashboard/networks" element={<RoleGuard allowedRoles={["admin"]}><AdminNetworks /></RoleGuard>} />
    <Route path="/dashboard/kpi" element={<RoleGuard allowedRoles={["admin", "operator"]}><AdminKPI /></RoleGuard>} />
    <Route path="/dashboard/strikes" element={<RoleGuard allowedRoles={["admin", "operator"]}><AdminStrikes /></RoleGuard>} />
    <Route path="/dashboard/wallets" element={<RoleGuard allowedRoles={["admin"]}><AdminWallets /></RoleGuard>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary fallbackTitle="Habal encountered an error">
          {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
