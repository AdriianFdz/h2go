"use client";

import { KeyIcon } from "@/app/components/icons";
import { useAuth } from "@/app/context/AuthContext";
import { AuthorizedOrg } from "@/app/types/authorizedOrg";
import { OrganizationType } from "@/app/types/organization";
import { Role } from "@/app/types/user";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Spinner,
  TextField,
  toast,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function AuthorizationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [authorizeId, setAuthorizeId] = useState("");
  const [authorizeLoading, setAuthorizeLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);

  const [authorizedOrgs, setAuthorizedOrgs] = useState<AuthorizedOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  const fetchOrgs = useCallback(async () => {
    setLoadingOrgs(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${user?.organization?.id}/authorizations`,
        { method: "GET", credentials: "include" }
      );
      if (res.ok) {
        const data: AuthorizedOrg[] = await res.json();
        setAuthorizedOrgs(data);
      }
    } catch (err) {
      console.error("Error fetching organizations:", err);
    } finally {
      setLoadingOrgs(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchOrgs();
  }, [user, fetchOrgs]);

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

  if (
    user.role !== Role.ADMIN ||
    user.organization?.type !== OrganizationType.PRODUCER
  ) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-4">Authorizations</h1>
        <p className="text-muted">
          Only PRODUCER administrators can manage authorizations.
        </p>
      </div>
    );
  }

  const handleAuthorize = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = authorizeId.trim();
    if (!id) return;
    setAuthorizeLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${id}/authorizations`,
        { method: "POST", credentials: "include" }
      );
      if (res.ok) {
        toast.success("Organization authorized successfully", {
          timeout: 4000,
        });
        setAuthorizeId("");
        fetchOrgs();
      } else {
        const err = await res.json().catch(() => null);
        toast.danger(err?.message ?? "Failed to authorize organization", {
          timeout: 4000,
        });
      }
    } catch {
      toast.danger("An error occurred", { timeout: 4000 });
    } finally {
      setAuthorizeLoading(false);
    }
  };

  const handleRevoke = async (orgId: string) => {
    setRevokeLoading(orgId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${orgId}/authorizations`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        toast.success("Authorization revoked successfully", { timeout: 4000 });
        setAuthorizedOrgs((prev) => prev.filter((o) => o.id !== orgId));
      } else {
        const err = await res.json().catch(() => null);
        toast.danger(err?.message ?? "Failed to revoke authorization", {
          timeout: 4000,
        });
      }
    } catch {
      toast.danger("An error occurred", { timeout: 4000 });
    } finally {
      setRevokeLoading(null);
    }
  };

  return (
    <div className="w-full mr-10">
      <h1 className="text-4xl font-bold mb-2">Authorizations</h1>
      <p className="text-muted text-lg mb-10">
        Manage which organizations can operate with{" "}
        <span className="font-semibold text-foreground">
          {user.organization?.name}
        </span>
        .
      </p>

      <div className="flex flex-col gap-6 max-w-xl">
        {/* Authorize */}
        <div className="border border-muted/20 rounded-2xl p-6 bg-surface">
          <div className="flex items-center gap-3 mb-1">
            <KeyIcon className="size-5 text-accent" />
            <h2 className="text-xl font-bold">Authorize Organization</h2>
          </div>
          <p className="text-muted text-sm mb-5">
            Grant an organization access to operate with yours by entering its
            ID.
          </p>
          <Form
            onSubmit={handleAuthorize}
            className="space-y-4"
          >
            <TextField
              isRequired
              name="authorizeId"
              value={authorizeId}
              onChange={setAuthorizeId}
            >
              <Label className="text-base mb-1">Organization ID</Label>
              <Input
                variant="secondary"
                placeholder="Enter organization ID"
                className="text-base"
              />
              <FieldError />
            </TextField>
            <Button
              type="submit"
              size="lg"
              className="w-full font-bold text-lg"
              isDisabled={authorizeLoading || !authorizeId.trim()}
            >
              {authorizeLoading ? <Spinner size="sm" /> : "Authorize"}
            </Button>
          </Form>
        </div>

        {/* Revoke */}
        <div className="border border-danger-soft-hover rounded-2xl p-6 bg-surface">
          <div className="flex items-center gap-3 mb-1">
            <KeyIcon className="size-5 text-danger" />
            <h2 className="text-xl font-bold">Revoke Authorization</h2>
          </div>
          <p className="text-muted text-sm mb-5">
            Remove an organization&apos;s access to operate with yours.
          </p>

          {loadingOrgs ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : authorizedOrgs.length === 0 ? (
            <p className="text-muted text-sm py-4 text-center">
              No authorized organizations yet.
            </p>
          ) : (
            <ListBox selectionMode="none">
              {authorizedOrgs.map((org) => (
                <ListBox.Item
                  key={org.id}
                  id={org.id}
                  textValue={org.name ?? org.id}
                  className="border border-muted/20 py-3 rounded-xl mb-2"
                >
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-danger/10 flex items-center justify-center text-danger font-bold">
                        {org.name?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="font-semibold">{org.name}</p>
                        <p className="text-xs text-muted">{org.id}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="tertiary"
                      className="border border-danger/50 text-danger hover:bg-danger/10 shrink-0"
                      isDisabled={revokeLoading === org.id}
                      onPress={() => handleRevoke(org.id)}
                    >
                      {revokeLoading === org.id ? (
                        <Spinner size="sm" />
                      ) : (
                        "Revoke"
                      )}
                    </Button>
                  </div>
                </ListBox.Item>
              ))}
            </ListBox>
          )}
        </div>
      </div>
    </div>
  );
}
