"use client";

import {
  CircleCheckIcon,
  EditIcon,
  KeyIcon,
  PlusCircleIcon,
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

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${user?.organization?.id}/users`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        }
      );
      if (!res.ok) throw new Error("Failed to create user");
      const { user: newUser } = await res.json();
      setOrgUsers((prev) => [...prev, newUser]);
      setIsCreateUserModalOpen(false);
    } catch (err) {
      console.error("Error creating user:", err);
    }
  };

  const handleEditUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${user?.organization?.id}/users`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        }
      );
      if (!res.ok) throw new Error("Failed to edit user");
      const { user: updatedUser } = await res.json();
      setOrgUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      setIsEditUserModalOpen(false);
    } catch (err) {
      console.error("Error editing user:", err);
    }
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
            <ListBox selectionMode="single">
              {orgUsers.map((orgUser) => (
                <ListBox.Item
                  key={orgUser.id}
                  textValue={orgUser.name}
                  className="border border-muted/20 data-[selected=true]:border-accent py-3"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar size="lg">
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
                    <Chip
                      color="accent"
                      variant="soft"
                    >
                      {orgUser.role}
                    </Chip>
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
          <Modal>
            <Button
              variant="tertiary"
              size="lg"
              className="w-full mt-5"
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
                        <Form
                          onSubmit={handleEditUser}
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
                            Edit user
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
