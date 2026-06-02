import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

const IMPERSONATE_KEY = "cfa.impersonate";

interface ImpersonateInfo {
  userId: string;
  fullName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  impersonating: ImpersonateInfo | null;
  effectiveUserId: string | undefined;
  startImpersonation: (info: ImpersonateInfo) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [impersonating, setImpersonating] = useState<ImpersonateInfo | null>(() => {
    try {
      const raw = localStorage.getItem(IMPERSONATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => { void checkAdmin(newSession.user.id); }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) void checkAdmin(s.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAdmin(userId: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  }

  async function signOut() {
    stopImpersonation();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  }

  function startImpersonation(info: ImpersonateInfo) {
    localStorage.setItem(IMPERSONATE_KEY, JSON.stringify(info));
    setImpersonating(info);
  }

  function stopImpersonation() {
    localStorage.removeItem(IMPERSONATE_KEY);
    setImpersonating(null);
  }

  const effectiveUserId = isAdmin && impersonating ? impersonating.userId : user?.id;

  return (
    <AuthContext.Provider value={{
      user, session, loading, isAdmin, signOut,
      impersonating: isAdmin ? impersonating : null,
      effectiveUserId,
      startImpersonation, stopImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
