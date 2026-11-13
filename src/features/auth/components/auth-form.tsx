"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitAuth } from "../actions";
import type { AuthMode, AuthState } from "../validation";

const titles = {
  login: "Welcome back",
  register: "Create your account",
  "forgot-password": "Reset your password",
  "reset-password": "Choose a new password",
};
const buttons = {
  login: "Sign in",
  register: "Create account",
  "forgot-password": "Send reset link",
  "reset-password": "Update password",
};

function AuthField({
  name, label, type, autoComplete, disabled, errors, minLength, help,
}: {
  name: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
  disabled: boolean;
  errors?: string[];
  minLength?: number;
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={type === "email" ? 320 : 128}
        required
        disabled={disabled}
        aria-invalid={!!errors?.length}
        aria-describedby={`${name}-error${help ? ` ${name}-help` : ""}`}
      />
      {help && <p id={`${name}-help`} className="text-xs text-muted-foreground">{help}</p>}
      <p id={`${name}-error`} className="text-sm text-destructive">{errors?.[0]}</p>
    </div>
  );
}

export function AuthForm({ mode, linkError = false }: { mode: AuthMode; linkError?: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(submitAuth.bind(null, mode), {});
  const email = mode !== "reset-password";
  const password = mode !== "forgot-password";
  const confirm = mode === "register" || mode === "reset-password";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-20">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle><h1>{titles[mode]}</h1></CardTitle>
          <CardDescription>GoviNena · AgriMarket</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {linkError && (
            <p role="alert" className="text-sm text-destructive">
              This email link is invalid or expired. Request a new link.
            </p>
          )}
          <form action={action} className="space-y-4" aria-label={titles[mode]}>
            {email && (
              <AuthField
                name="email" label="Email" type="email" autoComplete="email"
                disabled={pending} errors={state.fields?.email}
              />
            )}
            {password && (
              <AuthField
                name="password"
                label={mode === "reset-password" ? "New password" : "Password"}
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={mode === "login" ? 1 : 8}
                disabled={pending}
                errors={state.fields?.password}
                help={mode === "login" ? undefined : "Use 8–128 characters."}
              />
            )}
            {confirm && (
              <AuthField
                name="confirmPassword" label="Confirm password" type="password"
                autoComplete="new-password" disabled={pending} errors={state.fields?.confirmPassword}
              />
            )}
            {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
            {state.success && <p role="status" className="text-sm">{state.success}</p>}
            <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
              {pending ? "Please wait…" : buttons[mode]}
            </Button>
          </form>
          <nav aria-label="Account links" className="flex flex-wrap gap-x-4 gap-y-2 text-sm underline underline-offset-4">
            {mode !== "login" && <Link href="/login">Sign in</Link>}
            {mode === "login" && (
              <><Link href="/register">Create account</Link><Link href="/forgot-password">Forgot password?</Link></>
            )}
            {mode === "reset-password" && <Link href="/dashboard">Continue to workspace</Link>}
            <Link href="/">Back to home</Link>
          </nav>
        </CardContent>
      </Card>
    </main>
  );
}
