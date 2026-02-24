import { useState } from "react";
import { useNavigate } from "react-router-dom";
import habalLogo from "@/assets/habal-logo.png";
import { Bike, Users, Navigation, Settings, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const roles = [
  { key: "customer", label: "Customer", description: "Book rides & track trips", icon: Users, color: "text-info", bgColor: "bg-info/10" },
  { key: "rider", label: "Rider", description: "Accept trips & earn", icon: Bike, color: "text-primary", bgColor: "bg-primary/10" },
  { key: "dispatcher", label: "Dispatcher", description: "Assign & manage", icon: Navigation, color: "text-warning", bgColor: "bg-warning/10" },
  { key: "operator", label: "Operator", description: "Manage fleet", icon: Settings, color: "text-accent", bgColor: "bg-accent/10" },
  { key: "admin", label: "Admin", description: "Governance & oversight", icon: Shield, color: "text-muted-foreground", bgColor: "bg-muted/50" },
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
      // Try sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        navigate("/dashboard");
        return;
      }

      // If sign in fails, create the demo account
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: `Demo ${roleKey.charAt(0).toUpperCase() + roleKey.slice(1)}` } },
      });

      if (signUpError) throw signUpError;

      // Sign in after signup
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 overflow-hidden">
      {/* White glowing lights background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-white/5 blur-[100px]" />
        <div className="absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-white/4 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 h-72 w-72 rounded-full bg-white/3 blur-[100px]" />
        <div className="absolute right-1/3 bottom-1/3 h-56 w-56 rounded-full bg-info/5 blur-[80px]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/3 blur-[150px]" />
      </div>

      <div className="relative z-10 mb-10 text-center">
        <img src={habalLogo} alt="Habal Logo" className="mx-auto mb-4 h-28 w-28 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Habal</h1>
        <p className="mt-1 text-muted-foreground">Iloilo Verified Rider Network</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/5 px-3 py-1 text-xs font-medium text-info">
          <Zap className="h-3 w-3" />
          DEMO MODE
        </div>
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="grid grid-cols-2 gap-3">
          {roles.slice(0, 4).map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.key}
                onClick={() => handleDemoLogin(role.key)}
                disabled={!!loadingRole}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-info/40 hover:bg-secondary disabled:opacity-50"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${role.bgColor}`}>
                  <Icon className={`h-6 w-6 ${role.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{role.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {loadingRole === role.key ? "Signing in..." : role.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {(() => {
          const admin = roles[4];
          const AdminIcon = admin.icon;
          return (
            <button
              onClick={() => handleDemoLogin(admin.key)}
              disabled={!!loadingRole}
              className="mt-3 flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-info/40 hover:bg-secondary disabled:opacity-50"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${admin.bgColor}`}>
                <AdminIcon className={`h-6 w-6 ${admin.color}`} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">{admin.label}</p>
                <p className="text-xs text-muted-foreground">
                  {loadingRole === admin.key ? "Signing in..." : admin.description}
                </p>
              </div>
            </button>
          );
        })()}
      </div>

      <p className="mt-8 max-w-xs text-center text-sm text-muted-foreground">
        Tap a role to explore the full platform. No account needed.
      </p>
    </div>
  );
}
