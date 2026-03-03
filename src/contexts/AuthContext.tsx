import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "customer" | "rider" | "dispatcher" | "operator" | "admin";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  isBanned: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const parsed = data ? data.map((r) => r.role as AppRole) : [];
    setRoles(parsed);
    return parsed;
  };

  const checkBanStatus = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.is_banned) {
      setIsBanned(true);
      await supabase.auth.signOut();
      return true;
    }
    setIsBanned(false);
    return false;
  };

  useEffect(() => {
    let mounted = true;

    // Restore session first — this is fast (reads from storage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    // Listen for subsequent auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Don't await async work inside the callback — it blocks the listener
          checkBanStatus(session.user.id);
          fetchRoles(session.user.id);
        } else {
          setRoles([]);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Check ban after successful sign-in
    if (signInData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned, ban_reason")
        .eq("user_id", signInData.user.id)
        .maybeSingle();
      if (profile?.is_banned) {
        await supabase.auth.signOut();
        throw new Error(profile.ban_reason ? `Account banned: ${profile.ban_reason}` : "Your account has been banned. Contact support.");
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ session, user, roles, loading, isBanned, signUp, signIn, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
