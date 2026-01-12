import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  role: "user" | "admin";
  createdAt: Date;
}

export function useCustomAuth() {
  const { data: user, isLoading, error, refetch } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    await refetch();
    window.location.href = "/login";
  }, [logoutMutation, refetch]);

  return {
    user: user as AuthUser | null,
    isLoading,
    error,
    isAuthenticated: !!user,
    logout,
    refetch,
  };
}
