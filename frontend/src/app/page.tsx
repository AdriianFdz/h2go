"use client";

import {
  Form,
  TextField,
  Label,
  InputGroup,
  FieldError,
  InputGroupPrefix,
  InputGroupInput,
} from "@heroui/react";
import { EnvelopeIcon, LockIcon } from "./components/icons";

export default function Home() {
  return (
    <div>
      <section className="max-w-50"></section>
      <section className="max-w-50">
        <Form className="space-y-3">
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
            <InputGroup className="border border-muted focus-within:border-transparent">
              <InputGroupPrefix>
                <EnvelopeIcon className="size-4" />
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
            <InputGroup className="border border-muted focus-within:border-transparent">
              <InputGroupPrefix>
                <LockIcon className="size-4" />
              </InputGroupPrefix>
              <InputGroupInput placeholder="Enter your password" />
            </InputGroup>
            <FieldError />
          </TextField>
        </Form>
      </section>
    </div>
  );
}
