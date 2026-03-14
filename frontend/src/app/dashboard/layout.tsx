"use client";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { useState } from "react";
import {
  Spinner,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Dropdown,
  DropdownTrigger,
  DropdownPopover,
  DropdownMenu,
  DropdownItem,
  Label,
  Modal,
  toast,
} from "@heroui/react";
import { NavLogo } from "../components/nav-logo";
import { useRouter } from "next/navigation";
import { DownArrowIcon, EditIcon, LogoutIcon } from "../components/icons";
import { DashboardNav } from "../components/dashboard-nav";
import { EditUserModalBody } from "../components/editUserModalBody";
import { Role } from "../types/user";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, updateUser } = useAuth();
  const router = useRouter();

  const [isEditModalVisible, setEditModalVisible] = useState(false);

  const [changePassword, setChangePassword] = useState(false);
  const handleEditUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as Role;
    const oldPassword = formData.get("oldPassword") as string | null;
    const newPassword = formData.get("newPassword") as string | null;
    const avatar = formData.get("avatar") as string | null;

    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/organizations/${user?.organization?.id}/users/${user?.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          oldPassword,
          newPassword,
          avatar,
        }),
      }
    )
      .then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            const updatedUser = data.user;
            setEditModalVisible(false);
            setChangePassword(false);
            updateUser(updatedUser);
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

  const handleLogout = () => {
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="xl" />
      </div>
    );
  }

  return isAuthenticated ? (
    <div className="h-screen flex flex-col">
      <header className="flex justify-between items-center w-full h-30 bg-surface px-4 border-b border-muted">
        <NavLogo />
        {user && (
          <Dropdown>
            <DropdownTrigger>
              <div className="flex items-center gap-3 mr-8">
                <Avatar size="lg">
                  <AvatarImage
                    src={user.avatar || undefined}
                    alt={user.name}
                  />
                  <AvatarFallback>
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white text-xl font-semibold text-left">
                    {user.name}
                  </p>
                  <p className="text-muted text-md text-left">
                    {user.organization?.name}
                  </p>
                </div>
                <DownArrowIcon className="w-7 h-7" />
              </div>
            </DropdownTrigger>
            <DropdownPopover>
              <DropdownMenu>
                <DropdownItem
                  textValue="Edit Profile"
                  onAction={() => setEditModalVisible(true)}
                >
                  <EditIcon />
                  <Label>Edit Profile</Label>
                </DropdownItem>
                <DropdownItem
                  textValue="Logout"
                  variant="danger"
                  onAction={handleLogout}
                >
                  <LogoutIcon className="text-danger" />
                  <Label>Logout</Label>
                </DropdownItem>
              </DropdownMenu>
            </DropdownPopover>
          </Dropdown>
        )}
        <Modal
          isOpen={isEditModalVisible}
          onOpenChange={setEditModalVisible}
        >
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.Body>
                  <EditUserModalBody
                    {...user}
                    handleDeleteUser={() => Promise.resolve()}
                    handleEditUser={handleEditUser}
                    changePassword={changePassword}
                    setChangePassword={setChangePassword}
                    canDeleteUser={false}
                    requester={user || undefined}
                  />
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </header>
      <div className="flex flex-1 bg-background">
        <DashboardNav className="" />
        <main className="flex-1 mt-10 ml-10 pr-0">{children}</main>
      </div>
    </div>
  ) : null;
}
