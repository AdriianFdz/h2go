"use client";

import { Accordion, Button, Spinner } from "@heroui/react";
import {
  DownArrowIcon,
  ElectricityIcon,
  HidrogenIcon,
} from "@/app/components/icons";
import { useAuth } from "@/app/hooks/useAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Request } from "@/app/types/request";
import { OrganizationType } from "@/app/types/organization";
import { AssetType } from "@/app/types/assetType";

export default function RequestsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      setLoadingRequests(true);
      try {
        const isRegulator = user.organization?.type === "regulator";
        const requestsUrl = isRegulator
          ? `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests`
          : `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/${user.organization?.id}`;

        const response = await fetch(requestsUrl, {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setRequests(data || []);
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setLoadingRequests(false);
      }
    };

    // Comentado temporalmente para usar datos de ejemplo
    fetchRequests();

    // Actualizar cada 5 minutos para reactividad
    const interval = setInterval(fetchRequests, 300000);

    return () => clearInterval(interval);
  }, [user]);

  if (isLoading || loadingRequests) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  const isRegulator = user.organization?.type === OrganizationType.REGULATOR;

  if (requests.length === 0) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-4">Requests</h1>
        <p className="text-muted">No pending requests available.</p>
      </div>
    );
  }

  return (
    <div className="pb-32 pr-10">
      <h1 className="text-4xl font-bold mb-6">Requests</h1>
      <p className="text-muted text-lg mb-8">
        {isRegulator ? "All pending requests" : "Your organization requests"}
      </p>

      <Accordion
        className="w-full rounded-2xl my-6 mb-16"
        variant="surface"
      >
        {requests.map((request) => (
          <Accordion.Item key={request.requestId}>
            <Accordion.Heading>
              <Accordion.Trigger className="group flex items-center gap-4 bg-linear-to-r from-surface to-background border border-muted/30 hover:border-muted/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 px-5 py-4 rounded-xl w-full shadow-md">
                <div className="flex items-center justify-center px-3 py-2 bg-background/50 rounded-lg border border-muted/20">
                  {request.assetType === AssetType.H2 ? (
                    <HidrogenIcon className="w-11 h-11" />
                  ) : (
                    <ElectricityIcon className="w-11 h-11" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-xl font-bold tracking-tight">
                    Request #{requests.indexOf(request) + 1}
                  </span>
                  <span className="text-sm font-mono text-muted select-text">
                    {request.requestId}
                  </span>
                </div>
                <Accordion.Indicator className="text-muted w-8 h-8 group-hover:text-primary transition-colors">
                  <DownArrowIcon />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel className="mt-2">
              <Accordion.Body className="text-muted border border-muted/30 rounded-xl bg-linear-to-br from-surface to-background">
                <div className="space-y-5 p-6">
                  <div className="bg-background/50 rounded-lg p-4 border border-muted/20 shadow-sm">
                    <p className="text-xs uppercase font-bold text-muted mb-2 tracking-wider">
                      Request ID
                    </p>
                    <p className="font-mono font-semibold text-foreground text-base select-text">
                      {request.requestId}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-5 text-base">
                    <div className="bg-background/50 rounded-lg p-4 border border-muted/20 shadow-sm">
                      <p className="text-xs uppercase font-bold text-muted mb-2 tracking-wider">
                        Producer ID
                      </p>
                      <p className="font-semibold text-foreground">
                        {request.producerId}
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-muted/20 shadow-sm">
                      <p className="text-xs uppercase font-bold text-muted mb-2 tracking-wider">
                        Asset Type
                      </p>
                      <p className="font-semibold text-foreground">
                        {request.assetType}
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-muted/20 shadow-sm">
                      <p className="text-xs uppercase font-bold text-muted mb-2 tracking-wider">
                        Amount
                      </p>
                      <p className="font-semibold text-foreground text-lg">
                        {request.amount}
                      </p>
                    </div>
                    <div className="bg-background/50 rounded-lg p-4 border border-muted/20 shadow-sm">
                      <p className="text-xs uppercase font-bold text-muted mb-2 tracking-wider">
                        Status
                      </p>
                      <p
                        className={`font-semibold text-lg capitalize ${
                          request.status === "PENDING"
                            ? "text-warning"
                            : request.status === "APPROVED"
                              ? "text-success"
                              : "text-danger"
                        }`}
                      >
                        {request.status}
                      </p>
                    </div>
                  </div>
                  <div className="bg-background/50 rounded-lg p-4 border border-muted/20 shadow-sm">
                    <p className="text-xs uppercase font-bold text-muted mb-2 tracking-wider">
                      Created At
                    </p>
                    <p className="font-semibold text-foreground">
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {request.approverId && (
                    <div className="bg-background/50 rounded-lg p-4 border border-muted/20 shadow-sm">
                      <p className="text-xs uppercase font-bold text-muted mb-2 tracking-wider">
                        Approver ID
                      </p>
                      <p className="font-semibold text-foreground">
                        {request.approverId}
                      </p>
                    </div>
                  )}
                  {request.reason && (
                    <div className="bg-background/50 rounded-lg p-4 border border-muted/20 shadow-sm">
                      <p className="text-xs uppercase font-bold text-muted mb-2 tracking-wider">
                        Reason
                      </p>
                      <p className="font-semibold text-foreground">
                        {request.reason}
                      </p>
                    </div>
                  )}
                  {request.gdos && request.gdos.length > 0 && (
                    <div className="bg-background/50 rounded-lg p-4 border border-muted/20 shadow-sm">
                      <p className="text-xs uppercase font-bold text-muted mb-3 tracking-wider">
                        GDOs ({request.gdos.length})
                      </p>
                      <div className="space-y-3">
                        {request.gdos.map((gdo, idx) => (
                          <div
                            key={idx}
                            className="bg-surface/60 rounded-lg p-4 border border-muted/30 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <p className="text-sm mb-1">
                              <span className="font-bold text-muted">
                                GDO ID:
                              </span>{" "}
                              <span className="font-mono font-semibold text-foreground">
                                {gdo.gdoId}
                              </span>
                            </p>
                            <p className="text-sm">
                              <span className="font-bold text-muted">
                                Status:
                              </span>{" "}
                              <span
                                className={`font-semibold capitalize ${
                                  gdo.status === "active"
                                    ? "text-success"
                                    : "text-muted"
                                }`}
                              >
                                {gdo.status}
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button
                    fullWidth
                    className="text-xl font-black h-13"
                  >
                    Take Action
                  </Button>
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  );
}
