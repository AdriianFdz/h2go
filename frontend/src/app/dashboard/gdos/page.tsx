"use client";

import { useAuth } from "@/app/hooks/useAuth";
import { GdoBalance } from "@/app/types/gdoBalance";
import { GDO } from "@/app/types/gdo";
import { Accordion, Spinner } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ElectricityIcon, HydrogenIcon } from "@/app/components/icons";
import { OrganizationType } from "@/app/types/organization";

interface OrganizationBalance {
  organizationId: string;
  organizationName: string;
  balance: GdoBalance;
}

export default function GdOsPage() {
  const { user, isLoading, authorizedByOrgs } = useAuth();
  const router = useRouter();
  const [balances, setBalances] = useState<OrganizationBalance[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    if (!user?.organization?.id) return;

    const fetchBalances = async () => {
      setLoadingBalance(true);
      try {
        const isTrader = user.organization?.type === OrganizationType.TRADER;
        const orgsToFetch =
          isTrader && authorizedByOrgs.length > 0
            ? authorizedByOrgs
            : [user.organization?.id].filter(
                (id): id is string => id !== undefined
              );

        const balancePromises = orgsToFetch.map(async (orgId) => {
          const [balanceResponse, orgResponse] = await Promise.all([
            fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${orgId}/balance`,
              {
                method: "GET",
                credentials: "include",
              }
            ),
            fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${orgId}`,
              {
                method: "GET",
                credentials: "include",
              }
            ),
          ]);

          if (balanceResponse.ok && orgResponse.ok) {
            const balanceData = await balanceResponse.json();
            const orgData = await orgResponse.json();
            return {
              organizationId: orgId,
              organizationName: orgData.name,
              balance: balanceData,
            };
          }
          return null;
        });

        const results = await Promise.all(balancePromises);
        setBalances(results.filter((b) => b !== null) as OrganizationBalance[]);
      } catch (error) {
        console.error("Error fetching balances:", error);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBalances();
  }, [user, authorizedByOrgs]);

  if (isLoading || loadingBalance) {
    return (
      <div className="flex items-center justify-center mt-20">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  const isTrader = user.organization?.type === OrganizationType.TRADER;

  return (
    <div className="pb-32 pr-10">
      <h1 className="text-4xl font-bold mb-4">GDOs Balance</h1>
      <p className="text-muted text-lg mb-8">
        {isTrader
          ? "Check the Guarantees of Origin balance for authorized organizations."
          : "Check your Guarantees of Origin balance."}
      </p>

      {balances.length === 0 && !loadingBalance && (
        <div className="text-center py-16 bg-surface/30 rounded-2xl border border-muted/20">
          <p className="text-xl text-muted">No balances available.</p>
          <p className="text-sm text-muted mt-2">
            {isTrader
              ? "No organizations have authorized you yet."
              : "Request new GDOs to see them here."}
          </p>
        </div>
      )}

      {isTrader && balances.length > 0 ? (
        <Accordion
          className="w-full"
          variant="surface"
        >
          {balances.map((orgBalance) => (
            <Accordion.Item key={orgBalance.organizationId}>
              <Accordion.Heading>
                <Accordion.Trigger className="group flex items-center justify-between bg-surface border border-muted/30 px-6 py-4 rounded-xl w-full">
                  <div className="flex-1 text-left">
                    <span className="text-xl font-bold">
                      Organization: {orgBalance.organizationName}
                    </span>
                    <p className="text-sm text-muted mt-1">
                      {(orgBalance.balance?.gdos?.ELECTRICITY?.available
                        ?.length || 0) +
                        (orgBalance.balance?.gdos?.ELECTRICITY?.unavailable
                          ?.length || 0) +
                        (orgBalance.balance?.gdos?.H2?.available?.length || 0) +
                        (orgBalance.balance?.gdos?.H2?.unavailable?.length ||
                          0)}{" "}
                      GDOs total
                    </p>
                  </div>
                  <Accordion.Indicator className="text-muted w-6 h-6" />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel className="mt-2">
                <Accordion.Body className="py-6 border border-muted/30 rounded-xl bg-surface/30">
                  <OrganizationBalanceSection
                    organizationBalance={orgBalance}
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        balances.map((orgBalance) => (
          <OrganizationBalanceSection
            key={orgBalance.organizationId}
            organizationBalance={orgBalance}
          />
        ))
      )}
    </div>
  );
}

function groupGdosByRequest(gdos: GDO[]): [string, GDO[]][] {
  const grouped = gdos.reduce(
    (acc, gdo) => {
      const requestId = gdo.requestId;
      if (!acc[requestId]) {
        acc[requestId] = [];
      }
      acc[requestId].push(gdo);
      return acc;
    },
    {} as Record<string, GDO[]>
  );

  return Object.entries(grouped);
}

interface OrganizationBalanceSectionProps {
  organizationBalance: OrganizationBalance;
}

function OrganizationBalanceSection({
  organizationBalance,
}: OrganizationBalanceSectionProps) {
  const { balance } = organizationBalance;

  const electricityAvailable = balance?.gdos?.ELECTRICITY?.available || [];
  const electricityUnavailable = balance?.gdos?.ELECTRICITY?.unavailable || [];
  const h2Available = balance?.gdos?.H2?.available || [];
  const h2Unavailable = balance?.gdos?.H2?.unavailable || [];

  const totalElectricity =
    electricityAvailable.length + electricityUnavailable.length;
  const totalH2 = h2Available.length + h2Unavailable.length;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Electricity Card */}
        <div className="bg-surface border-3 border-yellow-500/20 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <ElectricityIcon className="w-10 h-10 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-yellow-500">
                Electricity
              </h3>
              <p className="text-muted">Total GDOs: {totalElectricity}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex-1 bg-success/5 border border-success-soft rounded-lg p-3 hover:bg-success/10 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm font-medium text-success">Available</p>
              </div>
              <p className="text-2xl font-bold text-success">
                {electricityAvailable.length}
              </p>
            </div>
            <div className="flex-1 bg-danger/5 border border-danger-soft rounded-lg p-3 hover:bg-danger/10 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-danger"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <p className="text-sm font-medium text-danger">Used</p>
              </div>
              <p className="text-2xl font-bold text-danger">
                {electricityUnavailable.length}
              </p>
            </div>
          </div>
        </div>

        {/* H2 Card */}
        <div className="bg-surface border-3 border-accent-soft-hover rounded-2xl p-6 shadow-md hover:shadow-lg transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-accent/10 rounded-xl">
              <HydrogenIcon className="w-10 h-10 text-accent" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-accent">Hydrogen (H2)</h3>
              <p className="text-muted">Total GDOs: {totalH2}</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex-1 bg-success/5 border border-success-soft rounded-lg p-3 hover:bg-success/10 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="text-sm font-medium text-success">Available</p>
              </div>
              <p className="text-2xl font-bold text-success">
                {h2Available.length}
              </p>
            </div>
            <div className="flex-1 bg-danger/5 border border-danger-soft rounded-lg p-3 hover:bg-danger/10 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-4 h-4 text-danger"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <p className="text-sm font-medium text-danger">Used</p>
              </div>
              <p className="text-2xl font-bold text-danger">
                {h2Unavailable.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed GDOs List */}
      <Accordion
        className="w-full rounded-2xl"
        variant="surface"
      >
        {/* Electricity Available */}
        
          <Accordion.Item key="electricity-available">
            <Accordion.Heading>
              <Accordion.Trigger className="group flex items-center gap-4 bg-linear-to-r from-surface to-background border border-muted/30 px-5 py-4 rounded-xl w-full shadow-md">
                <ElectricityIcon className="w-8 h-8" />
                <div className="flex-1 text-left flex items-center">
                  <span className="text-xl font-bold">
                    Electricity GDOs - Available
                  </span>
                  <span className="ml-3 inline-flex items-center justify-center min-w-8 h-8 rounded-full bg-success-soft text-success font-semibold text-sm">
                    {electricityAvailable.length}
                  </span>
                </div>
                <Accordion.Indicator className="text-muted w-6 h-6" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel className="mt-2">
              <Accordion.Body className="border border-muted/30 rounded-xl bg-surface/30 p-6">
                <Accordion
                  className="w-full"
                  variant="surface"
                >
                  {groupGdosByRequest(electricityAvailable).map(
                    ([requestId, gdos]) => (
                      <Accordion.Item key={`req-${requestId}`}>
                        <Accordion.Heading>
                          <Accordion.Trigger className="group flex items-center gap-3 bg-surface/50 border border-muted/20 px-4 py-3 rounded-lg w-full">
                            <div className="flex-1 text-left">
                              <span className="text-base font-semibold">
                                Request: {requestId.slice(0, 8)}...
                              </span>
                              <p className="text-xs text-muted mt-1">
                                {gdos.length} GDO{gdos.length > 1 ? "s" : ""}
                              </p>
                            </div>
                            <Accordion.Indicator className="text-muted w-5 h-5" />
                          </Accordion.Trigger>
                        </Accordion.Heading>
                        <Accordion.Panel className="mt-1">
                          <Accordion.Body className="py-3">
                            <div className="grid gap-3">
                              {gdos.map((gdo, idx) => (
                                <div
                                  key={gdo.gdoId}
                                  className="bg-background/70 rounded-lg p-4 border border-success-soft"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <h4 className="font-bold text-lg">
                                      GDO #{idx + 1}
                                    </h4>
                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-success-soft text-success font-semibold text-xs">
                                      {gdo.status}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        GDO ID
                                      </p>
                                      <p className="font-mono text-xs break-all">
                                        {gdo.gdoId}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        Request ID
                                      </p>
                                      <p className="font-mono text-xs break-all">
                                        {gdo.requestId}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        Issue Date
                                      </p>
                                      <p>
                                        {new Date(
                                          gdo.issueDate
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        Expiry Date
                                      </p>
                                      <p>
                                        {new Date(
                                          gdo.expiryDate
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Accordion.Body>
                        </Accordion.Panel>
                      </Accordion.Item>
                    )
                  )}
                </Accordion>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        

        {/* Electricity Unavailable */}
          <Accordion.Item key="electricity-unavailable">
            <Accordion.Heading>
              <Accordion.Trigger className="group flex items-center gap-4 bg-linear-to-r from-surface to-background border border-muted/30 px-5 py-4 rounded-xl w-full shadow-md">
                <ElectricityIcon className="w-8 h-8 opacity-50" />
                <div className="flex-1 text-left flex items-center">
                  <span className="text-xl font-bold">
                    Electricity GDOs - Used
                  </span>
                  <span className="ml-3 inline-flex items-center justify-center min-w-8 h-8 rounded-full bg-danger-soft text-danger font-semibold text-sm">
                    {electricityUnavailable.length}
                  </span>
                </div>
                <Accordion.Indicator className="text-muted w-6 h-6" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel className="mt-2">
              <Accordion.Body className="border border-muted/30 rounded-xl bg-surface/30 p-6">
                <Accordion
                  className="w-full"
                  variant="surface"
                >
                  {groupGdosByRequest(electricityUnavailable).map(
                    ([requestId, gdos]) => (
                      <Accordion.Item key={`req-${requestId}`}>
                        <Accordion.Heading>
                          <Accordion.Trigger className="group flex items-center gap-3 bg-surface/50 border border-danger-soft px-4 py-3 rounded-lg w-full opacity-70">
                            <div className="flex-1 text-left">
                              <span className="text-base font-semibold">
                                Request: {requestId.slice(0, 8)}...
                              </span>
                              <p className="text-xs text-muted mt-1">
                                {gdos.length} GDO{gdos.length > 1 ? "s" : ""}
                              </p>
                            </div>
                            <Accordion.Indicator className="text-muted w-5 h-5" />
                          </Accordion.Trigger>
                        </Accordion.Heading>
                        <Accordion.Panel className="mt-1">
                          <Accordion.Body className="py-3">
                            <div className="grid gap-3">
                              {gdos.map((gdo, idx) => (
                                <div
                                  key={gdo.gdoId}
                                  className="bg-background/70 rounded-lg p-4 border border-danger-soft opacity-70"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <h4 className="font-bold text-lg">
                                      GDO #{idx + 1}
                                    </h4>
                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-danger-soft text-danger font-semibold text-xs">
                                      {gdo.status}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        GDO ID
                                      </p>
                                      <p className="font-mono text-xs break-all">
                                        {gdo.gdoId}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        Request ID
                                      </p>
                                      <p className="font-mono text-xs break-all">
                                        {gdo.requestId}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        Issue Date
                                      </p>
                                      <p>
                                        {new Date(
                                          gdo.issueDate
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        Expiry Date
                                      </p>
                                      <p>
                                        {new Date(
                                          gdo.expiryDate
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Accordion.Body>
                        </Accordion.Panel>
                      </Accordion.Item>
                    )
                  )}
                </Accordion>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        

        {/* H2 Available */}
        {h2Available.length > 0 && (
          <Accordion.Item key="h2-available">
            <Accordion.Heading>
              <Accordion.Trigger className="group flex items-center gap-4 bg-linear-to-r from-surface to-background border border-muted/30 hover:shadow-lg transition-all duration-300 px-5 py-4 rounded-xl w-full shadow-md">
                <HydrogenIcon className="w-8 h-8" />
                <div className="flex-1 text-left flex items-center">
                  <span className="text-xl font-bold">H2 GDOs - Available</span>
                  <span className="ml-3 inline-flex items-center justify-center min-w-8 h-8 rounded-full bg-success-soft text-success font-semibold text-sm">
                    {h2Available.length}
                  </span>
                </div>
                <Accordion.Indicator className="text-muted w-6 h-6" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel className="mt-2">
              <Accordion.Body className="border border-muted/30 rounded-xl bg-surface/30 p-6">
                <Accordion
                  className="w-full"
                  variant="surface"
                >
                  {groupGdosByRequest(h2Available).map(([requestId, gdos]) => (
                    <Accordion.Item key={`req-${requestId}`}>
                      <Accordion.Heading>
                        <Accordion.Trigger className="group flex items-center gap-3 bg-surface/50 border px-4 py-3 rounded-lg w-full">
                          <div className="flex-1 text-left">
                            <span className="text-base font-semibold">
                              Request: {requestId.slice(0, 8)}...
                            </span>
                            <p className="text-xs text-muted mt-1">
                              {gdos.length} GDO{gdos.length > 1 ? "s" : ""}
                            </p>
                          </div>
                          <Accordion.Indicator className="text-muted w-5 h-5" />
                        </Accordion.Trigger>
                      </Accordion.Heading>
                      <Accordion.Panel className="mt-1">
                        <Accordion.Body className="y-3">
                          <div className="grid gap-3">
                            {gdos.map((gdo, idx) => (
                              <div
                                key={gdo.gdoId}
                                className="bg-background/70 rounded-lg p-4"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <h4 className="font-bold text-lg">
                                    GDO #{idx + 1}
                                  </h4>
                                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-success-soft text-success font-semibold text-xs">
                                    {gdo.status}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-muted font-semibold mb-1">
                                      GDO ID
                                    </p>
                                    <p className="font-mono text-xs break-all">
                                      {gdo.gdoId}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted font-semibold mb-1">
                                      Request ID
                                    </p>
                                    <p className="font-mono text-xs break-all">
                                      {gdo.requestId}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted font-semibold mb-1">
                                      Issue Date
                                    </p>
                                    <p>
                                      {new Date(
                                        gdo.issueDate
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-muted font-semibold mb-1">
                                      Expiry Date
                                    </p>
                                    <p>
                                      {new Date(
                                        gdo.expiryDate
                                      ).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Accordion.Body>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        )}

        {/* H2 Unavailable */}
        {h2Unavailable.length > 0 && (
          <Accordion.Item key="h2-unavailable">
            <Accordion.Heading>
              <Accordion.Trigger className="group flex items-center gap-4 bg-linear-to-r from-surface to-background border border-muted/30 hover:shadow-lg transition-all duration-300 px-5 py-4 rounded-xl w-full shadow-md">
                <HydrogenIcon className="w-8 h-8 opacity-50" />
                <div className="flex-1 text-left flex items-center">
                  <span className="text-xl font-bold">H2 GDOs - Used</span>
                  <span className="ml-3 inline-flex items-center justify-center min-w-8 h-8 rounded-full border-danger-soft text-danger font-semibold text-sm">
                    {h2Unavailable.length}
                  </span>
                </div>
                <Accordion.Indicator className="text-muted w-6 h-6" />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel className="mt-2">
              <Accordion.Body className="border border-muted/30 rounded-xl bg-surface/30 p-6">
                <Accordion
                  className="w-full"
                  variant="surface"
                >
                  {groupGdosByRequest(h2Unavailable).map(
                    ([requestId, gdos]) => (
                      <Accordion.Item key={`req-${requestId}`}>
                        <Accordion.Heading>
                          <Accordion.Trigger className="group flex items-center gap-3 bg-surface/50 border border-danger-soft px-4 py-3 rounded-lg w-full opacity-70">
                            <div className="flex-1 text-left">
                              <span className="text-base font-semibold">
                                Request: {requestId.slice(0, 8)}...
                              </span>
                              <p className="text-xs text-muted mt-1">
                                {gdos.length} GDO{gdos.length > 1 ? "s" : ""}
                              </p>
                            </div>
                            <Accordion.Indicator className="text-muted w-5 h-5" />
                          </Accordion.Trigger>
                        </Accordion.Heading>
                        <Accordion.Panel className="mt-1">
                          <Accordion.Body className="py-3 border border-muted/20 rounded-lg bg-background/70">
                            <div className="grid gap-3">
                              {gdos.map((gdo, idx) => (
                                <div
                                  key={gdo.gdoId}
                                  className="bg-background/70 rounded-lg p-4 border border-danger-soft opacity-70"
                                >
                                  <div className="flex items-start justify-between mb-3">
                                    <h4 className="font-bold text-lg">
                                      GDO #{idx + 1}
                                    </h4>
                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-danger-soft text-danger font-semibold text-xs">
                                      {gdo.status}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        GDO ID
                                      </p>
                                      <p className="font-mono text-xs break-all">
                                        {gdo.gdoId}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        Request ID
                                      </p>
                                      <p className="font-mono text-xs break-all">
                                        {gdo.requestId}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        Issue Date
                                      </p>
                                      <p>
                                        {new Date(
                                          gdo.issueDate
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted font-semibold mb-1">
                                        Expiry Date
                                      </p>
                                      <p>
                                        {new Date(
                                          gdo.expiryDate
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Accordion.Body>
                        </Accordion.Panel>
                      </Accordion.Item>
                    )
                  )}
                </Accordion>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        )}
      </Accordion>
    </div>
  );
}
