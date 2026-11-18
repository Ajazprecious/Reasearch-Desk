import { useState } from "react";
import { localClient } from "@/api/localClient";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";

export function ForgotPasswordPage() {
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await localClient.auth.resetPasswordRequest(email);
      setMessage(result.message);
    } catch (error) {
      setMessage(error.message || "Password reset is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your institutional email and we’ll send you a secure reset link."
      cardSize="short"
      tagline="Manage your research work in one place."
      description="Manage supervisor assignment, writing, drafts, feedback, milestones and progress in one workspace."
    >
      {message ? (
        <p className="rd-auth-result" role="status">{message}</p>
      ) : (
        <form onSubmit={submit} className="rd-auth-form">
          <div className="rd-auth-field">
            <Label htmlFor="forgot-email">Institutional email</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="name@institution.edu.ng"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <SubmitButton busy={busy} busyLabel="Sending...">Send reset link</SubmitButton>
        </form>
      )}
      <p className="rd-auth-back-link">
        Remembered it?{" "}
        <AuthLink to="/login" returnTo={returnTo}>Back to sign in</AuthLink>
      </p>
    </AuthLayout>
  );
}
