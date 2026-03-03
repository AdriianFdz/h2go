"use client";

import { useAuth } from "@/app/hooks/useAuth";
import { GdoBalance } from "@/app/types/gdoBalance";
import { GDO, GDOStatus } from "@/app/types/gdo";
import {
  Accordion,
  Button,
  Modal,
  Spinner,
  Checkbox,
  Label,
  toast,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ElectricityIcon, HydrogenIcon } from "@/app/components/icons";
import { OrganizationType } from "@/app/types/organization";
import { AssetType } from "@/app/types/assetType";
import { AssetTypeSelector } from "@/app/components/assetTypeSelector";

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

  // Redeem modal states
  const [selectedProducerId, setSelectedProducerId] = useState<string>("");
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType>(
    AssetType.H2
  );
  const [availableGdos, setAvailableGdos] = useState<GDO[]>([]);
  const [selectedGdoIds, setSelectedGdoIds] = useState<string[]>([]);
  const [loadingGdos, setLoadingGdos] = useState(false);
  const [isSubmittingRedeem, setIsSubmittingRedeem] = useState(false);

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

  useEffect(() => {
    if (!selectedProducerId) {
      setAvailableGdos([]);
      return;
    }

    const loadGdos = async () => {
      setLoadingGdos(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${selectedProducerId}/balance`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          const assetTypeKey = selectedAssetType as keyof typeof data.gdos;
          const gdos = data.gdos[assetTypeKey]?.available || [];
          setAvailableGdos(gdos);
        } else {
          toast.danger("Failed to fetch GDOs.", { timeout: 4000 });
          setAvailableGdos([]);
        }
      } catch (error) {
        console.error("Error fetching GDOs:", error);
        toast.danger("An error occurred while fetching GDOs.", {
          timeout: 4000,
        });
        setAvailableGdos([]);
      } finally {
        setLoadingGdos(false);
      }
    };

    loadGdos();
  }, [selectedProducerId, selectedAssetType]);

  const toggleGdoSelection = (gdoId: string) => {
    setSelectedGdoIds((prev) => {
      if (prev.includes(gdoId)) {
        return prev.filter((id) => id !== gdoId);
      } else {
        return [...prev, gdoId];
      }
    });
  };

  const handleRedeemSubmit = async () => {
    if (!selectedProducerId) {
      toast.danger("Please select a producer.", { timeout: 4000 });
      return;
    }

    if (selectedGdoIds.length === 0) {
      toast.danger("Please select at least one GDO.", { timeout: 4000 });
      return;
    }

    setIsSubmittingRedeem(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${selectedProducerId}/redemption`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gdosToRedeem: selectedGdoIds,
            assetType: selectedAssetType,
          }),
        }
      );

      if (response.ok) {
        toast.success("GDOs redeemed successfully!", { timeout: 4000 });
        setSelectedGdoIds([]);
        setAvailableGdos([]);
        const fetchBalances = async () => {
          setLoadingBalance(true);
          try {
            const isTrader =
              user?.organization?.type === OrganizationType.TRADER;
            const orgsToFetch =
              isTrader && authorizedByOrgs.length > 0
                ? authorizedByOrgs
                : [user?.organization?.id].filter(
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
            setBalances(
              results.filter((b) => b !== null) as OrganizationBalance[]
            );
          } catch (error) {
            console.error("Error fetching balances:", error);
          } finally {
            setLoadingBalance(false);
          }
        };
        fetchBalances();
      } else {
        const errorText = await response.text();
        toast.danger(`Failed to redeem GDOs: ${errorText}`, { timeout: 4000 });
      }
    } catch (error) {
      console.error("Error redeeming GDOs:", error);
      toast.danger("An error occurred while redeeming GDOs.", {
        timeout: 4000,
      });
    } finally {
      setIsSubmittingRedeem(false);
    }
  };

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

  if (!isTrader) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted">
          This page is only accessible to trader or producer organizations.
        </p>
      </div>
    );
  }
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

      {/* Redeem Modal */}
      <Modal>
        <Button
          size="lg"
          className="w-full h-15 text-xl font-bold mt-8"
          onClick={() => {
            if (isTrader && balances.length > 0) {
              setSelectedProducerId(balances[0].organizationId);
            } else if (!isTrader && user?.organization?.id) {
              setSelectedProducerId(user.organization.id);
            }
            setSelectedAssetType(AssetType.H2);
            setSelectedGdoIds([]);
            setAvailableGdos([]);
          }}
        >
          Redeem GDOs
        </Button>
        <Modal.Backdrop variant="blur">
          <Modal.Container>
            <Modal.Dialog className="bg-surface border border-muted/30 max-w-4xl">
              <Modal.CloseTrigger />
              <Modal.Header className="border-b border-muted/20 p-6">
                <h2 className="text-2xl font-bold">Redeem GDOs</h2>
                <p className="text-sm text-muted mt-1">
                  Select the GDOs you want to redeem
                </p>
              </Modal.Header>
              <Modal.Body className="p-6 space-y-4">
                {isTrader && balances.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">
                      Select Producer
                    </Label>
                    <select
                      value={selectedProducerId}
                      onChange={(e) => {
                        setSelectedProducerId(e.target.value);
                        setSelectedGdoIds([]);
                      }}
                      className="w-full px-4 py-3 bg-background border border-muted/30 rounded-lg focus:border-accent focus:outline-none text-base"
                      disabled={isSubmittingRedeem}
                    >
                      {balances.map((org: OrganizationBalance) => (
                        <option
                          key={org.organizationId}
                          value={org.organizationId}
                        >
                          {org.organizationName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Asset Type Selector */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">
                    Filter by Asset Type
                  </Label>
                  <AssetTypeSelector
                    value={selectedAssetType}
                    onChange={(value) => {
                      setSelectedAssetType(value);
                      setSelectedGdoIds([]);
                    }}
                  />
                </div>

                {/* GDO Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">
                      Select GDOs to Redeem
                    </Label>
                    <p className="text-sm text-muted">
                      {selectedGdoIds.length} selected
                    </p>
                  </div>

                  {loadingGdos ? (
                    <div className="flex items-center justify-center py-8">
                      <Spinner size="lg" />
                      <p className="text-sm text-muted ml-3">Loading GDOs...</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto bg-background/50 border border-muted/30 rounded-lg p-3 space-y-2">
                      {availableGdos.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-lg text-muted font-semibold">
                            No GDOs available
                          </p>
                          <p className="text-sm text-muted mt-2">
                            No{" "}
                            {selectedAssetType === AssetType.H2
                              ? "hydrogen"
                              : "electricity"}{" "}
                            GDOs available for redemption.
                          </p>
                        </div>
                      ) : (
                        availableGdos.map((gdo: GDO) => (
                          <div
                            key={gdo.gdoId}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                              selectedGdoIds.includes(gdo.gdoId)
                                ? "bg-accent/10 border-accent"
                                : "bg-background/30 border-muted/30 hover:border-accent/50"
                            }`}
                            onClick={() =>
                              !isSubmittingRedeem &&
                              toggleGdoSelection(gdo.gdoId)
                            }
                          >
                            <Checkbox
                              isSelected={selectedGdoIds.includes(gdo.gdoId)}
                              isReadOnly
                              isDisabled={isSubmittingRedeem}
                              className="pointer-events-none shrink-0"
                            >
                              <Checkbox.Control className="size-5">
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                            </Checkbox>

                            <div className="flex-1">
                              <p className="text-sm font-mono font-semibold">
                                {gdo.gdoId}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted mt-1">
                                <span>
                                  Issued:{" "}
                                  {new Date(gdo.issueDate).toLocaleDateString()}
                                </span>
                                <span>•</span>
                                <span>
                                  Expires:{" "}
                                  {new Date(
                                    gdo.expiryDate
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {selectedAssetType === AssetType.H2 ? (
                                <HydrogenIcon className="w-5 h-5 text-accent" />
                              ) : (
                                <ElectricityIcon className="w-5 h-5 text-yellow-500" />
                              )}
                              <div
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  gdo.status === GDOStatus.ACTIVE
                                    ? "bg-success-soft-hover text-success"
                                    : "bg-muted/20 text-muted"
                                }`}
                              >
                                {gdo.status}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {selectedGdoIds.length > 0 && (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                    <p className="text-sm text-accent font-semibold">
                      You have selected {selectedGdoIds.length} GDO
                      {selectedGdoIds.length > 1 ? "s" : ""} to redeem.
                    </p>
                  </div>
                )}

                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                  <p className="text-sm text-warning font-semibold">
                    ⚠️ This action cannot be undone. Redeemed GDOs will be
                    marked as used.
                  </p>
                </div>
              </Modal.Body>
              <Modal.Footer className="border-t border-muted/20 p-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 font-bold"
                  slot="close"
                  isDisabled={isSubmittingRedeem}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleRedeemSubmit}
                  isDisabled={
                    isSubmittingRedeem ||
                    selectedGdoIds.length === 0 ||
                    !selectedProducerId
                  }
                  className="flex-1 h-12 font-bold bg-accent hover:bg-accent/90"
                >
                  {isSubmittingRedeem ? (
                    <Spinner size="sm" />
                  ) : (
                    `Redeem ${selectedGdoIds.length > 0 ? `(${selectedGdoIds.length})` : ""}`
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
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
            <Accordion.Trigger className="group flex items-center gap-4 bg-success/10 border border-success-soft px-5 py-4 rounded-xl w-full">
              <ElectricityIcon className="w-8 h-8 text-success" />
              <div className="flex-1 text-left flex items-center">
                <span className="text-xl font-bold text-success">
                  Electricity GDOs - Available
                </span>
                <span className="ml-3 inline-flex items-center justify-center min-w-8 h-8 rounded-full bg-success-soft text-success font-semibold text-sm">
                  {electricityAvailable.length}
                </span>
              </div>
              <Accordion.Indicator className="text-success w-6 h-6" />
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
                              Request: {requestId}...
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
                                className="bg-background/70 rounded-lg p-4 border border-muted/20"
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
            <Accordion.Trigger className="group flex items-center gap-4 bg-danger/10 border border-danger-soft px-5 py-4 rounded-xl w-full">
              <ElectricityIcon className="w-8 h-8 text-danger opacity-80" />
              <div className="flex-1 text-left flex items-center">
                <span className="text-xl font-bold text-danger">
                  Electricity GDOs - Used
                </span>
                <span className="ml-3 inline-flex items-center justify-center min-w-8 h-8 rounded-full bg-danger-soft text-danger font-semibold text-sm">
                  {electricityUnavailable.length}
                </span>
              </div>
              <Accordion.Indicator className="text-danger w-6 h-6" />
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
                        <Accordion.Trigger className="group flex items-center gap-3 bg-surface/50 border border-muted/20 px-4 py-3 rounded-lg w-full">
                          <div className="flex-1 text-left">
                            <span className="text-base font-semibold">
                              Request: {requestId}...
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
                                className="bg-background/70 rounded-lg p-4 border border-muted/20"
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
        <Accordion.Item key="h2-available">
          <Accordion.Heading>
            <Accordion.Trigger className="group flex items-center gap-4 bg-success/10 border border-success-soft px-5 py-4 rounded-xl w-full">
              <HydrogenIcon className="w-8 h-8 text-success" />
              <div className="flex-1 text-left flex items-center">
                <span className="text-xl font-bold text-success">
                  H2 GDOs - Available
                </span>
                <span className="ml-3 inline-flex items-center justify-center min-w-8 h-8 rounded-full bg-success-soft text-success font-semibold text-sm">
                  {h2Available.length}
                </span>
              </div>
              <Accordion.Indicator className="text-success w-6 h-6" />
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
                              className="bg-background/70 rounded-lg p-4 border border-muted/20"
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

        {/* H2 Unavailable */}
        <Accordion.Item key="h2-unavailable">
          <Accordion.Heading>
            <Accordion.Trigger className="group flex items-center gap-4 bg-danger/10 border border-danger-soft px-5 py-4 rounded-xl w-full">
              <HydrogenIcon className="w-8 h-8 text-danger opacity-80" />
              <div className="flex-1 text-left flex items-center">
                <span className="text-xl font-bold text-danger">
                  H2 GDOs - Used
                </span>
                <span className="ml-3 inline-flex items-center justify-center min-w-8 h-8 rounded-full bg-danger-soft text-danger font-semibold text-sm">
                  {h2Unavailable.length}
                </span>
              </div>
              <Accordion.Indicator className="text-danger w-6 h-6" />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel className="mt-2">
            <Accordion.Body className="border border-muted/30 rounded-xl bg-surface/30 p-6">
              <Accordion
                className="w-full"
                variant="surface"
              >
                {groupGdosByRequest(h2Unavailable).map(([requestId, gdos]) => (
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
                              className="bg-background/70 rounded-lg p-4 border border-muted/20"
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
                ))}
              </Accordion>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}
