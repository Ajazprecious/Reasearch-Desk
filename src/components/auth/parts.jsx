import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "./GoogleIcon";
import { returnToSearch } from "@/lib/authReturnTo";

// Small pieces the auth pages share.

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-[13px] text-[#C62828]">
      {children}
    </div>
  );
}

export function SubmitButton({ busy, busyLabel, children, ...props }) {
  return (
    <Button
      type="submit"
      className="rd-auth-submit"
      disabled={busy}
      {...props}
    >
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function GoogleButton({ returnTo, onError }) {
  void returnTo;
  void onError;
  return (
    <Button
      type="button"
      variant="outline"
      className="mb-6 h-12 w-full rounded-xl border-slate-200 text-[14px] font-medium text-slate-500 shadow-none"
      disabled
    >
      <GoogleIcon className="mr-2 h-5 w-5" />
      Google sign-in unavailable in local mode
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-100" />
      </div>
      <div className="relative flex justify-center text-[11px] uppercase tracking-[0.14em]">
        <span className="bg-white px-3 text-slate-400">or</span>
      </div>
    </div>
  );
}

// A link between auth screens that carries the way back (?returnTo=) along.
export function AuthLink({ to, returnTo, className = "font-medium text-[#00796B] hover:underline", children }) {
  return (
    <Link to={to} search={returnToSearch(returnTo)} className={className}>
      {children}
    </Link>
  );
}