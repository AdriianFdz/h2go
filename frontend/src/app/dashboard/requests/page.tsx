"use client";

import {
  Accordion,
  Button,
  Label,
  Modal,
  SearchField,
  Spinner,
} from "@heroui/react";
import {
  DownArrowIcon,
  ElectricityIcon,
  HydrogenIcon,
} from "@/app/components/icons";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Request } from "@/app/types/request";
import { OrganizationType } from "@/app/types/organization";
import { AssetType } from "@/app/types/assetType";

export default function RequestsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const isInitialLoad = useRef(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<"approve" | "reject" | null>(
    null
  );
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    canApprove: boolean;
  } | null>(null);
  const [filterValue, setFilterValue] = useState("");

  const filteredRequests = useMemo(() => {
    if (!filterValue) return requests;
    const searchTerm = filterValue.toLowerCase();
    return requests.filter((request) =>
      request.requestId.toLowerCase().startsWith(searchTerm)
    );
  }, [requests, filterValue]);

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      if (isInitialLoad.current) {
        setLoadingRequests(true);
      }
      try {
        const isRegulator = user.organization?.type === "regulator";
        const requestsUrl = isRegulator
          ? `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/transformation`
          : `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/transformation/${user.organization?.id}`;

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
        isInitialLoad.current = false;
      }
    };

    fetchRequests();

    // Actualizar cada 5 minutos
    const interval = setInterval(fetchRequests, 300000);

    return () => clearInterval(interval);
  }, [user]);

  if (isLoading || loadingRequests) {
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

  const isRegulator = user.organization?.type === OrganizationType.REGULATOR;

  if (requests.length === 0) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-4">Requests</h1>
        <p className="text-muted">No pending requests available.</p>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsSubmitting("approve");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/transformation/${selectedRequest.requestId}/approve`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ comment }),
        }
      );

      if (response.ok) {
        setRequests(
          requests.filter((r) => r.requestId !== selectedRequest.requestId)
        );
        setSelectedRequest(null);
        setComment("");
        setValidationResult(null);
      } else {
        console.error("Error approving request:", await response.text());
      }
    } catch (error) {
      console.error("Error approving request:", error);
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setIsSubmitting("reject");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/transformation/${selectedRequest.requestId}/reject`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ comment }),
        }
      );

      if (response.ok) {
        setRequests(
          requests.filter((r) => r.requestId !== selectedRequest.requestId)
        );
        setSelectedRequest(null);
        setComment("");
        setValidationResult(null);
      } else {
        console.error("Error rejecting request:", await response.text());
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
    } finally {
      setIsSubmitting(null);
    }
  };

  const validateRequest = async (requestId: string) => {
    setValidationLoading(true);
    setValidationResult(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/requests/transformation/${requestId}/validation`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setValidationResult({ canApprove: data.canApprove });
      } else {
        setValidationResult({ canApprove: false });
      }
    } catch (error) {
      console.error("Error validating request:", error);
      setValidationResult({ canApprove: false });
    } finally {
      setValidationLoading(false);
    }
  };

  return (
    <div className="pr-10 h-full flex flex-col">
      <h1 className="text-4xl font-bold mb-6">Requests</h1>
      <p className="text-muted text-lg mb-8">
        {isRegulator ? "All pending requests" : "Your organization requests"}
      </p>

      <SearchField
        defaultValue=""
        onChange={(value) => setFilterValue(value)}
      >
        <Label className="text-lg">Search Requests</Label>
        <SearchField.Group className="h-13 bg-surface/50 border border-muted/30">
          <SearchField.Input placeholder="Insert request ID" />
        </SearchField.Group>
      </SearchField>
      <div className="flex-1 overflow-y-auto my-6 min-h-0 pr-2">
        <Accordion
          className="w-full rounded-2xl"
          variant="surface"
        >
          {filteredRequests.map((request) => (
            <Accordion.Item key={request.requestId}>
              <Accordion.Heading>
                <Accordion.Trigger className="group flex items-center gap-4 bg-linear-to-r from-surface to-background border border-muted/30 hover:border-muted/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 px-5 py-4 rounded-xl w-full shadow-md">
                  <div className="flex items-center justify-center px-2 py-2 bg-background/50 rounded-lg border border-muted/20">
                    {request.assetType === AssetType.H2 ? (
                      <HydrogenIcon className="w-11 h-11" />
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
                          GdOs ({request.gdos.length})
                        </p>
                        <div className="space-y-3">
                          {request.gdos.map((gdo, idx) => (
                            <div
                              key={idx}
                              className="bg-surface/60 rounded-lg p-4 border border-muted/30 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <p className="text-sm mb-1">
                                <span className="font-bold text-muted">
                                  GdO ID:
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
                    {isRegulator && request.status === "PENDING" && (
                      <Modal>
                        <Button
                          fullWidth
                          className="text-xl font-black h-13"
                          onClick={() => {
                            setSelectedRequest(request);
                            setComment("");
                            validateRequest(request.requestId);
                          }}
                        >
                          Take Action
                        </Button>
                        <Modal.Backdrop variant="blur">
                          <Modal.Container>
                            <Modal.Dialog className="bg-surface border border-muted/30 max-w-2xl">
                              <Modal.CloseTrigger />
                              <Modal.Header className="border-b border-muted/20 p-6">
                                <h2 className="text-2xl font-bold">
                                  Take Action on Request
                                </h2>
                                <p className="text-sm text-muted font-mono mt-1 break-all">
                                  {request.requestId}
                                </p>
                                {validationLoading ? (
                                  <div className="flex items-center gap-2 mt-3">
                                    <Spinner size="sm" />
                                    <p className="text-sm text-muted">
                                      Validating request...
                                    </p>
                                  </div>
                                ) : validationResult ? (
                                  validationResult.canApprove ? (
                                    <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                                      <p
                                        className={
                                          "text-lg font-bold text-success"
                                        }
                                      >
                                        ✓ Request meets approval criteria
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
                                      <p
                                        className={
                                          "text-lg font-bold text-danger"
                                        }
                                      >
                                        ✗ Request does not meet approval
                                        criteria
                                      </p>
                                    </div>
                                  )
                                ) : null}
                              </Modal.Header>
                              <Modal.Body className="p-6 space-y-4">
                                <div className="space-y-2">
                                  <Label className="text-base font-semibold">
                                    Comment{" "}
                                    <span className="text-danger">*</span>
                                  </Label>
                                  <div className="bg-background/50 border border-muted/30 rounded-lg">
                                    <textarea
                                      value={comment}
                                      onChange={(e) =>
                                        setComment(e.target.value)
                                      }
                                      placeholder="Add a comment about your decision... (required)"
                                      rows={5}
                                      className="w-full p-3 bg-transparent text-foreground resize-none focus:outline-none rounded-lg"
                                      disabled={isSubmitting !== null}
                                    />
                                  </div>
                                  {comment.trim() === "" && (
                                    <p className="text-sm text-muted">
                                      A comment is required to proceed
                                    </p>
                                  )}
                                </div>

                                <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                                  <p className="text-sm text-warning font-semibold">
                                    ⚠️ This action cannot be undone. Please
                                    review carefully.
                                  </p>
                                </div>
                              </Modal.Body>
                              <Modal.Footer className="border-t border-muted/20 p-6 flex gap-3">
                                <Button
                                  variant="danger"
                                  onClick={() => handleReject()}
                                  isDisabled={
                                    isSubmitting !== null ||
                                    comment.trim() === ""
                                  }
                                  className="flex-1 h-12 font-bold bg-danger hover:bg-danger/90"
                                >
                                  {isSubmitting === "reject" ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    "Reject"
                                  )}
                                </Button>
                                <Button
                                  variant="primary"
                                  onClick={() => handleApprove()}
                                  isDisabled={
                                    isSubmitting !== null ||
                                    comment.trim() === "" ||
                                    (validationResult
                                      ? !validationResult.canApprove
                                      : false)
                                  }
                                  className="flex-1 h-12 font-bold bg-success hover:bg-success/90"
                                >
                                  {isSubmitting === "approve" ? (
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
                    )}
                  </div>
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
