"use client";

import { CircleCheckIcon, KeyIcon, UsersIcon } from "@/app/components/icons";
import { useAuth } from "@/app/hooks/useAuth";
import { Role, User } from "@/app/types/user";
import { AlertDialog, Avatar, Button, Chip, FieldError, Fieldset, Form, Input, Label, ListBox, Modal, Spinner, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrganizationPage() {
  const { user, isLoading, authorizedByOrgs } = useAuth();
  const router = useRouter();

  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

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
      {isLoadingUsers ? (
        <Spinner size="sm" />
      ) : (
        <ListBox selectionMode="single">
          {orgUsers.map((orgUser) => (
            <ListBox.Item key={orgUser.id} textValue={orgUser.name} className="border border-muted/20 data-[selected=true]:border-accent py-3">
              <div className="flex items-center space-x-4">
                <Avatar size="lg">
                  {orgUser.avatar ? (
                    <Avatar.Image src={orgUser.avatar} />
                  ) : (
                    <Avatar.Fallback>{orgUser.name}</Avatar.Fallback>
                  )}
                </Avatar>

                <div>
                  <p className="font-medium">{orgUser.name}</p>
                  <p className="text-sm text-muted">{orgUser.email}</p>
                </div>
                <Chip color="accent" variant="soft">{orgUser.role}</Chip>
              </div>
              <ListBox.ItemIndicator className="text-accent" />
            </ListBox.Item>
          ))}
        </ListBox>
      )}
      <div className="flex space-x-4">
        <Modal>
          <Button size="lg" className="w-full mt-5">
            Create User
          </Button>
          <Modal.Backdrop>
            <Modal.Container size="lg">
              <Modal.Dialog>
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>
                    Create User
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <Form>
                    <TextField isRequired name="name" type="text" minLength={1}>
                      <Label>Name</Label>
                      <Input placeholder="Enter user name" variant="secondary" />
                      <FieldError />
                    </TextField>
                    <TextField isRequired name="email" type="email">
                      <Label>Email</Label>
                      <Input placeholder="Enter user email" variant="secondary" />
                      <FieldError />
                    </TextField>
                    <TextField isRequired name="password" type="password">
                      <Label>Password</Label>
                      <Input placeholder="Enter user password" variant="secondary" />
                      <FieldError />
                    </TextField>
                    <Button type="submit" className="mt-5 w-full">
                      <CircleCheckIcon />
                      Create user
                    </Button>
                  </Form>
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
        <AlertDialog>
          <Button size="lg" variant="danger" className="w-full mt-5">
            Delete User
          </Button>
        </AlertDialog>
      </div>
    </div>
  );
}
