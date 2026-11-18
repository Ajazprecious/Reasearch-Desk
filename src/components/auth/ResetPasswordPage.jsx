import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { localClient } from "@/api/localClient";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";

export function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get("token");
  const returnTo = safeReturnTo();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await localClient.auth.resetPassword({ resetToken: token, newPassword: password });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Failed to reset password");
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Invalid reset link"
        subtitle="This password reset link is missing or invalid."
        tagline="Manage your research work in one place."
        description="Manage supervisor assignment, writing, drafts, feedback, milestones and progress in one workspace."
        footer={<Link to="/forgot-password" className="font-medium text-[#126F67] hover:underline">Request a new link</Link>}
      >
        <p className="rd-auth-result">The link you used appears to be incomplete. Please request a new password reset email.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create a new password"
      subtitle="Choose a strong password for your postgraduate research workspace."
      cardSize="reset"
      tagline="Manage your research work in one place."
      description="Manage supervisor assignment, writing, drafts, feedback, milestones and progress in one workspace."
    >
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="rd-auth-form">
        <div className="rd-auth-field">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            placeholder="Enter new password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className="rd-auth-field">
          <Label htmlFor="reset-confirm">Confirm password</Label>
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat new password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={8}
            required
          />
        </div>
        <SubmitButton busy={busy} busyLabel="Updating...">Update password</SubmitButton>
      </form>
      <p className="rd-auth-back-link">
        Return to{" "}
        <AuthLink to="/login" returnTo={returnTo}>Sign in</AuthLink>
      </p>
    </AuthLayout>
  );
}
