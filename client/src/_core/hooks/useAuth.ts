import { trpc } from "@/lib/trpc";

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  lastSignedIn: string | Date;
}

const DEV_USER: User = {
  id: 1,
  openId: "dev_user",
  name: "Shlok",
  email: "shlok@morphix.ai",
  loginMethod: "dev",
  role: "admin",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastSignedIn: new Date().toISOString(),
};

export function useAuth() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore
    } finally {
      window.location.reload();
    }
  };

  // If authenticated user returned from server, use it. Otherwise fallback to DEV_USER for local dev preview.
  const user = meQuery.data ?? DEV_USER;

  return {
    user,
    loading: meQuery.isLoading,
    isLoading: meQuery.isLoading,
    isAuthenticated: !!user,
    error: meQuery.error ?? null,
    logout,
    refetch: meQuery.refetch,
  };
}
