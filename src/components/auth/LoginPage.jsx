import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { RoleSelector } from "@/components/auth/RoleSelector";
import { AuthError, AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithMfa } from "@/lib/authMfa";
import { safeReturnTo } from "@/lib/authReturnTo";
import { readIntendedRole, rememberIntendedRole } from "@/lib/intendedRole";

export function LoginPage() {
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = readIntendedRole();
    if (stored) setRole(stored);
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await loginWithMfa(email, password, remember);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid email or password");
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your postgraduate research workspace."
      footer={null}
    >
      <RoleSelector
        value={role}
        variant="tabs"
        label="Choose your account type"
        onChange={(next) => {
          setRole(next);
          rememberIntendedRole(next);
        }}
      />
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="rd-auth-form">
        <div className="rd-auth-field">
          <Label htmlFor="login-email">Institutional email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="name@institution.edu.ng"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="rd-auth-field">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="rd-auth-remember-row">
          <label>
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <AuthLink to="/forgot-password" returnTo={returnTo}>
            Forgot password?
          </AuthLink>
        </div>
        <SubmitButton busy={busy} busyLabel="Signing in...">
          Sign in
        </SubmitButton>
      </form>
      <div className="rd-auth-login-footnote">
        New to the workspace?{" "}
        <AuthLink to="/register" returnTo={returnTo}>Create an account</AuthLink>
        <p>Use your institutional credentials. Your role determines the workspace you see after sign-in.</p>
      </div>
    </AuthLayout>
  );
}
