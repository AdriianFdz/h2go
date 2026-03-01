"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { OrganizationType } from "../types/organization";
import { Role } from "../types/user";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;

    const orgType = user.organization?.type;
    const isAdmin = user.role === Role.ADMIN;

    if (orgType === OrganizationType.REGULATOR) {
      router.replace("/dashboard/requests");
    } else if (isAdmin) {
      router.replace("/dashboard/organization");
    } else if (orgType === OrganizationType.TRADER) {
      router.replace("/dashboard/gdo-operations");
    } else {
      router.replace("/dashboard/gdos");
    }
  }, [user, isLoading, router]);

  return null;
}
