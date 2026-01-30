"use client";

import {
  Form,
  TextField,
  Label,
  InputGroup,
  Input,
  FieldError,
  InputGroupPrefix,
  InputGroupInput,
} from "@heroui/react";
import { EnvelopeIcon, LockIcon } from "./components/icons";

export default function Home() {
  return (
    <div>
      <h1>H2GO</h1>
      <h2>
        The triple <span color="">&apos;T&apos;</span> solution
      </h2>
      <Form>
        <TextField
          isRequired
          name="email"
          type="email"
          validate={(value) => {
            if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
              return "Please enter a valid email address";
            }
            return null;
          }}
        >
          <Label>Email</Label>
          <InputGroup>
            <InputGroupPrefix>
              <EnvelopeIcon className="size-4 text-muted" />
            </InputGroupPrefix>
            <InputGroupInput placeholder="name@email.com" />
          </InputGroup>
          <FieldError />
        </TextField>

        <TextField
          isRequired
          name="password"
          type="password"
        >
          <Label>Password</Label>
          <InputGroup>
            <InputGroupPrefix>
              <LockIcon className="size-4 text-muted" />
            </InputGroupPrefix>
            <InputGroupInput placeholder="Enter your password" />
          </InputGroup>
          <FieldError />
        </TextField>
      </Form>
    </div>
  );
}
