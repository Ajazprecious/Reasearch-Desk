// Role resolution shared by the workspace shell, the role router and server functions.
// `admin` is the built-in account role an institution's research office holds; students and
// supervisors carry their workspace role on the account as `app_role`.
export const ROLE_HOME = {
  student: "/student",
  supervisor: "/supervisor",
  admin: "/admin",
};

export const ROLE_LABEL = {
  student: "Postgraduate student",
  supervisor: "Research supervisor",
  admin: "Postgraduate administrator",
};

export function resolveRole(user) {
  if (!user) return null;
  const accountRole = String(user.role || "").toLowerCase();
  const appRole = String(user.app_role || "").toLowerCase();
  if (accountRole === "admin" || accountRole === "administrator" || appRole === "admin") return "admin";
  if (appRole === "student" || appRole === "supervisor") {
    return appRole;
  }
  return null;
}

export function isAdmin(user) {
  return resolveRole(user) === "admin";
}