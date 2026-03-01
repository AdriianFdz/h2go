"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GDOIcon, OrganizationIcon, TextFileIcon } from "./icons";
import { useAuth } from "../hooks/useAuth";
import { OrganizationType } from "../types/organization";
import { Role } from "../types/user";

export const DashboardNav = ({ className }: { className?: string }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const isTrader = user?.organization?.type === OrganizationType.TRADER;
  const isRegulator = user?.organization?.type === OrganizationType.REGULATOR;
  const isAdmin = user?.role === Role.ADMIN;

  const links = [
    ...(isRegulator
      ? [
          {
            href: "/dashboard/requests",
            icon: <TextFileIcon />,
            label: "Requests",
          },
        ]
      : []),

    ...(isTrader
      ? [
          {
            href: "/dashboard/gdo-operations",
            icon: <TextFileIcon />,
            label: "GDO Operations",
          },
        ]
      : []),

    ...(isAdmin
      ? [
          {
            href: "/dashboard/organization",
            icon: <OrganizationIcon />,
            label: "Organization",
          },
        ]
      : []),
    ...(isTrader
      ? [
          {
            href: "/dashboard/gdos",
            icon: <GDOIcon />,
            label: "GdOs",
          },
        ]
      : []),
  ];
  return (
    <nav
      className={`flex flex-col space-y-4 w-64 bg-surface p-4 border-r border-muted ${className}`}
    >
      {links.map((link) => {
        const selected = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-lg font-medium transition-colors px-4 py-2 rounded-2xl flex items-center space-x-2
              ${selected ? "bg-accent-soft text-accent" : "text-muted hover:text-accent"}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
