import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { AuthLayout } from "./AuthLayout";

export function UserNotRegistered() {
  const { logout } = useAuth();
  return (
    <AuthLayout icon={UserX} title="Access not granted" subtitle="Your account is not registered in this local workspace.">
      <p className="mb-6 text-center text-sm text-foreground">Contact your workspace administrator or sign in with another account.</p>
      <Button variant="outline" className="h-12 w-full font-medium" onClick={logout}>
        Sign out
      </Button>
    </AuthLayout>
  );
}
