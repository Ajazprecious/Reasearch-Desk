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
  if (user.role === "admin") return "admin";
  if (user.app_role === "student" || user.app_role === "supervisor" || user.app_role === "admin") {
    return user.app_role;
  }
  return null;
}

export function isAdmin(user) {
  return resolveRole(user) === "admin";
}