import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/types";
import { queryClient } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  sessionId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(
    () => localStorage.getItem("sessionId")
  );

  useEffect(() => {
    if (sessionId) {
      fetch("/api/auth/me", {
        headers: { "x-session-id": sessionId },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setUser(data);
          else {
            localStorage.removeItem("sessionId");
            setSessionId(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("sessionId");
          setSessionId(null);
        });
    }
  }, [sessionId]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // Set new session FIRST so queries use correct credentials
        setSessionId(data.sessionId);
        localStorage.setItem("sessionId", data.sessionId);
        // Then invalidate all queries - refetches will use new sessionId
        await queryClient.invalidateQueries();
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const signup = async (
    username: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        // Set new session FIRST so queries use correct credentials
        setSessionId(data.sessionId);
        localStorage.setItem("sessionId", data.sessionId);
        // Then invalidate all queries - refetches will use new sessionId
        await queryClient.invalidateQueries();
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    if (sessionId) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-session-id": sessionId },
      }).catch(() => {});
    }
    // Clear session and invalidate queries
    setUser(null);
    setSessionId(null);
    localStorage.removeItem("sessionId");
    // Clear all cached data to prevent showing previous user's data
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, sessionId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
