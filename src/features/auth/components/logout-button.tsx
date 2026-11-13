"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "../actions";
export function LogoutButton() {
    const [state, action, pending] = useActionState(logout, {});
    return <form action={action} className="w-full space-y-2 p-2">
    <Button variant="outline" type="submit" className="w-full" disabled={pending}>{pending ? "Signing out…" : "Sign out"}</Button>
    {state.error && <p role="alert" className="text-xs text-destructive">{state.error}</p>}
  </form>;
}
