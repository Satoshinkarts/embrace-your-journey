import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import habalLogo from "@/assets/habal-logo.png";
import { Bike, Users, Navigation, Settings, Shield, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const roles = [
  { key: "customer", label: "Customer", description: "Book rides & track trips", icon: Users, gradient: "from-primary/20 to-primary/5" },
  { key: "rider", label: "Rider", description: "Accept trips & earn", icon: Bike, gradient: "from-info/20 to-info/5" },
  { key: "dispatcher", label: "Dispatcher", description: "Assign & manage", icon: Navigation, gradient: "from-warning/20 to-warning/5" },
  { key: "operator", label: "Operator", description: "Manage fleet", icon: Settings, gradient: "from-accent/20 to-accent/5" },
  { key: "admin", label: "Admin", description: "Full system access", icon: Shield, gradient: "from-muted to-muted/50" },
];

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleDemoLogin = async (roleKey: string) => {
    setLoadingRole(roleKey);
    const email = `demo-${roleKey}@habal.local`;
    const password = "demo-password-123";

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) { navigate("/dashboard"); return; }
      const { error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: `Demo ${roleKey.charAt(0).toUpperCase() + roleKey.slice(1)}` } },
      });
      if (signUpError) throw signUpError;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Demo login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-background px-5 py-12 overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-primary/6 blur-[150px]" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-info/4 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/4 blur-[120px]" />
      </div>

      {/* Logo & branding */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mb-10 text-center"
      >
        <div className="relative mx-auto mb-5 h-24 w-24">
          <div className="absolute -inset-6 rounded-full bg-white/8 blur-[50px]" />
          <div className="absolute -inset-3 rounded-full bg-primary/10 blur-[30px]" />
          <img src={habalLogo} alt="Habal Logo" className="relative h-24 w-24 object-contain drop-shadow-2xl" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Habal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Iloilo Verified Rider Network</p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
        >
          <span className="pulse-dot" />
          <span className="ml-1">DEMO MODE</span>
        </motion.div>
      </motion.div>

      {/* Role cards */}
      <div className="relative z-10 w-full max-w-sm space-y-2.5">
        {roles.map((role, i) => {
          const Icon = role.icon;
          const isLoading = loadingRole === role.key;
          return (
            <motion.button
              key={role.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => handleDemoLogin(role.key)}
              disabled={!!loadingRole}
              className={`group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-gradient-to-r ${role.gradient} p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-background/50 backdrop-blur-sm">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{role.label}</p>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? "Signing in..." : role.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </motion.button>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center text-xs text-muted-foreground"
      >
        Tap a role to explore • No account needed
      </motion.p>
    </div>
  );
}
