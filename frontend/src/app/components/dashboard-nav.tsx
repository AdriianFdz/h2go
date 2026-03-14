"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GdOIcon,
  KeyIcon,
  OrganizationIcon,
  TextFileIcon,
  PlusCircleIcon,
} from "./icons";
import { useAuth } from "../context/AuthContext";
import { OrganizationType } from "../types/organization";
import { Role } from "../types/user";

export const DashboardNav = ({ className }: { className?: string }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const isTrader = user?.organization?.type === OrganizationType.TRADER;
  const isRegulator = user?.organization?.type === OrganizationType.REGULATOR;
  const isAdmin = user?.role === Role.ADMIN;
  const isProducer = user?.organization?.type === OrganizationType.PRODUCER;
  const isRegistry = user?.organization?.type === OrganizationType.REGISTRY;

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
            label: "GdO Operations",
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
            icon: <GdOIcon />,
            label: "GdOs",
          },
        ]
      : []),
    ...(isAdmin && isProducer
      ? [
          {
            href: "/dashboard/authorizations",
            icon: <KeyIcon />,
            label: "Manage Authorizations",
          },
        ]
      : []),
    ...(isRegistry
      ? [
          {
            href: "/dashboard/register-production",
            icon: <PlusCircleIcon />,
            label: "Register Production",
          },
        ]
      : []),
  ];
  return (
    <nav
      className={`flex flex-col space-y-4 w-70 bg-surface p-4 border-r border-muted ${className}`}
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
