"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Form,
  TextField,
  Label,
  InputGroup,
  FieldError,
  InputGroupPrefix,
  InputGroupSuffix,
  InputGroupInput,
  Button,
  Spinner,
} from "@heroui/react";
import { FeatureCard } from "./components/feature-card";
import {
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  TraceabilityIcon,
  VerifyIcon,
  SubmitArrowIcon,
} from "./components/icons";
import { NavLogo } from "./components/nav-logo";

export default function Home() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/auth/verify`,
          {
            credentials: "include",
          }
        );

        if (response.ok) {
          router.push("/dashboard");
        }
      } catch (error) {
        // Usuario no autenticado, mostrar login
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError("Invalid email or password");
        } else {
          setError("An error occurred. Please try again.");
        }
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <header>
        <NavLogo />
      </header>
      <div className="flex w-full h-screen">
        <section className="w-1/2 px-20">
          <h2 className="text-5xl font-black text-accent">Green Hydrogen</h2>
          <h2 className="text-5xl font-black text-white">
            Blockchain Solution
          </h2>
          <p className="text-xl text-muted mt-6">
            <span className="font-black text-4xl">T</span>rust,{" "}
            <span className="font-black text-4xl">T</span>ransparency, and{" "}
            <span className="font-black text-4xl">T</span>
            raceability for green hydrogen guarantees of origin.
          </p>
          <div className="grid grid-rows-2 grid-cols-2 gap-5 mt-10">
            <FeatureCard
              icon={VerifyIcon}
              title="TRUST"
              description="We ensure trust by allowing only authorized participants to validate transactions and ensuring every transaction is immutable."
            />
            <FeatureCard
              icon={EyeIcon}
              title="TRANSPARENCY"
              description="We provide transparency by giving permitted users clear and auditable access to all transactions within the network."
            />
            <FeatureCard
              icon={TraceabilityIcon}
              title="TRACEABILITY"
              description="We enable traceability by recording every action on the network, allowing assets and data to be tracked from start to finish."
              className="col-span-2"
            />
          </div>
        </section>
        <section className="w-1/2 px-20 ">
          <div className="bg-black/30 backdrop-blur-md p-10 rounded-4xl border border-muted/15">
            <h3 className="text-3xl font-bold mb-2">Welcome Back</h3>
            <p className="text-lg text-muted mb-6">
              Login with your credentials
            </p>
            <Form
              className="space-y-5"
              onSubmit={handleSubmit}
            >
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
                <Label className="text-lg mb-1">Email</Label>
                <InputGroup className="border border-muted/15 focus-within:border-transparent">
                  <InputGroupPrefix>
                    <EnvelopeIcon className="size-5" />
                  </InputGroupPrefix>
                  <InputGroupInput
                    className="py-2 text-lg"
                    placeholder="name@email.com"
                  />
                </InputGroup>
                <FieldError />
              </TextField>

              <TextField
                isRequired
                name="password"
                type={showPassword ? "text" : "password"}
              >
                <Label className="text-lg mb-1">Password</Label>
                <InputGroup className="border border-muted/15 focus-within:border-transparent">
                  <InputGroupPrefix>
                    <LockIcon className="size-5" />
                  </InputGroupPrefix>
                  <InputGroupInput
                    className="py-2 text-lg"
                    placeholder="Enter your password"
                  />
                  <InputGroupSuffix
                    className="cursor-pointer"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="size-5" />
                    ) : (
                      <EyeIcon className="size-5" />
                    )}
                  </InputGroupSuffix>
                </InputGroup>
                <FieldError />
              </TextField>

              {error && (
                <div className="bg-danger/10 border border-danger/50 text-danger px-4 py-3 rounded-2xl text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                isDisabled={isLoading}
                className="w-full py-7 text-2xl font-bold bg-accent hover:bg-accent/80 focus:bg-focus transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing In..." : "Sign In"}
                {!isLoading && (
                  <SubmitArrowIcon className="inline-block ml-1 size-6 transition-transform duration-200 group-hover:translate-x-1" />
                )}
              </Button>
            </Form>
          </div>
        </section>
      </div>
    </>
  );
}
