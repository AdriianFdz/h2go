"use client";

import {
  CircleCheckIcon,
  EditIcon,
  KeyIcon,
  PlusCircleIcon,
  TrashIcon,
  UsersIcon,
} from "@/app/components/icons";
import { useAuth } from "@/app/hooks/useAuth";
import { Role, User } from "@/app/types/user";
import {
  AlertDialog,
  Avatar,
  Button,
  Chip,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Spinner,
  TextField,
  Selection,
  Select,
  toast,
  Alert,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrganizationPage() {
  const { user, isLoading, authorizedByOrgs } = useAuth();
  const router = useRouter();

  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<Selection>(new Set());

  const selectedUserId =
    selectedUser instanceof Set ? Array.from(selectedUser)[0] : null;
  const selectedUserData = orgUsers.find((u) => u.id === selectedUserId);

  const [changePassword, setChangePassword] = useState(false);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${user?.organization?.id}/users`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      }
    )
      .then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            const newUser = data.user;
            setOrgUsers((prev) => [...prev, newUser]);
            setIsCreateUserModalOpen(false);
            toast.success("User created successfully", { timeout: 4000 });
          });
        } else {
          toast.danger("Failed to create user", { timeout: 4000 });
        }
      })
      .catch((err) => {
        console.error("Error creating user:", err);
        toast.danger("An error occurred while creating the user", {
          timeout: 4000,
        });
      });
  };

  const handleEditUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as Role;
    const password = formData.get("password") as string | null;

    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${user?.organization?.id}/users/${selectedUserId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      }
    )
      .then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            const updatedUser = data.user;
            setOrgUsers((prev) =>
              prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
            );
            setIsEditUserModalOpen(false);
            setChangePassword(false);
            toast.success("User updated successfully", { timeout: 4000 });
          });
        } else {
          toast.danger("Failed to update user", { timeout: 4000 });
        }
      })
      .catch((err) => {
        console.error("Error updating user:", err);
        toast.danger("An error occurred while updating the user", {
          timeout: 4000,
        });
      });
  };

  useEffect(() => {
    if (!user?.organization?.id) return;

    const fetchOrgUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${user.organization!.id}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Failed to fetch organization");
        const data = await res.json();
        setOrgUsers(data.users ?? []);
      } catch (err) {
        console.error("Error fetching org users:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchOrgUsers();
  }, [user?.organization?.id]);

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

  if (user.role !== Role.ADMIN) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted">
          This page is only accessible to your organization admins.
        </p>
      </div>
    );
  }

  if (!user.organization) {
    return (
      <div>
        <h1 className="text-4xl font-bold mb-4">No Organization</h1>
        <p className="text-muted">
          You are not part of any organization. Please contact your
          administrator to be added to an organization.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold mb-4">{user?.organization?.name}</h1>
      <p className="text-muted text-lg mb-8">Manage your organization.</p>

      <h2 className="text-xl font-bold mb-5">Users</h2>
      <div className="mr-10">
        {isLoadingUsers ? (
          <Spinner size="sm" />
        ) : (
          <div className="max-h-100 overflow-y-auto">
            <ListBox
              selectionMode="single"
              selectedKeys={selectedUser}
              onSelectionChange={setSelectedUser}
            >
              {orgUsers.map((orgUser) => (
                <ListBox.Item
                  key={orgUser.id}
                  id={orgUser.id}
                  textValue={orgUser.name}
                  className="border border-muted/20 data-[selected=true]:border-accent py-3"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar
                      size="lg"
                      className="border border-muted/20"
                    >
                      {orgUser.avatar ? (
                        <Avatar.Image src={orgUser.avatar} />
                      ) : (
                        <Avatar.Fallback>
                          {orgUser.name?.charAt(0).toUpperCase()}
                        </Avatar.Fallback>
                      )}
                    </Avatar>

                    <div>
                      <p className="font-medium">{orgUser.name}</p>
                      <p className="text-sm text-muted">{orgUser.email}</p>
                    </div>
                    {orgUser.role === Role.ADMIN && (
                      <Chip
                        color="danger"
                        variant="soft"
                      >
                        {orgUser.role}
                      </Chip>
                    )}
                    {orgUser.role === Role.USER && (
                      <Chip
                        color="accent"
                        variant="soft"
                      >
                        {orgUser.role}
                      </Chip>
                    )}
                  </div>
                  <ListBox.ItemIndicator className="text-accent" />
                </ListBox.Item>
              ))}
            </ListBox>
          </div>
        )}
        <div className="flex space-x-4">
          <Modal>
            <Button
              size="lg"
              className="w-full mt-5"
            >
              <PlusCircleIcon />
              Create User
            </Button>
            <Modal.Backdrop>
              <Modal.Container size="lg">
                <Modal.Dialog>
                  {(renderProps) => (
                    <>
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading className="text-2xl font-bold mb-5">
                          Create User
                        </Modal.Heading>
                      </Modal.Header>
                      <Modal.Body>
                        <Form
                          onSubmit={handleCreateUser}
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
                              placeholder="Enter user name"
                              variant="secondary"
                              className="text-lg"
                            />
                            <FieldError />
                          </TextField>
                          <TextField
                            isRequired
                            name="email"
                            type="email"
                          >
                            <Label className="text-lg">Email</Label>
                            <Input
                              placeholder="Enter user email"
                              variant="secondary"
                              className="text-lg"
                            />
                            <FieldError />
                          </TextField>
                          <TextField
                            isRequired
                            name="password"
                            type="password"
                            minLength={6}
                          >
                            <Label className="text-lg">Password</Label>
                            <Input
                              placeholder="Enter user password"
                              variant="secondary"
                              className="text-lg"
                            />
                            <FieldError />
                          </TextField>
                          <Button
                            type="submit"
                            size="lg"
                            className="mt-5 w-full text-xl font-bold"
                            onPress={() => renderProps.close()}
                          >
                            Create user
                          </Button>
                        </Form>
                      </Modal.Body>
                    </>
                  )}
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
          <Modal
            isOpen={isEditUserModalOpen}
            onOpenChange={(open) => {
              setIsEditUserModalOpen(open);
              if (!open) setChangePassword(false);
            }}
          >
            <Button
              variant="tertiary"
              size="lg"
              className="w-full mt-5"
              onPress={() => {
                if (selectedUserData) {
                  setIsEditUserModalOpen(true);
                }
              }}
            >
              <EditIcon />
              Edit User
            </Button>
            <Modal.Backdrop>
              <Modal.Container size="lg">
                <Modal.Dialog>
                  {(renderProps) => (
                    <>
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading className="text-2xl font-bold mb-5">
                          Edit User
                        </Modal.Heading>
                      </Modal.Header>
                      <Modal.Body>
                        {selectedUserData && (
                          <div className="mx-1 mb-6 flex items-center space-x-4 p-4 bg-muted/10 rounded-4xl">
                            <Avatar
                              size="lg"
                              className="border border-muted/20"
                            >
                              {selectedUserData.avatar ? (
                                <Avatar.Image src={selectedUserData.avatar} />
                              ) : (
                                <Avatar.Fallback>
                                  {selectedUserData.name
                                    ?.charAt(0)
                                    .toUpperCase()}
                                </Avatar.Fallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-semibold text-lg">
                                {selectedUserData.name}
                              </p>
                              <p className="text-muted">
                                {selectedUserData.email}
                              </p>
                              <Chip
                                color="accent"
                                variant="soft"
                                className="mt-1"
                              >
                                {selectedUserData.role}
                              </Chip>
                            </div>
                            <AlertDialog>
                              <Button
                                variant="danger"
                                size="lg"
                                className="ml-auto"
                              >
                                <TrashIcon className="w-5 h-5" />
                                Delete User
                              </Button>

                              <AlertDialog.Backdrop>
                                <AlertDialog.Container>
                                  <AlertDialog.Dialog>
                                    <AlertDialog.CloseTrigger />
                                    <AlertDialog.Header>
                                      <AlertDialog.Icon status="danger" />
                                      <AlertDialog.Heading className="text-2xl font-bold">
                                        Confirm Deletion
                                      </AlertDialog.Heading>
                                    </AlertDialog.Header>
                                    <AlertDialog.Body>
                                      Are you sure you want to delete the user{" "}
                                      <span className="font-semibold text-lg">
                                        {selectedUserData.name}
                                      </span>{" "}
                                      with ID{" "}
                                      <span className="text-lg font-mono bg-background/50 px-1 rounded border border-muted/20">
                                        {selectedUserData.id}
                                      </span>
                                      ? This action cannot be undone.
                                    </AlertDialog.Body>
                                    <AlertDialog.Footer>
                                      <Button
                                        slot="close"
                                        variant="tertiary"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        slot="close"
                                        variant="danger"
                                        onPress={() => {}}
                                      >
                                        Delete User
                                      </Button>
                                    </AlertDialog.Footer>
                                  </AlertDialog.Dialog>
                                </AlertDialog.Container>
                              </AlertDialog.Backdrop>
                            </AlertDialog>
                          </div>
                        )}
                        <Form
                          onSubmit={handleEditUser}
                          className="mx-1 space-y-4"
                        >
                          <TextField
                            isRequired
                            name="name"
                            type="text"
                            minLength={1}
                            defaultValue={selectedUserData?.name}
                          >
                            <Label className="text-lg">Name</Label>
                            <Input
                              placeholder="Enter user name"
                              variant="secondary"
                              className="text-lg"
                            />
                            <FieldError />
                          </TextField>
                          <TextField
                            isRequired
                            name="email"
                            type="email"
                            defaultValue={selectedUserData?.email}
                          >
                            <Label className="text-lg">Email</Label>
                            <Input
                              placeholder="Enter user email"
                              variant="secondary"
                              className="text-lg"
                            />
                            <FieldError />
                          </TextField>
                          <Select
                            name="role"
                            isRequired
                            defaultSelectedKey={selectedUserData?.role}
                            variant="secondary"
                          >
                            <Label className="text-lg">Role</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item
                                  id={Role.ADMIN}
                                  textValue="Admin"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>Admin</span>
                                    <Chip
                                      color="danger"
                                      variant="soft"
                                      size="sm"
                                    >
                                      Full Access
                                    </Chip>
                                  </div>
                                </ListBox.Item>
                                <ListBox.Item
                                  id={Role.USER}
                                  textValue="User"
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span>User</span>
                                    <Chip
                                      color="accent"
                                      variant="soft"
                                      size="sm"
                                    >
                                      Standard Access
                                    </Chip>
                                  </div>
                                </ListBox.Item>
                              </ListBox>
                            </Select.Popover>
                          </Select>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="changePassword"
                                checked={changePassword}
                                onChange={(e) =>
                                  setChangePassword(e.target.checked)
                                }
                                className="w-4 h-4 accent-accent cursor-pointer"
                              />
                              <label
                                htmlFor="changePassword"
                                className="text-lg cursor-pointer flex items-center space-x-2"
                              >
                                <KeyIcon />
                                <span>Change password</span>
                              </label>
                            </div>

                            {changePassword && (
                              <TextField
                                isRequired
                                name="password"
                                type="password"
                                minLength={6}
                              >
                                <Label className="text-lg">New Password</Label>
                                <Input
                                  placeholder="Enter new password"
                                  variant="secondary"
                                  className="text-lg"
                                  minLength={6}
                                />
                                <FieldError />
                              </TextField>
                            )}
                          </div>

                          <Button
                            type="submit"
                            size="lg"
                            className="mt-5 w-full text-xl font-bold"
                          >
                            Save changes
                          </Button>
                        </Form>
                      </Modal.Body>
                    </>
                  )}
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </div>
      </div>
    </div>
  );
}
