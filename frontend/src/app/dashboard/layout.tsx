"use client";

import { useAuth } from "../hooks/useAuth";
import { Spinner } from "@heroui/react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="xl" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}
