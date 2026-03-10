"use client";

import {
  Button,
  Description,
  FieldError,
  InputGroup,
  InputGroupInput,
  Label,
  NumberField,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import {
  ElectricityIcon,
  HydrogenIcon,
  PlusCircleIcon,
} from "@/app/components/icons";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AssetType } from "@/app/types/assetType";

import { AssetTypeSelector } from "@/app/components/assetTypeSelector";

export default function RegisterProductionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const reeOrgId = process.env.NEXT_PUBLIC_REE_ORG_ID;
  const enagasGtsOrgId = process.env.NEXT_PUBLIC_ENAGAS_GTS_ORG_ID;
  const orgId = user?.organization?.id;

  const allowedAssetType =
    orgId === reeOrgId
      ? AssetType.ELECTRICITY
      : orgId === enagasGtsOrgId
        ? AssetType.H2
        : null;

  const disabledTypes = allowedAssetType
    ? ([AssetType.H2, AssetType.ELECTRICITY].filter(
        (t) => t !== allowedAssetType
      ) as AssetType[])
    : [];

  const [producerId, setProducerId] = useState("");
  const [assetType, setAssetType] = useState<AssetType>(AssetType.H2);
  const [amount, setAmount] = useState("");
  const [productionDate, setProductionDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (allowedAssetType) {
      setAssetType(allowedAssetType);
    }
  }, [allowedAssetType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center mt-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  if (!allowedAssetType) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-4">Not Authorized</h1>
        <p className="text-muted">
          Your organization is not authorized to register production.
        </p>
      </div>
    );
  }

  const handleAssetTypeChange = (type: AssetType) => {
    setAssetType(type);
    setAmount("");
  };

  const handleSubmit = async () => {
    if (
      !producerId.trim() ||
      !amount ||
      parseInt(amount) <= 0 ||
      !productionDate
    )
      return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/assets/production`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producerId: producerId.trim(),
            assetType,
            amount: parseInt(amount),
            productionDate: new Date(productionDate).toISOString(),
          }),
        }
      );

      if (response.ok) {
        toast.success("Production registered successfully!", { timeout: 4000 });
        setProducerId("");
        setAmount("");
        setProductionDate("");
        setAssetType(allowedAssetType);
      } else {
        const errorText = await response.text();
        toast.danger(`Failed to register production: ${errorText}`, {
          timeout: 4000,
        });
      }
    } catch {
      toast.danger("An error occurred while registering production.", {
        timeout: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-32 pr-10 h-full overflow-y-auto">
      <h1 className="text-4xl font-bold mb-4">Register Production</h1>
      <p className="text-muted text-lg mb-8">
        Register a new production batch for your organization.
      </p>

      <div className="bg-surface border border-muted/30 rounded-3xl p-8 shadow-lg w-full">
        <div className="flex items-center gap-4 mb-8">
          <PlusCircleIcon className="w-18 h-18 p-4 text-accent bg-accent-soft rounded-3xl" />
          <div>
            <h2 className="text-2xl font-bold">New Production Batch</h2>
            <p className="text-muted">Fill in the details below to register</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Producer ID */}
          <TextField
            isRequired
            name="producerId"
            value={producerId}
            onChange={setProducerId}
          >
            <Label className="text-base font-semibold">
              Producer Organization ID
            </Label>
            <InputGroup className="h-13 bg-background border border-muted/30">
              <InputGroupInput
                placeholder="Enter the producer organization ID"
                className="px-4 text-foreground"
              />
            </InputGroup>
            <FieldError />
          </TextField>

          {/* Asset Type */}
          <AssetTypeSelector
            value={assetType}
            onChange={handleAssetTypeChange}
            disabledTypes={disabledTypes}
            isRequired
          />

          {/* Unit */}
          <div className="flex items-center gap-3 px-4 py-3 bg-background/50 border border-muted/30 rounded-3xl">
            {assetType === AssetType.ELECTRICITY ? (
              <ElectricityIcon className="w-6 h-6 text-yellow-500 shrink-0" />
            ) : (
              <HydrogenIcon className="w-6 h-6 text-accent shrink-0" />
            )}
            <div>
              <p className="text-xs text-muted font-semibold uppercase tracking-wider">
                Unit
              </p>
              <p className="font-bold">Megawatt-hour (MWH)</p>
            </div>
          </div>

          {/* Amount */}
          <NumberField
            isRequired
            name="amount"
            value={amount ? parseInt(amount) : undefined}
            onChange={(value) => setAmount(value?.toString() || "")}
            minValue={1}
          >
            <Label className="text-base font-semibold">Amount</Label>
            <NumberField.Group className="h-13 bg-background/50 border border-muted/30 rounded-3xl">
              <NumberField.DecrementButton />
              <NumberField.Input
                placeholder="Enter amount"
                className="text-foreground px-4"
              />
              <NumberField.IncrementButton />
            </NumberField.Group>
            <Description className="text-sm text-muted mt-2">
              Quantity produced in MWH
            </Description>
            <FieldError />
          </NumberField>

          {/* Production Date */}
          <div className="space-y-1">
            <Label className="text-base font-semibold block">
              Production Date <span className="text-danger">*</span>
            </Label>
            <input
              type="datetime-local"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="w-full h-13 px-4 bg-background/50 border border-muted/30 rounded-3xl text-foreground focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Submit */}
          <Button
            fullWidth
            onClick={handleSubmit}
            isDisabled={
              isSubmitting ||
              !producerId.trim() ||
              !amount ||
              parseInt(amount) <= 0 ||
              !productionDate
            }
            className="h-14 text-xl font-bold bg-accent hover:bg-accent/90"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-3">
                <Spinner size="md" />
                <span>Registering...</span>
              </div>
            ) : (
              "Register Production"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
