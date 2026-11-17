import { ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export function MfaPage() {
  return (
    <AuthLayout icon={ShieldCheck} title="Multi-factor sign-in unavailable" subtitle="Local accounts use email and password. Configure an identity provider to enable MFA." />
  );
}
