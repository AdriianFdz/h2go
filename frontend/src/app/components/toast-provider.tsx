"use client";

import type { ToastContentValue } from "@heroui/react";
import {
  Toast,
  ToastContent,
  ToastDescription,
  ToastIndicator,
  ToastTitle,
} from "@heroui/react";

const variantBorderColors = {
  default: "border-muted/30",
  accent: "border-accent",
  success: "border-success",
  warning: "border-warning",
  danger: "border-danger",
};

export function ToastProvider() {
  return (
    <Toast.Provider placement="top">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {({ toast: toastItem }: any) => {
        const content = toastItem.content as ToastContentValue;
        const variant = content.variant || "default";
        const borderColor =
          variantBorderColors[variant] || variantBorderColors.default;

        return (
          <Toast
            className={`rounded-xl border-2 ${borderColor}`}
            toast={toastItem}
            variant={variant}
          >
            <ToastContent className="pr-10">
              <div className="flex items-center gap-3">
                {content.indicator && (
                  <ToastIndicator variant={variant}>
                    {content.indicator}
                  </ToastIndicator>
                )}
                <div className="flex flex-col flex-1">
                  {content.title && <ToastTitle>{content.title}</ToastTitle>}
                  {content.description && (
                    <ToastDescription>{content.description}</ToastDescription>
                  )}
                </div>
              </div>
            </ToastContent>
            <Toast.CloseButton className="absolute top-1/2 right-2 -translate-y-1/2 border-none bg-transparent opacity-100 [&>svg]:size-4" />
          </Toast>
        );
      }}
    </Toast.Provider>
  );
}
