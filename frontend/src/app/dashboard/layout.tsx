"use client";

import { useAuth } from "../hooks/useAuth";
import {
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  Label,
} from "@heroui/react";
import { NavLogo } from "../components/nav-logo";
import { useRouter } from "next/navigation";
import { DownArrowIcon, LogoutIcon } from "../components/icons";
import { DashboardNav } from "../components/dashboard-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="xl" />
      </div>
    );
  }

  return isAuthenticated ? (
    <>
      <header className="flex justify-between items-center w-full h-30 bg-surface px-4 border-b border-muted">
        <NavLogo />
        {user && (
          <Dropdown>
            <DropdownTrigger>
              <div className="flex items-center gap-3 mr-8">
                <Avatar size="lg">
                  <AvatarImage
                    src={user.avatar || undefined}
                    alt={user.name}
                  />
                  <AvatarFallback>
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white text-xl font-semibold">
                    {user.name}
                  </p>
                  <p className="text-muted text-md">
                    {user.organization?.name}
                  </p>
                </div>
                <DownArrowIcon className="w-7 h-7" />
              </div>
            </DropdownTrigger>
            <DropdownPopover>
              <DropdownMenu>
                <DropdownItem
                  textValue="Logout"
                  variant="danger"
                  onAction={handleLogout}
                >
                  <div className="flex items-center gap-2">
                    <LogoutIcon className="text-danger" />
                    <Label>Logout</Label>
                  </div>
                </DropdownItem>
              </DropdownMenu>
            </DropdownPopover>
          </Dropdown>
        )}
      </header>
      <div className="flex h-screen bg-background">
        <DashboardNav className="" />
        <main className="flex-1 overflow-auto mt-5 ml-10 pr-0">{children}</main>
      </div>
    </>
  ) : null;
}
