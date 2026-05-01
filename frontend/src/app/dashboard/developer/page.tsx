"use client";

import { useAuth } from "@/app/context/AuthContext";
import { EditIcon, PlusCircleIcon, TrashIcon } from "@/app/components/icons";
import { Role } from "@/app/types/user";
import { Organization, OrganizationType } from "@/app/types/organization";
import {
  AlertDialog,
  Button,
  Chip,
  FieldError,
  Form,
  Input,
  Label,
  Select,
  ListBox,
  Modal,
  Spinner,
  TextField,
  Selection,
  toast,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ORG_TYPE_COLORS: Record<OrganizationType, "accent" | "success" | "warning" | "danger"> = {
  [OrganizationType.TRADER]: "accent",
  [OrganizationType.PRODUCER]: "success",
  [OrganizationType.REGULATOR]: "warning",
  [OrganizationType.REGISTRY]: "danger",
};

export default function DeveloperPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [selectedOrg, setSelectedOrg] = useState<Selection>(new Set());
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const selectedOrgId =
    selectedOrg instanceof Set ? Array.from(selectedOrg)[0] : null;
  const selectedOrgData = organizations.find((o) => o.id === selectedOrgId);

  useEffect(() => {
    if (!user || user.role !== Role.DEV) return;

    const fetchOrgs = async () => {
      setIsLoadingOrgs(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch organizations");
        const data = await res.json();
        setOrganizations(data);
      } catch (err) {
        console.error("Error fetching organizations:", err);
        toast.danger("Failed to load organizations", { timeout: 4000 });
      } finally {
        setIsLoadingOrgs(false);
      }
    };

    fetchOrgs();
  }, [user]);

  const handleCreateOrg = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const type = formData.get("type") as OrganizationType;
    const mspId = (formData.get("mspId") as string) || undefined;
    const peerEndpoint = (formData.get("peerEndpoint") as string) || undefined;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, type, mspId, peerEndpoint }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to create organization");
      }
      // Refetch orgs to get full data with ID
      const listRes = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations`,
        { credentials: "include" }
      );
      if (listRes.ok) {
        const data = await listRes.json();
        setOrganizations(data);
      }
      setIsCreateModalOpen(false);
      toast.success("Organization created successfully", { timeout: 4000 });
    } catch (err) {
      console.error("Error creating organization:", err);
      toast.danger(
        err instanceof Error ? err.message : "Failed to create organization",
        { timeout: 4000 }
      );
    }
  };

  const handleEditOrg = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrgId) return;

    const formData = new FormData(event.currentTarget);
    const name = (formData.get("name") as string) || undefined;
    const type = (formData.get("type") as OrganizationType) || undefined;
    const mspId = (formData.get("mspId") as string) || undefined;
    const peerEndpoint = (formData.get("peerEndpoint") as string) || undefined;

    const body: Record<string, string | undefined> = {};
    if (name) body.name = name;
    if (type) body.type = type;
    if (mspId) body.mspId = mspId;
    if (peerEndpoint) body.peerEndpoint = peerEndpoint;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${selectedOrgId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to update organization");
      }
      const data = await res.json();
      const updatedOrg = data.organization;
      setOrganizations((prev) =>
        prev.map((o) => (o.id === updatedOrg.id ? { ...o, ...updatedOrg } : o))
      );
      setIsEditModalOpen(false);
      toast.success("Organization updated successfully", { timeout: 4000 });
    } catch (err) {
      console.error("Error updating organization:", err);
      toast.danger(
        err instanceof Error ? err.message : "Failed to update organization",
        { timeout: 4000 }
      );
    }
  };

  const handleDeleteOrg = async () => {
    if (!selectedOrgId) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${selectedOrgId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to delete organization");
      }
      setOrganizations((prev) => prev.filter((o) => o.id !== selectedOrgId));
      setSelectedOrg(new Set());
      setIsDeleteAlertOpen(false);
      setIsEditModalOpen(false);
      toast.success("Organization deleted successfully", { timeout: 4000 });
    } catch (err) {
      console.error("Error deleting organization:", err);
      toast.danger(
        err instanceof Error ? err.message : "Failed to delete organization",
        { timeout: 4000 }
      );
    }
  };

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

  if (user.role !== Role.DEV) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted">
          This page is only accessible to developer accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold mb-2">Developer Panel</h1>
      <p className="text-muted text-lg mb-8">
        Manage organizations — create, edit, and configure MSPID, endpoints, and
        types.
      </p>

      <h2 className="text-xl font-bold mb-5">Organizations</h2>
      <div className="mr-10">
        {isLoadingOrgs ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="xl" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-muted/30 rounded-2xl">
            <p className="text-muted text-lg mb-2">No organizations yet</p>
            <p className="text-muted/60 text-sm">
              Create your first organization to get started.
            </p>
          </div>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto">
            <ListBox
              selectionMode="single"
              selectedKeys={selectedOrg}
              onSelectionChange={setSelectedOrg}
            >
              {organizations.map((org) => (
                <ListBox.Item
                  key={org.id}
                  id={org.id}
                  textValue={org.name || org.id}
                  className="border border-muted/20 data-[selected=true]:border-accent py-3"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-lg">{org.name}</p>
                        {org.type && (
                          <Chip
                            color={ORG_TYPE_COLORS[org.type]}
                            variant="soft"
                            size="md"
                          >
                            {org.type.toUpperCase()}
                          </Chip>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted">
                        {org.mspId && (
                          <span>
                            <span className="font-medium text-muted/70">
                              MSP:{" "}
                            </span>
                            {org.mspId}
                          </span>
                        )}
                        {org.peerEndpoint && (
                          <span>
                            <span className="font-medium text-muted/70">
                              Endpoint:{" "}
                            </span>
                            {org.peerEndpoint}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ListBox.ItemIndicator className="text-accent" />
                </ListBox.Item>
              ))}
            </ListBox>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          {/* Create Organization Modal */}
          <Modal
            isOpen={isCreateModalOpen}
            onOpenChange={setIsCreateModalOpen}
          >
            <Button size="lg" className="w-full mt-5">
              <PlusCircleIcon />
              Create Organization
            </Button>
            <Modal.Backdrop>
              <Modal.Container size="lg">
                <Modal.Dialog>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading className="text-2xl font-bold mb-5">
                      Create Organization
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    <Form
                      onSubmit={handleCreateOrg}
                      className="mx-1 space-y-4"
                    >
                      <TextField
                        isRequired
                        name="name"
                        type="text"
                        minLength={1}
                      >
                        <Label className="text-lg">Name</Label>
                        <Input
                          placeholder="Organization name"
                          variant="secondary"
                          className="text-lg"
                        />
                        <FieldError />
                      </TextField>

                      <Select
                        isRequired
                        className="w-full"
                        name="type"
                        placeholder="Select type..."
                        variant="secondary"
                      >
                        <Label className="text-lg">Type</Label>
                        <Select.Trigger>
                          <Select.Value className="text-lg" />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {Object.values(OrganizationType).map((t) => (
                              <ListBox.Item key={t} id={t} textValue={t.charAt(0).toUpperCase() + t.slice(1)}>
                                <Chip
                                  color={ORG_TYPE_COLORS[t]}
                                  variant="soft"
                                  size="lg"
                                >
                                  {t.charAt(0).toUpperCase() + t.slice(1)}
                                </Chip>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                        <FieldError />
                      </Select>

                      <TextField name="mspId" type="text">
                        <Label className="text-lg">MSP ID</Label>
                        <Input
                          placeholder="e.g. Trader1MSP"
                          variant="secondary"
                          className="text-lg"
                        />
                        <FieldError />
                      </TextField>

                      <TextField name="peerEndpoint" type="text">
                        <Label className="text-lg">Peer Endpoint</Label>
                        <Input
                          placeholder="e.g. peer0-trader1.localho.st:443"
                          variant="secondary"
                          className="text-lg"
                        />
                        <FieldError />
                      </TextField>

                      <Button
                        type="submit"
                        size="lg"
                        className="mt-5 w-full text-xl font-bold"
                      >
                        Create Organization
                      </Button>
                    </Form>
                  </Modal.Body>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>

          {/* Edit Organization Modal */}
          <Modal
            isOpen={isEditModalOpen}
            onOpenChange={(open) => {
              setIsEditModalOpen(open);
            }}
          >
            <Button
              variant="tertiary"
              size="lg"
              className="w-full mt-5"
              isDisabled={!selectedOrgId}
              onPress={() => {
                if (selectedOrgData) {
                  setIsEditModalOpen(true);
                }
              }}
            >
              <EditIcon />
              Edit Organization
            </Button>
            <Modal.Backdrop>
              <Modal.Container size="lg">
                <Modal.Dialog>
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading className="text-2xl font-bold mb-5">
                      Edit Organization
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body>
                    {selectedOrgData && (
                      <>
                        <Form
                          onSubmit={handleEditOrg}
                          className="mx-1 space-y-4"
                        >
                          <TextField
                            name="name"
                            type="text"
                            defaultValue={selectedOrgData.name || ""}
                          >
                            <Label className="text-lg">Name</Label>
                            <Input
                              placeholder="Organization name"
                              variant="secondary"
                              className="text-lg"
                            />
                            <FieldError />
                          </TextField>

                          <Select
                            className="w-full"
                            name="type"
                            defaultSelectedKey={selectedOrgData.type || undefined}
                            placeholder="Select type..."
                            variant="secondary"
                          >
                            <Label className="text-lg">Type</Label>
                            <Select.Trigger>
                              <Select.Value className="text-lg" />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {Object.values(OrganizationType).map((t) => (
                                  <ListBox.Item key={t} id={t} textValue={t.charAt(0).toUpperCase() + t.slice(1)}>
                                    <Chip
                                      color={ORG_TYPE_COLORS[t]}
                                      variant="soft"
                                      size="lg"
                                    >
                                      {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </Chip>
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                            <FieldError />
                          </Select>

                          <TextField
                            name="mspId"
                            type="text"
                            defaultValue={selectedOrgData.mspId || ""}
                          >
                            <Label className="text-lg">MSP ID</Label>
                            <Input
                              placeholder="e.g. Trader1MSP"
                              variant="secondary"
                              className="text-lg"
                            />
                            <FieldError />
                          </TextField>

                          <TextField
                            name="peerEndpoint"
                            type="text"
                            defaultValue={selectedOrgData.peerEndpoint || ""}
                          >
                            <Label className="text-lg">Peer Endpoint</Label>
                            <Input
                              placeholder="e.g. peer0-trader1.localho.st:443"
                              variant="secondary"
                              className="text-lg"
                            />
                            <FieldError />
                          </TextField>

                          <Button
                            type="submit"
                            size="lg"
                            className="mt-5 w-full text-xl font-bold"
                          >
                            Save Changes
                          </Button>
                        </Form>
                        <AlertDialog
                          isOpen={isDeleteAlertOpen}
                          onOpenChange={setIsDeleteAlertOpen}
                        >
                          <Button
                            variant="tertiary"
                            size="lg"
                            className="mt-3 w-full text-xl font-bold text-danger"
                          >
                            <TrashIcon />
                            Delete Organization
                          </Button>
                          <AlertDialog.Backdrop>
                            <AlertDialog.Container>
                              <AlertDialog.Dialog>
                                <AlertDialog.CloseTrigger />
                                <AlertDialog.Header>
                                  <AlertDialog.Icon />
                                  <AlertDialog.Heading>
                                    Delete Organization
                                  </AlertDialog.Heading>
                                </AlertDialog.Header>
                                <AlertDialog.Body>
                                  Are you sure you want to delete this organization? This action cannot be undone.
                                </AlertDialog.Body>
                                <AlertDialog.Footer>
                                  <Button
                                    variant="ghost"
                                    onPress={() => setIsDeleteAlertOpen(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="danger"
                                    onPress={handleDeleteOrg}
                                  >
                                    Delete
                                  </Button>
                                </AlertDialog.Footer>
                              </AlertDialog.Dialog>
                            </AlertDialog.Container>
                          </AlertDialog.Backdrop>
                        </AlertDialog>
                      </>
                    )}
                  </Modal.Body>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </div>
      </div>
    </div>
  );
}
