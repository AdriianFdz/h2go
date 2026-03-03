import { AssetType } from "@/app/types/assetType";
import { ElectricityIcon, HydrogenIcon } from "./icons";
import { Label } from "@heroui/react";

interface AssetTypeSelectorProps {
  value: AssetType;
  onChange: (value: AssetType) => void;
  label?: string;
  isRequired?: boolean;
}

export function AssetTypeSelector({
  value,
  onChange,
  label = "Asset Type",
  isRequired = false,
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
          onClick={() => onChange(AssetType.H2)}
          className={`flex items-center gap-4 p-5 rounded-4xl border-2 transition-all cursor-pointer ${
            value === AssetType.H2
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
          type="button"
          onClick={() => onChange(AssetType.ELECTRICITY)}
          className={`flex items-center gap-4 p-5 rounded-4xl border-2 transition-all cursor-pointer ${
            value === AssetType.ELECTRICITY
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
  );
}
