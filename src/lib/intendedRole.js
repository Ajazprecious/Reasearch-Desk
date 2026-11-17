// The role a visitor picked on the sign-in / sign-up screen. It is applied once, on the
// first authenticated visit (src/routes/_authed/index.jsx), and never overwrites a role
// that is already stored on the account.
const KEY = "researchdesk:intended-role";

export const ROLE_OPTIONS = [
  { value: "student", label: "Student", hint: "Submit drafts, track milestones" },
  { value: "supervisor", label: "Supervisor", hint: "Review drafts, guide students" },
  { value: "admin", label: "Administrator", hint: "Assign supervisors, monitor" },
];

export function readIntendedRole() {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberIntendedRole(role) {
  try {
    if (role) window.localStorage.setItem(KEY, role);
  } catch {
    /* storage unavailable — the account keeps its existing role */
  }
}

export function clearIntendedRole() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}