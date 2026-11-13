"use client";

import { createContext, useContext, type ReactNode } from "react";

type PreviewUser = { id: string; name: string; email?: string; phone?: string };
type AuthContextType = {
  user: PreviewUser | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);
const previewSession: AuthContextType = { user: null, isLoading: false };

// Authentication is not integrated. Do not request the old project's session
// endpoints or invent a signed-in identity for the preview workspace.
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={previewSession}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
