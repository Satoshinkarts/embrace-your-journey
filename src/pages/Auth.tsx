import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import habalLogo from "@/assets/habal-logo.png";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "login" | "signup" | "forgot";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
        toast({ title: "Reset email sent!", description: "Check your inbox for the reset link." });
      } else if (mode === "login") {
        await signIn(email, password);
        navigate("/dashboard");
      } else {
        await signUp(email, password, fullName);
        toast({ title: "Account created!", description: "Check your email to verify your account." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (mode === "forgot" && resetSent) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-background px-5">
        <div className="safe-top pt-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground active:text-foreground">
            <ArrowLeft className="h-4 w-4" />Back
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <Mail className="mb-4 h-12 w-12 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            We sent a password reset link to <span className="font-medium text-foreground">{email}</span>
          </p>
          <Button variant="outline" className="mt-6" onClick={() => { setMode("login"); setResetSent(false); }}>
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-5">
      <div className="safe-top pt-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground active:text-foreground">
          <ArrowLeft className="h-4 w-4" />Back
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-1 flex-col justify-center py-8"
      >
        <div className="mb-8 text-center">
          <img src={habalLogo} alt="Habal" className="mx-auto mb-4 h-16 w-16 object-contain" />
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "forgot" ? "Reset Password" : mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Enter your email to receive a reset link"
              : mode === "login"
              ? "Sign in to continue"
              : "Join the Iloilo Verified Rider Network"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Dela Cruz"
                required
                className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="h-12 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</Label>
                {mode === "login" && (
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary font-medium">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-12 rounded-xl bg-secondary border-border text-foreground placeholder:text-muted-foreground pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          <Button type="submit" className="h-12 w-full rounded-xl text-sm font-semibold" disabled={loading}>
            {loading
              ? "Loading..."
              : mode === "forgot"
              ? "Send Reset Link"
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "forgot" ? (
            <button onClick={() => setMode("login")} className="font-medium text-primary">Back to Sign In</button>
          ) : mode === "login" ? (
            <>Don't have an account?{" "}<button onClick={() => setMode("signup")} className="font-medium text-primary">Sign up</button></>
          ) : (
            <>Already have an account?{" "}<button onClick={() => setMode("login")} className="font-medium text-primary">Sign in</button></>
          )}
        </p>

        {/* Temporary demo buttons — REMOVE BEFORE PRODUCTION */}
        {mode === "login" && (
          <div className="mt-6 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <p className="text-[10px] uppercase tracking-wider text-warning font-medium mb-3 text-center">⚠️ Demo Mode — Remove Before Production</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Customer", email: "demo-customer@habal.local" },
                { label: "Rider", email: "demo-rider@habal.local" },
                { label: "Dispatcher", email: "demo-dispatcher@habal.local" },
                { label: "Operator", email: "demo-operator@habal.local" },
                { label: "Admin", email: "demo-admin@habal.local" },
              ].map((demo) => (
                <Button
                  key={demo.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs border-warning/20 text-warning hover:bg-warning/10"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await signIn(demo.email, "demo-password-123");
                      navigate("/dashboard");
                    } catch (err: any) {
                      toast({ title: "Error", description: err.message, variant: "destructive" });
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {demo.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
