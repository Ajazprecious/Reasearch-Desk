import { createStart } from "@tanstack/react-start";
import { authMiddleware, workspaceRequestMiddleware } from "@/lib/auth-middleware";

// Every server function and server route gets `context.getWorkspace()`, acting as the visitor.
export const startInstance = createStart(() => ({
  requestMiddleware: [workspaceRequestMiddleware],
  functionMiddleware: [authMiddleware],
}));
