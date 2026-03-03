"use client";

import {
  Accordion,
  Button,
  Checkbox,
  Description,
  FieldError,
  InputGroup,
  InputGroupInput,
  Label,
  ListBox,
  ListBoxItem,
  Modal,
  NumberField,
  Select,
  Spinner,
  Tabs,
  TextField,
  toast,
} from "@heroui/react";
import {
  CircleCheckIcon,
  DangerTriangleIcon,
  DownArrowIcon,
  ElectricityIcon,
  HydrogenIcon,
  OrganizationIcon,
  PlusCircleIcon,
  TradeIcon,
} from "@/app/components/icons";
import { useAuth } from "@/app/hooks/useAuth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AssetType } from "@/app/types/assetType";
import { OrganizationType } from "@/app/types/organization";
import { AssetTypeSelector } from "@/app/components/assetTypeSelector";
import { TradeRequest } from "@/app/types/tradeRequest";
import { GDO, GDOStatus } from "@/app/types/gdo";

interface ProducerInfo {
  id: string;
  name: string;
}

export default function GdosOperationsPage() {
  const { user, isLoading, authorizedByOrgs } = useAuth();
  const router = useRouter();

  // Producer info state
  const [producers, setProducers] = useState<ProducerInfo[]>([]);
  const [loadingProducers, setLoadingProducers] = useState(false);

  // Trade requests state
  const [tradeRequestsByProducer, setTradeRequestsByProducer] = useState<
    Record<string, TradeRequest[]>
  >({});
  const [loadingTradeRequests, setLoadingTradeRequests] = useState<
    Record<string, boolean>
  >({});

  // Expedition form states
  const [expeditionProducerId, setExpeditionProducerId] = useState<string>("");
  const [expeditionAssetType, setExpeditionAssetType] = useState<AssetType>(
    AssetType.H2
  );
  const [expeditionAmount, setExpeditionAmount] = useState("");
  const [isSubmittingExpedition, setIsSubmittingExpedition] = useState(false);

  // Trade form states
  const [tradeSourceProducerId, setTradeSourceProducerId] =
    useState<string>("");
  const [tradeTargetProducerId, setTradeTargetProducerId] =
    useState<string>("");
  const [tradeAssetType, setTradeAssetType] = useState<AssetType>(AssetType.H2);
  const [tradeAmount, setTradeAmount] = useState("");
  const [isSubmittingTrade, setIsSubmittingTrade] = useState(false);

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<TradeRequest | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    canApprove: boolean;
  } | null>(null);

  // GDO selection states
  const [availableGdos, setAvailableGdos] = useState<GDO[]>([]);
  const [selectedGdoIds, setSelectedGdoIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user || authorizedByOrgs.length === 0) return;

    const fetchProducersInfo = async () => {
      setLoadingProducers(true);
      try {
        const producerPromises = authorizedByOrgs.map(async (orgId) => {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${orgId}`,
            {
              method: "GET",
              credentials: "include",
            }
          );

          if (response.ok) {
            const data = await response.json();
            return {
              id: orgId,
              name: data.name || orgId,
            };
          }
          return { id: orgId, name: orgId };
        });

        const results = await Promise.all(producerPromises);
        setProducers(results);
      } catch (error) {
        console.error("Error fetching producers info:", error);
      } finally {
        setLoadingProducers(false);
      }
    };

    fetchProducersInfo();
  }, [user, authorizedByOrgs]);

  if (isLoading) {
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
          This page is only accessible to trader organizations.
        </p>
      </div>
    );
  }

  const handleExpeditionSubmit = async () => {
    setIsSubmittingExpedition(true);
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/transformation`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          producerId: expeditionProducerId,
          assetType: expeditionAssetType,
          amount: parseInt(expeditionAmount),
        }),
      }
    )
      .then((response) => {
        if (response.ok) {
          toast.success("Request submitted successfully!", { timeout: 4000 });
          setExpeditionProducerId("");
          setExpeditionAssetType(AssetType.H2);
          setExpeditionAmount("");
        } else {
          toast.danger("Failed to submit request.", { timeout: 4000 });
        }
      })
      .catch(() => {
        toast.danger("An error occurred while submitting the request.", {
          timeout: 4000,
        });
      })
      .finally(() => {
        setIsSubmittingExpedition(false);
      });
  };

  const handleTradeSubmit = async () => {
    setIsSubmittingTrade(true);

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/trades`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceProducerID: tradeSourceProducerId,
        targetProducerID: tradeTargetProducerId,
        assetType: tradeAssetType,
        amount: parseInt(tradeAmount),
      }),
    })
      .then((response) => {
        if (response.ok) {
          toast.success("Trade request submitted successfully!", {
            timeout: 4000,
          });
        } else {
          toast.danger("Failed to submit trade request.", { timeout: 4000 });
        }
      })
      .catch(() => {
        toast.danger("An error occurred while submitting the trade request.", {
          timeout: 4000,
        });
      });
    setTradeSourceProducerId("");
    setTradeTargetProducerId("");
    setTradeAssetType(AssetType.H2);
    setTradeAmount("");
    setIsSubmittingTrade(false);
  };

  const fetchTradeRequestsForProducer = async (producerId: string) => {
    if (
      loadingTradeRequests[producerId] ||
      tradeRequestsByProducer[producerId]
    ) {
      return;
    }

    setLoadingTradeRequests((prev) => ({ ...prev, [producerId]: true }));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/trades/producer/${producerId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTradeRequestsByProducer((prev) => ({
          ...prev,
          [producerId]: data,
        }));
      } else {
        const errorText = await response.text();
        console.error(
          `Failed to fetch trade requests for producer ${producerId}:`,
          response.status,
          response.statusText,
          errorText
        );
        setTradeRequestsByProducer((prev) => ({
          ...prev,
          [producerId]: [],
        }));
      }
    } catch (error) {
      console.error("Error fetching trade requests:", error);
      setTradeRequestsByProducer((prev) => ({
        ...prev,
        [producerId]: [],
      }));
    } finally {
      setLoadingTradeRequests((prev) => ({ ...prev, [producerId]: false }));
    }
  };

  const validateRequest = async (producerId: string, request: TradeRequest) => {
    setValidationLoading(true);
    setSelectedGdoIds([]);
    setAvailableGdos([]);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${producerId}/balance`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        const assetTypeKey = request.assetType as keyof typeof data.gdos;
        const gdos = data.gdos[assetTypeKey]?.available || [];
        setAvailableGdos(gdos);

        const canApprove = gdos.length >= request.amount;
        setValidationResult({ canApprove });
      } else {
        setValidationResult({ canApprove: false });
        toast.danger("Failed to fetch producer GDOs.", { timeout: 4000 });
      }
    } catch (error) {
      console.error("Error validating request:", error);
      setValidationResult({ canApprove: false });
      toast.danger("An error occurred while validating the request.", {
        timeout: 4000,
      });
    } finally {
      setValidationLoading(false);
    }
  };

  const toggleGdoSelection = (gdoId: string) => {
    setSelectedGdoIds((prev) => {
      if (prev.includes(gdoId)) {
        return prev.filter((id) => id !== gdoId);
      } else {
        if (selectedRequest && prev.length < selectedRequest.amount) {
          return [...prev, gdoId];
        }
        return prev;
      }
    });
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    if (selectedGdoIds.length !== selectedRequest.amount) {
      toast.danger(
        `You must select exactly ${selectedRequest.amount} GDO(s).`,
        { timeout: 4000 }
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/trades/${selectedRequest.tradeID}/approve`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gdoIds: selectedGdoIds,
          }),
        }
      );

      if (response.ok) {
        toast.success("Trade request approved successfully!", {
          timeout: 4000,
        });
        setTradeRequestsByProducer((prev) => {
          const updated = { ...prev };
          if (updated[selectedRequest.targetID]) {
            updated[selectedRequest.targetID] = updated[
              selectedRequest.targetID
            ].filter((r) => r.tradeID !== selectedRequest.tradeID);
          }
          return updated;
        });
        setSelectedRequest(null);
        setSelectedGdoIds([]);
        setAvailableGdos([]);
        setIsModalOpen(false);
      } else {
        const errorText = await response.text();
        toast.danger(`Failed to approve request: ${errorText}`, {
          timeout: 4000,
        });
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast.danger("An error occurred while approving the request.", {
        timeout: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/trades/${selectedRequest.tradeID}/reject`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success("Trade request rejected successfully!", {
          timeout: 4000,
        });
        setTradeRequestsByProducer((prev) => {
          const updated = { ...prev };
          if (updated[selectedRequest.targetID]) {
            updated[selectedRequest.targetID] = updated[
              selectedRequest.targetID
            ].filter((r) => r.tradeID !== selectedRequest.tradeID);
          }
          return updated;
        });
        setSelectedRequest(null);
        setSelectedGdoIds([]);
        setAvailableGdos([]);
        setIsModalOpen(false);
      } else {
        const errorText = await response.text();
        toast.danger(`Failed to reject request: ${errorText}`, {
          timeout: 4000,
        });
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.danger("An error occurred while rejecting the request.", {
        timeout: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-32 pr-10">
      <h1 className="text-4xl font-bold mb-4">GDO Operations</h1>
      <p className="text-muted text-lg mb-8">
        Request new GDOs or redeem existing ones from authorized producers.
      </p>

      {/* Tabs */}
      <Tabs
        defaultSelectedKey="request"
        variant="secondary"
      >
        <Tabs.ListContainer className="mb-8">
          <Tabs.List className="w-full">
            <Tabs.Tab
              id="request"
              className="flex-1 flex items-center justify-center gap-3 text-xl pb-3"
            >
              <PlusCircleIcon />
              Request GDOs
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab
              id="trade"
              className="flex-1 flex items-center justify-center gap-3 text-xl pb-3"
            >
              <TradeIcon />
              Trade GDOs
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab
              id="pending"
              className="flex-1 flex items-center justify-center gap-3 text-xl pb-3"
            >
              <CircleCheckIcon />
              Pending Requests
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* Request Tab Content */}
        <Tabs.Panel id="request">
          <div className="bg-surface border border-muted/30 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <PlusCircleIcon className="w-18 h-18 p-4 text-accent bg-accent-soft rounded-2xl" />
              <div>
                <h2 className="text-2xl font-bold">Request GDOs</h2>
                <p className="text-muted">Create a new request for GDOs</p>
              </div>
            </div>

            {authorizedByOrgs.length === 0 ? (
              <div className="text-center py-12 bg-background/30 rounded-xl border border-muted/20">
                <OrganizationIcon className="w-16 h-16 mx-auto mb-4 text-muted" />
                <p className="text-xl font-bold mb-2">
                  No Authorized Producers
                </p>
                <p className="text-muted">
                  You need to be authorized by at least one producer to request
                  GDOs.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Producer Selection */}
                <TextField
                  isRequired
                  name="producer"
                >
                  <Label className="text-base font-semibold">
                    Select Producer
                  </Label>
                  {loadingProducers ? (
                    <div className="flex items-center justify-center p-8 bg-background/50 rounded-xl border border-muted/30">
                      <Spinner
                        size="sm"
                        className="text-muted"
                      />
                      <span className="ml-3 text-muted">
                        Loading producers...
                      </span>
                    </div>
                  ) : (
                    <Select
                      selectedKey={expeditionProducerId}
                      onSelectionChange={(key) =>
                        setExpeditionProducerId(key as string)
                      }
                      placeholder="Choose a producer..."
                      className="w-full"
                    >
                      <Select.Trigger className="flex items-center h-13 px-4 bg-background border border-muted/30 text-foreground hover:border-accent/50 focus:outline-none focus:border-accent transition-colors">
                        <Select.Value className="flex-1 text-left" />
                        <Select.Indicator>
                          <DownArrowIcon className="w-5 h-5 text-muted" />
                        </Select.Indicator>
                      </Select.Trigger>
                      <Select.Popover className="bg-surface border border-muted/30">
                        <ListBox className="p-1">
                          {producers.map((producer) => (
                            <ListBoxItem
                              key={producer.id}
                              id={producer.id}
                              textValue={producer.name}
                              className="px-3 py-2 cursor-pointer"
                            >
                              {producer.name}
                            </ListBoxItem>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                  <FieldError />
                </TextField>

                {/* Selected Producer Info */}
                {expeditionProducerId && (
                  <div className="mt-3 p-4 bg-accent/5 border border-accent-soft rounded-4xl">
                    <div className="flex items-center gap-3">
                      <OrganizationIcon className="w-8 h-8 text-accent shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold text-sm text-muted">
                          Selected Producer
                        </p>
                        <p className="font-bold">
                          {
                            producers.find((p) => p.id === expeditionProducerId)
                              ?.name
                          }
                        </p>
                        <p className="text-xs text-muted font-mono mt-1">
                          {expeditionProducerId}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Asset Type Selection */}
                <AssetTypeSelector
                  value={expeditionAssetType}
                  onChange={setExpeditionAssetType}
                  isRequired
                />

                {/* Amount Input */}
                <NumberField
                  isRequired
                  name="amount"
                  value={
                    expeditionAmount ? parseInt(expeditionAmount) : undefined
                  }
                  onChange={(value) =>
                    setExpeditionAmount(value?.toString() || "")
                  }
                  minValue={1}
                >
                  <Label className="text-base font-semibold">Amount</Label>
                  <NumberField.Group className="h-13 bg-background/50 border border-muted/30">
                    <NumberField.DecrementButton />
                    <NumberField.Input
                      placeholder="Enter amount"
                      className="text-foreground px-4"
                    />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                  <Description className="text-sm text-muted mt-2">
                    Number of GDOs to request
                  </Description>
                  <FieldError />
                </NumberField>

                {/* Submit Button */}
                <Button
                  fullWidth
                  onClick={handleExpeditionSubmit}
                  isDisabled={
                    isSubmittingExpedition ||
                    !expeditionProducerId ||
                    !expeditionAmount ||
                    parseInt(expeditionAmount) <= 0
                  }
                  className="h-14 text-xl font-bold bg-accent hover:bg-accent/90"
                >
                  {isSubmittingExpedition ? (
                    <div className="flex items-center gap-3">
                      <Spinner
                        size="md"
                        className="text-(--button-fg)"
                      />
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </div>
            )}
          </div>
        </Tabs.Panel>
        {/* Trade Tab Content */}
        <Tabs.Panel id="trade">
          <div className="bg-surface border border-muted/30 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center gap-4 mb-6">
              <TradeIcon className="w-18 h-18 p-4 text-accent bg-accent-soft rounded-2xl" />
              <div>
                <h2 className="text-2xl font-bold">Trade GDOs</h2>
                <p className="text-muted">
                  Request GDO transfer between producers
                </p>
              </div>
            </div>

            {authorizedByOrgs.length === 0 ? (
              <div className="text-center py-12 bg-background/30 border border-muted/20">
                <OrganizationIcon className="w-16 h-16 mx-auto mb-4 text-muted" />
                <p className="text-xl font-bold mb-2">
                  No Authorized Producers
                </p>
                <p className="text-muted">
                  You need to be authorized by at least one producer to trade
                  GDOs.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Source Producer Selection */}
                <TextField
                  isRequired
                  name="sourceProducer"
                >
                  <Label className="text-base font-semibold">
                    Source Producer
                  </Label>
                  {loadingProducers ? (
                    <div className="flex items-center justify-center p-8 bg-background/50 border border-muted/30 rounded-4xl">
                      <Spinner
                        size="sm"
                        className="text-muted"
                      />
                      <span className="ml-3 text-muted">
                        Loading producers...
                      </span>
                    </div>
                  ) : (
                    <Select
                      selectedKey={tradeSourceProducerId}
                      onSelectionChange={(key) => {
                        setTradeAmount("");
                        setTradeSourceProducerId(key as string);
                      }}
                      placeholder="Choose source producer..."
                      className="w-full"
                    >
                      <Select.Trigger className="flex items-center h-13 px-4 bg-background border border-muted/30 text-foreground hover:border-accent/50 focus:outline-none focus:border-accent transition-colors">
                        <Select.Value className="flex-1 text-left" />
                        <Select.Indicator>
                          <DownArrowIcon className="w-5 h-5 text-muted" />
                        </Select.Indicator>
                      </Select.Trigger>
                      <Select.Popover className="bg-surface border border-muted/30">
                        <ListBox className="p-1">
                          {producers.map((producer) => (
                            <ListBoxItem
                              key={producer.id}
                              id={producer.id}
                              textValue={producer.name}
                              className="px-3 py-2 cursor-pointer"
                            >
                              {producer.name}
                            </ListBoxItem>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                  <FieldError />
                </TextField>

                {/* Selected Source Producer Info */}
                {tradeSourceProducerId && (
                  <div className="mt-3 p-4 bg-accent/5 border border-accent-soft rounded-4xl flex items-center gap-3">
                    <OrganizationIcon className="w-8 h-8 text-accent shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-sm text-muted">
                        Source Producer
                      </p>
                      <p className="font-bold">
                        {
                          producers.find((p) => p.id === tradeSourceProducerId)
                            ?.name
                        }
                      </p>
                      <p className="text-xs text-muted font-mono mt-1">
                        {tradeSourceProducerId}
                      </p>
                    </div>
                  </div>
                )}

                {/* Target Producer Input */}
                <TextField
                  isRequired
                  name="targetProducer"
                  value={tradeTargetProducerId}
                  onChange={setTradeTargetProducerId}
                >
                  <Label className="text-base font-semibold">
                    Target Producer ID
                  </Label>
                  <InputGroup className="h-13 bg-background border border-muted/30">
                    <InputGroupInput
                      placeholder="Enter target producer organization ID"
                      className="px-4 text-foreground"
                    />
                  </InputGroup>
                  <Description className="text-sm text-muted mt-2">
                    The producer ID from which you want to receive GDOs.
                  </Description>
                  <FieldError />
                </TextField>

                {/* Asset Type Selection */}
                <AssetTypeSelector
                  value={tradeAssetType}
                  onChange={(type) => {
                    setTradeAmount("");
                    setTradeAssetType(type);
                  }}
                  isRequired
                />

                {/* Amount Input */}
                <NumberField
                  isRequired
                  name="tradeAmount"
                  defaultValue={undefined}
                  onChange={(value) => setTradeAmount(value?.toString() || "")}
                  minValue={1}
                >
                  <Label className="text-base font-semibold">Amount</Label>
                  <NumberField.Group className="h-13 bg-background/50 border border-muted/30">
                    <NumberField.DecrementButton />
                    <NumberField.Input
                      placeholder="Enter amount"
                      className="text-foreground px-4"
                    />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                  <Description className="text-sm text-muted mt-2">
                    Number of GDOs to request
                  </Description>
                  <FieldError />
                </NumberField>

                {/* Submit Button */}
                <Button
                  fullWidth
                  onClick={handleTradeSubmit}
                  isDisabled={
                    isSubmittingTrade ||
                    !tradeSourceProducerId ||
                    !tradeTargetProducerId ||
                    !tradeAmount ||
                    parseInt(tradeAmount) <= 0
                  }
                  className="h-14 text-xl font-bold bg-accent hover:bg-accent/90"
                >
                  {isSubmittingTrade ? (
                    <div className="flex items-center gap-3">
                      <Spinner
                        size="md"
                        className="text-(--button-fg)"
                      />
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    "Submit Trade Request"
                  )}
                </Button>
              </div>
            )}
          </div>
        </Tabs.Panel>
        {/* Pending Requests Tab Content */}
        <Tabs.Panel id="pending">
          <div className="space-y-6">
            <div className="bg-surface border border-muted/30 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <CircleCheckIcon className="w-18 h-18 p-4 text-accent bg-accent-soft rounded-2xl" />
                <div>
                  <h2 className="text-2xl font-bold">Pending Requests</h2>
                  <p className="text-muted">
                    Answer a pending request from other traders
                  </p>
                </div>
              </div>

              {authorizedByOrgs.length === 0 ? (
                <div className="text-center py-12 bg-background/30 rounded-xl border border-muted/20">
                  <DangerTriangleIcon className="w-16 h-16 mx-auto mb-4 text-muted" />
                  <p className="text-xl font-bold mb-2">
                    No Authorized Producers
                  </p>
                  <p className="text-muted">
                    You need to be authorized by at least one producer to redeem
                    GDOs.
                  </p>
                </div>
              ) : (
                <Accordion
                  className="w-full"
                  variant="surface"
                >
                  {producers.map((producer) => (
                    <Accordion.Item
                      key={producer.id}
                      onExpandedChange={(isExpanded) => {
                        if (isExpanded) {
                          fetchTradeRequestsForProducer(producer.id);
                        }
                      }}
                    >
                      <Accordion.Heading>
                        <Accordion.Trigger className="group flex items-center gap-4 bg-background/50 border border-muted/30 hover:border-accent-hover px-5 py-4 rounded-xl w-full transition-all">
                          <OrganizationIcon className="w-12 h-12 p-2 text-accent bg-accent-soft rounded-2xl" />
                          <div className="flex-1 text-left">
                            <span className="text-lg font-bold">
                              {producer.name}
                            </span>
                            <p className="text-sm text-muted mt-1 font-mono">
                              {producer.id}
                            </p>
                          </div>
                          <Accordion.Indicator className="text-muted w-6 h-6">
                            <DownArrowIcon />
                          </Accordion.Indicator>
                        </Accordion.Trigger>
                      </Accordion.Heading>
                      <Accordion.Panel className="mt-2">
                        <Accordion.Body className="border border-muted/30 rounded-xl bg-background/30 p-6 space-y-6">
                          {loadingTradeRequests[producer.id] ? (
                            <div className="flex items-center justify-center py-8">
                              <Spinner
                                size="md"
                                className="text-muted"
                              />
                              <span className="ml-3 text-muted">
                                Loading trade requests...
                              </span>
                            </div>
                          ) : tradeRequestsByProducer[producer.id]?.length ===
                            0 ? (
                            <div className="text-center py-8 bg-background/50 rounded-xl border border-muted/20">
                              <TradeIcon className="w-12 h-12 mx-auto mb-3 text-muted" />
                              <p className="text-lg font-semibold mb-1">
                                No Pending Requests
                              </p>
                              <p className="text-muted text-sm">
                                There are no pending trade requests for this
                                producer.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {tradeRequestsByProducer[producer.id]?.map(
                                (request) => (
                                  <div
                                    key={request.tradeID}
                                    className="bg-background border border-muted/30 rounded-xl p-5 hover:border-accent/50 transition-colors"
                                  >
                                    <div className="flex items-start justify-between mb-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <TradeIcon className="w-8 h-8 p-1.5 text-accent bg-accent-soft rounded-lg" />
                                          <div>
                                            <h3 className="text-lg font-bold">
                                              Trade Request
                                            </h3>
                                            <p className="text-xs text-muted font-mono">
                                              {request.tradeID}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <span className="px-3 py-1 text-xs font-semibold bg-warning-soft-hover text-warning rounded-full">
                                        {request.status}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div>
                                        <p className="text-xs text-muted mb-1">
                                          From Producer
                                        </p>
                                        <p className="text-sm font-mono bg-background/50 px-3 py-2 rounded border border-muted/20">
                                          {request.producerID}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted mb-1">
                                          Asset Type
                                        </p>
                                        <div
                                          className={`flex items-center gap-2 px-3 py-2 rounded ${
                                            request.assetType === "ELECTRICITY"
                                              ? "bg-yellow-500/10 border border-yellow-500/30"
                                              : "bg-accent-soft border border-accent-soft"
                                          }`}
                                        >
                                          {request.assetType ===
                                          "ELECTRICITY" ? (
                                            <ElectricityIcon className="w-5 h-5 text-yellow-500" />
                                          ) : (
                                            <HydrogenIcon className="w-5 h-5 text-accent" />
                                          )}
                                          <span
                                            className={`text-sm font-semibold ${
                                              request.assetType ===
                                              "ELECTRICITY"
                                                ? "text-yellow-500"
                                                : "text-accent"
                                            }`}
                                          >
                                            {request.assetType}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div className="flex flex-col items-center">
                                        <p className="text-xs text-muted mb-2">
                                          Amount
                                        </p>
                                        <div
                                          className={`min-w-10 min-h-10 aspect-square rounded-full flex items-center justify-center p-4 ${
                                            request.assetType === "ELECTRICITY"
                                              ? "bg-yellow-500/10 border-2 border-yellow-500/30"
                                              : "bg-accent-soft border-2 border-accent/30"
                                          }`}
                                        >
                                          <p
                                            className={`text-xl font-bold ${
                                              request.assetType ===
                                              "ELECTRICITY"
                                                ? "text-yellow-500"
                                                : "text-accent"
                                            }`}
                                          >
                                            {request.amount.toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-muted mb-1">
                                          Created At
                                        </p>
                                        <p className="text-sm">
                                          {new Date(
                                            request.createdAt
                                          ).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>

                                    <Modal
                                      isOpen={
                                        isModalOpen &&
                                        selectedRequest?.tradeID ===
                                          request.tradeID
                                      }
                                      onOpenChange={(open) => {
                                        setIsModalOpen(open);
                                        if (!open) {
                                          setSelectedRequest(null);
                                          setSelectedGdoIds([]);
                                          setAvailableGdos([]);
                                          setValidationResult(null);
                                        }
                                      }}
                                    >
                                      <Button
                                        fullWidth
                                        className="text-xl font-black h-13 mt-5"
                                        onClick={() => {
                                          setSelectedRequest(request);
                                          validateRequest(producer.id, request);
                                          setIsModalOpen(true);
                                        }}
                                      >
                                        Take Action
                                      </Button>
                                      <Modal.Backdrop variant="blur">
                                        <Modal.Container>
                                          <Modal.Dialog className="bg-surface border border-muted/30 max-w-4xl">
                                            <Modal.CloseTrigger />
                                            <Modal.Header className="border-b border-muted/20 p-6">
                                              <h2 className="text-2xl font-bold">
                                                Take Action on Request
                                              </h2>
                                              <p className="text-sm text-muted font-mono mt-1 break-all">
                                                {selectedRequest?.tradeID}
                                              </p>
                                              {validationLoading ? (
                                                <div className="flex items-center gap-2 mt-3">
                                                  <Spinner size="sm" />
                                                  <p className="text-sm text-muted">
                                                    Loading GDOs...
                                                  </p>
                                                </div>
                                              ) : validationResult ? (
                                                validationResult.canApprove ? (
                                                  <div className="bg-success/10 border border-success/30 rounded-lg p-4 mt-3">
                                                    <p className="text-lg font-bold text-success">
                                                      ✓ Producer has enough GDOs
                                                    </p>
                                                    <p className="text-sm text-muted mt-1">
                                                      Select exactly{" "}
                                                      {selectedRequest?.amount}{" "}
                                                      GDO(s) to approve
                                                    </p>
                                                  </div>
                                                ) : (
                                                  <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 mt-3">
                                                    <p className="text-lg font-bold text-danger">
                                                      ✗ Producer does not have
                                                      enough GDOs
                                                    </p>
                                                  </div>
                                                )
                                              ) : null}
                                            </Modal.Header>
                                            <Modal.Body className="p-6 space-y-4">
                                              {/* GDO Selection */}
                                              {!validationLoading &&
                                                validationResult?.canApprove && (
                                                  <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                      <Label className="text-base font-semibold">
                                                        Select GDOs
                                                      </Label>
                                                      <p className="text-sm text-muted">
                                                        {selectedGdoIds.length}{" "}
                                                        /{" "}
                                                        {
                                                          selectedRequest?.amount
                                                        }{" "}
                                                        selected
                                                      </p>
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto bg-background/50 border border-muted/30 rounded-lg p-3 space-y-2">
                                                      {availableGdos.length ===
                                                      0 ? (
                                                        <p className="text-center text-muted py-4">
                                                          No GDOs available
                                                        </p>
                                                      ) : (
                                                        availableGdos.map(
                                                          (gdo) => (
                                                            <div
                                                              key={gdo.gdoId}
                                                              className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                                                selectedGdoIds.includes(
                                                                  gdo.gdoId
                                                                )
                                                                  ? "bg-accent/10 border-accent"
                                                                  : "bg-background/30 border-muted/30 hover:border-accent/50"
                                                              }`}
                                                              onClick={() =>
                                                                !isSubmitting &&
                                                                toggleGdoSelection(
                                                                  gdo.gdoId
                                                                )
                                                              }
                                                            >
                                                              <Checkbox
                                                                isSelected={selectedGdoIds.includes(
                                                                  gdo.gdoId
                                                                )}
                                                                isReadOnly
                                                                isDisabled={
                                                                  isSubmitting
                                                                }
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
                                                                    {new Date(
                                                                      gdo.issueDate
                                                                    ).toLocaleDateString()}
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
                                                              <div
                                                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                                                  gdo.status ===
                                                                  GDOStatus.ACTIVE
                                                                    ? "bg-success-soft-hover text-success"
                                                                    : "bg-muted/20 text-muted"
                                                                }`}
                                                              >
                                                                {gdo.status}
                                                              </div>
                                                            </div>
                                                          )
                                                        )
                                                      )}
                                                    </div>
                                                    {selectedGdoIds.length !==
                                                      selectedRequest?.amount && (
                                                      <p className="text-sm text-warning">
                                                        ⚠️ You must select
                                                        exactly{" "}
                                                        {
                                                          selectedRequest?.amount
                                                        }{" "}
                                                        GDO(s) to approve
                                                      </p>
                                                    )}
                                                  </div>
                                                )}
                                              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                                                <p className="text-sm text-warning font-semibold">
                                                  ⚠️ This action cannot be
                                                  undone. Please review
                                                  carefully.
                                                </p>
                                              </div>
                                            </Modal.Body>
                                            <Modal.Footer className="border-t border-muted/20 p-6 flex gap-3">
                                              <Button
                                                variant="danger"
                                                onClick={() => handleReject()}
                                                isDisabled={isSubmitting}
                                                className="flex-1 h-12 font-bold bg-danger hover:bg-danger/90"
                                              >
                                                {isSubmitting ? (
                                                  <Spinner size="sm" />
                                                ) : (
                                                  "Reject"
                                                )}
                                              </Button>
                                              <Button
                                                variant="primary"
                                                onClick={() => handleApprove()}
                                                isDisabled={
                                                  isSubmitting ||
                                                  (validationResult
                                                    ? !validationResult.canApprove
                                                    : false) ||
                                                  selectedGdoIds.length !==
                                                    selectedRequest?.amount
                                                }
                                                className="flex-1 h-12 font-bold bg-success hover:bg-success/90"
                                              >
                                                {isSubmitting ? (
                                                  <Spinner size="sm" />
                                                ) : (
                                                  "Approve"
                                                )}
                                              </Button>
                                            </Modal.Footer>
                                          </Modal.Dialog>
                                        </Modal.Container>
                                      </Modal.Backdrop>
                                    </Modal>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </Accordion.Body>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              )}
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
