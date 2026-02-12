"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "../types/user";

export function useAuth() {
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

  return { isAuthenticated, isLoading, user, authorizedByOrgs };
}
