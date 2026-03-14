import { AssetType } from "@/app/types/assetType";
import { ElectricityIcon, HydrogenIcon } from "./icons";
import { Label } from "@heroui/react";

interface AssetTypeSelectorProps {
  value: AssetType;
  onChange: (value: AssetType) => void;
  label?: string;
  isRequired?: boolean;
  disabledTypes?: AssetType[];
}

export function AssetTypeSelector({
  value,
  onChange,
  label = "Asset Type",
  isRequired = false,
  disabledTypes = [],
}: AssetTypeSelectorProps) {
  return (
    <div>
      <Label className="text-base font-semibold mb-1 block">
        {label}
        {isRequired && <span className="text-danger ml-1">*</span>}
      </Label>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          disabled={disabledTypes.includes(AssetType.H2)}
          onClick={() =>
            !disabledTypes.includes(AssetType.H2) && onChange(AssetType.H2)
          }
          className={`flex items-center gap-4 p-5 rounded-4xl border-2 transition-all ${
            disabledTypes.includes(AssetType.H2)
              ? "border-muted/20 bg-background/20 opacity-40 cursor-not-allowed"
              : value === AssetType.H2
                ? "border-accent bg-accent/10 shadow-md cursor-pointer"
                : "border-muted/30 bg-background/50 hover:border-accent/50 cursor-pointer"
          }`}
        >
          <HydrogenIcon className="w-12 h-12" />
          <div className="text-left">
            <p className="font-bold text-lg">Hydrogen</p>
            <p className="text-sm text-muted">H2 GdOs</p>
          </div>
        </button>
        <button
          type="button"
          disabled={disabledTypes.includes(AssetType.ELECTRICITY)}
          onClick={() =>
            !disabledTypes.includes(AssetType.ELECTRICITY) &&
            onChange(AssetType.ELECTRICITY)
          }
          className={`flex items-center gap-4 p-5 rounded-4xl border-2 transition-all ${
            disabledTypes.includes(AssetType.ELECTRICITY)
              ? "border-muted/20 bg-background/20 opacity-40 cursor-not-allowed"
              : value === AssetType.ELECTRICITY
                ? "border-yellow-500 bg-yellow-500/10 shadow-md cursor-pointer"
                : "border-muted/30 bg-background/50 hover:border-yellow-500/50 cursor-pointer"
          }`}
        >
          <ElectricityIcon className="w-12 h-12" />
          <div className="text-left">
            <p className="font-bold text-lg">Electricity</p>
            <p className="text-sm text-muted">Electricity GdOs</p>
          </div>
        </button>
      </div>
    </div>
  );
}
