import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Customer
import CustomerDashboard, { CustomerRides, CustomerRatings } from "./pages/customer/CustomerDashboard";
// Rider
import RiderDashboard, { RiderTrips, RiderEarnings } from "./pages/rider/RiderDashboard";
// Dispatcher
import DispatcherDashboard, { DispatcherAssign, DispatcherStats } from "./pages/dispatcher/DispatcherDashboard";
// Operator
import OperatorDashboard, { OperatorMap, OperatorRiders, OperatorReports } from "./pages/operator/OperatorDashboard";
// Admin
import AdminDashboard, { AdminUsers, AdminAllRides, AdminMap, AdminRoles } from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading...</div>;
  if (!session) return <Navigate to="/auth" replace />;
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

    {/* Role-aware main dashboard */}
    <Route path="/dashboard" element={<ProtectedRoute><RoleDashboard /></ProtectedRoute>} />

    {/* Customer routes */}
    <Route path="/dashboard/rides" element={<ProtectedRoute><CustomerRides /></ProtectedRoute>} />
    <Route path="/dashboard/ratings" element={<ProtectedRoute><CustomerRatings /></ProtectedRoute>} />

    {/* Rider routes */}
    <Route path="/dashboard/trips" element={<ProtectedRoute><RiderTrips /></ProtectedRoute>} />
    <Route path="/dashboard/earnings" element={<ProtectedRoute><RiderEarnings /></ProtectedRoute>} />

    {/* Dispatcher routes */}
    <Route path="/dashboard/assign" element={<ProtectedRoute><DispatcherAssign /></ProtectedRoute>} />
    <Route path="/dashboard/stats" element={<ProtectedRoute><DispatcherStats /></ProtectedRoute>} />

    {/* Operator routes */}
    <Route path="/dashboard/map" element={<ProtectedRoute><OperatorMap /></ProtectedRoute>} />
    <Route path="/dashboard/riders" element={<ProtectedRoute><OperatorRiders /></ProtectedRoute>} />
    <Route path="/dashboard/reports" element={<ProtectedRoute><OperatorReports /></ProtectedRoute>} />

    {/* Admin routes */}
    <Route path="/dashboard/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
    <Route path="/dashboard/all-rides" element={<ProtectedRoute><AdminAllRides /></ProtectedRoute>} />
    <Route path="/dashboard/admin-map" element={<ProtectedRoute><AdminMap /></ProtectedRoute>} />
    <Route path="/dashboard/roles" element={<ProtectedRoute><AdminRoles /></ProtectedRoute>} />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
