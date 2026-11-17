import { localClient } from "@/api/localClient";

export async function loginWithMfa(email, password, remember = false) {
  return localClient.auth.login({ email, password, remember });
}
