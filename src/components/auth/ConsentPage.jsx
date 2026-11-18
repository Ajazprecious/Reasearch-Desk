import { ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export function ConsentPage() {
  return (
    <AuthLayout icon={ShieldCheck} title="External access is unavailable" subtitle="This local ResearchDesk installation does not include an external MCP authorization provider." />
  );
}
