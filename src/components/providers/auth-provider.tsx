"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const wasAuthenticated = useRef(false);

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/[...nextauth]?action=session");
      const data = await res.json();
      const u = data.user || null;
      setUser(u);
      if (u) {
        wasAuthenticated.current = true;
      } else if (wasAuthenticated.current && window.location.pathname !== "/login") {
        // Session died (e.g. secret rotated) while the app was open -> force re-login
        window.location.href = "/login";
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // Re-validate session when the tab regains focus + every 5 minutes
    const onFocus = () => refreshUser();
    window.addEventListener("focus", onFocus);
    const id = setInterval(refreshUser, 5 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/[...nextauth]?action=signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: data.error };
      }

      setUser(data.user);
      return {};
    } catch {
      return { error: "حدث خطأ" };
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/[...nextauth]?action=signout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
