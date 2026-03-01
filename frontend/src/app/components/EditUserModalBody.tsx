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
  TextField,
  Select,
} from "@heroui/react";
import { Role, User } from "../types/user";
import { KeyIcon, TrashIcon } from "./icons";
import { Organization } from "../types/organization";
import { FormEvent, Dispatch, SetStateAction, useRef, useState } from "react";

type EditUserModalBodyProps = {
  handleDeleteUser: () => Promise<void>;
  handleEditUser: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  changePassword: boolean;
  setChangePassword: Dispatch<SetStateAction<boolean>>;
  canDeleteUser: boolean;
  organization?: Organization;
  requester?: User;
} & Partial<User>;

export const EditUserModalBody = (props: EditUserModalBodyProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState<string>(props.avatar || "");
  const [avatarChanged, setAvatarChanged] = useState<boolean>(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setAvatar(reader.result);
          setAvatarChanged(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {props && (
        <div className="mx-1 mb-6 flex flex-col space-y-4 p-4 bg-muted/10 rounded-4xl">
          <div className="flex items-center space-x-4 justify-between">
            <div className="flex items-center space-x-4">
              <Avatar
                size="lg"
                className="border border-muted/20 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatar ? (
                  <Avatar.Image src={avatar} />
                ) : (
                  <Avatar.Fallback>
                    {props.name?.charAt(0).toUpperCase()}
                  </Avatar.Fallback>
                )}
              </Avatar>
              <Input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept="image/*"
                multiple={false}
                onChange={handleImageChange}
              />
              <div>
                <p className="font-semibold text-lg">{props.name}</p>
                <p className="text-muted">{props.email}</p>
              </div>
            </div>
            <div>
              {props.role === Role.ADMIN && (
                <Chip
                  color="danger"
                  variant="soft"
                  className="ml-auto"
                >
                  {props.role}
                </Chip>
              )}
              {props.role === Role.USER && (
                <Chip
                  color="accent"
                  variant="soft"
                  className="ml-auto"
                >
                  {props.role}
                </Chip>
              )}
            </div>
            {props.canDeleteUser && (
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
                          {props.name}
                        </span>{" "}
                        with ID{" "}
                        <span className="text-lg font-mono bg-background/50 px-1 rounded border border-muted/20">
                          {props.id}
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
                          onPress={() => props.handleDeleteUser()}
                        >
                          Delete User
                        </Button>
                      </AlertDialog.Footer>
                    </AlertDialog.Dialog>
                  </AlertDialog.Container>
                </AlertDialog.Backdrop>
              </AlertDialog>
            )}
          </div>
        </div>
      )}
      <Form
        id="editUserForm"
        onSubmit={props.handleEditUser}
        className="mx-1 space-y-4"
      >
        {avatarChanged && (
          <input
            type="hidden"
            name="avatar"
            value={avatar}
          />
        )}
        <TextField
          isRequired
          name="name"
          type="text"
          minLength={1}
          defaultValue={props.name}
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
          defaultValue={props.email}
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
          isDisabled={props.requester?.role !== Role.ADMIN}
          name="role"
          isRequired
          defaultSelectedKey={props.role}
          variant="secondary"
        >
          <Label className="text-lg">Role</Label>
          <Select.Trigger>
            <Select.Value className="text-lg" />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox className="text-lg">
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
              checked={props.changePassword}
              onChange={(e) => props.setChangePassword(e.target.checked)}
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
          {props.changePassword && (
            <>
              {props.requester?.role !== Role.ADMIN && (
                <TextField
                  isRequired
                  name="oldPassword"
                  type="password"
                  minLength={6}
                >
                  <Label className="text-lg">Old Password</Label>
                  <Input
                    placeholder="Enter old password"
                    variant="secondary"
                    className="text-lg"
                    minLength={6}
                  />
                  <FieldError />
                </TextField>
              )}
              <TextField
                isRequired
                name="newPassword"
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
            </>
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
    </>
  );
};
