"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "../types/user";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  authorizedByOrgs: string[];
  updateUser: (updated: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authorizedByOrgs, setAuthorizedByOrgs] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/auth/verify`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          router.push("/");
          return;
        }

        const data = await response.json();
        setUser(data.user);
        setAuthorizedByOrgs(data.authorizedByOrgs || []);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth verification error:", error);
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, [router]);

  const updateUser = (updated: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, user, authorizedByOrgs, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
