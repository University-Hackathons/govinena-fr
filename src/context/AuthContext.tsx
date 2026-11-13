"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Profile } from "@/lib/auth/profile";
type AuthContextType = {
    user: Profile & {
        name: string;
    };
    isLoading: false;
};
const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children, user }: {
    children: ReactNode;
    user: Profile;
}) {
    return <AuthContext.Provider value={{ user: { ...user, name: user.email.split("@")[0] }, isLoading: false }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used within the authenticated workspace");
    return context;
}
