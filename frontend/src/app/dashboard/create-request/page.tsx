"use client";

import {
  Accordion,
  Button,
  Description,
  FieldError,
  InputGroup,
  InputGroupInput,
  Label,
  ListBox,
  ListBoxItem,
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
} from "@/app/components/icons";
import { useAuth } from "@/app/hooks/useAuth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AssetType } from "@/app/types/assetType";
import { OrganizationType } from "@/app/types/organization";

interface ProducerInfo {
  id: string;
  name: string;
}

export default function CreateRequestPage() {
  const { user, isLoading, authorizedByOrgs } = useAuth();
  const router = useRouter();

  // Producer info state
  const [producers, setProducers] = useState<ProducerInfo[]>([]);
  const [loadingProducers, setLoadingProducers] = useState(false);

  // Expedition form states
  const [expeditionProducerId, setExpeditionProducerId] = useState<string>("");
  const [expeditionAssetType, setExpeditionAssetType] = useState<AssetType>(
    AssetType.H2
  );
  const [expeditionAmount, setExpeditionAmount] = useState("");
  const [isSubmittingExpedition, setIsSubmittingExpedition] = useState(false);

  // Redemption states
  const [selectedProducer, setSelectedProducer] = useState<string>("");
  const [redemptionAssetType, setRedemptionAssetType] = useState<AssetType>(
    AssetType.H2
  );
  const [redemptionAmount, setRedemptionAmount] = useState("");
  const [isSubmittingRedemption, setIsSubmittingRedemption] = useState(false);

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
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests`, {
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
    })
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

  const handleRedemptionSubmit = async () => {
    // TODO: Implement redemption request submission
    console.log("Redemption request:", {
      producer: selectedProducer,
      assetType: redemptionAssetType,
      amount: redemptionAmount,
    });

    // Simulate async operation
    setTimeout(() => {
      setIsSubmittingRedemption(false);
    }, 1000);
  };

  return (
    <div className="pb-32 pr-10">
      <h1 className="text-4xl font-bold mb-4">GDO Operations</h1>
      <p className="text-muted text-lg mb-8">
        Request new GDOs or redeem existing ones from authorized producers.
      </p>

      {/* Tabs */}
      <Tabs
        defaultSelectedKey="expedition"
        variant="secondary"
      >
        <Tabs.ListContainer className="mb-8">
          <Tabs.List className="w-full">
            <Tabs.Tab
              id="expedition"
              className="flex-1 flex items-center justify-center gap-3 text-xl pb-3"
            >
              <PlusCircleIcon />
              Request GDOs
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab
              id="redemption"
              className="flex-1 flex items-center justify-center gap-3 text-xl pb-3"
            >
              <CircleCheckIcon />
              Redeem GDOs
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* Expedition Tab Content */}
        <Tabs.Panel id="expedition">
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
                      <Select.Trigger className="flex items-center h-13 px-4 bg-background border border-muted/30 rounded-lg text-foreground hover:border-accent/50 focus:outline-none focus:border-accent transition-colors">
                        <Select.Value className="flex-1 text-left" />
                        <Select.Indicator>
                          <DownArrowIcon className="w-5 h-5 text-muted" />
                        </Select.Indicator>
                      </Select.Trigger>
                      <Select.Popover className="bg-surface border border-muted/30 rounded-lg shadow-lg">
                        <ListBox className="p-1">
                          {producers.map((producer) => (
                            <ListBoxItem
                              key={producer.id}
                              id={producer.id}
                              textValue={producer.name}
                              className="px-3 py-2 rounded-md cursor-pointer"
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
                  <div className="mt-3 p-4 bg-accent/5 border border-accent-soft rounded-lg">
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
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Asset Type</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setExpeditionAssetType(AssetType.H2)}
                      className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all cursor-pointer ${
                        expeditionAssetType === AssetType.H2
                          ? "border-accent bg-accent/10 shadow-md"
                          : "border-muted/30 bg-background/50 hover:border-accent/50"
                      }`}
                    >
                      <HydrogenIcon className="w-12 h-12" />
                      <div className="text-left">
                        <p className="font-bold text-lg">Hydrogen</p>
                        <p className="text-sm text-muted">H2 GDOs</p>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setExpeditionAssetType(AssetType.ELECTRICITY)
                      }
                      className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all cursor-pointer ${
                        expeditionAssetType === AssetType.ELECTRICITY
                          ? "border-yellow-500 bg-yellow-500/10 shadow-md"
                          : "border-muted/30 bg-background/50 hover:border-yellow-500/50"
                      }`}
                    >
                      <ElectricityIcon className="w-12 h-12" />
                      <div className="text-left">
                        <p className="font-bold text-lg">Electricity</p>
                        <p className="text-sm text-muted">Electricity GDOs</p>
                      </div>
                    </button>
                  </div>
                </div>

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
                  <NumberField.Group className="h-13 bg-background/50 border border-muted/30 rounded-lg">
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

        {/* Redemption Tab Content */}
        <Tabs.Panel id="redemption">
          <div className="space-y-6">
            <div className="bg-surface border border-muted/30 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <CircleCheckIcon className="w-18 h-18 p-4 text-accent bg-accent-soft rounded-2xl" />
                <div>
                  <h2 className="text-2xl font-bold">Redemption Request</h2>
                  <p className="text-muted">
                    Answer a pending request for GdOs
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
                    <Accordion.Item key={producer.id}>
                      <Accordion.Heading>
                        <Accordion.Trigger className="group flex items-center gap-4 bg-background/50 border border-muted/30 hover:border-accent-hover px-5 py-4 rounded-xl w-full transition-all">
                          <OrganizationIcon className="w-12 h-12 p-2 text-accent bg-accent-soft rounded-2xl" />
                          <div className="flex-1 text-left">
                            <span className="text-lg font-bold">
                              {producer.name}
                            </span>
                            <p className="text-sm text-muted mt-1 font-mono">
                              {producer.id.slice(0, 20)}...
                            </p>
                          </div>
                          <Accordion.Indicator className="text-muted w-6 h-6">
                            <DownArrowIcon />
                          </Accordion.Indicator>
                        </Accordion.Trigger>
                      </Accordion.Heading>
                      <Accordion.Panel className="mt-2">
                        <Accordion.Body className="border border-muted/30 rounded-xl bg-background/30 p-6 space-y-6"></Accordion.Body>
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
