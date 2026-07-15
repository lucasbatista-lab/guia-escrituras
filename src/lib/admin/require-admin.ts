import "server-only";

import { requireAdminUser, type AuthUserContext } from "@/lib/auth/session";

/**
 * Defense-in-depth for every admin helper that uses the service_role client.
 * Layout/API checks are not enough — helpers must refuse non-admins themselves.
 */
export async function assertAdminServiceAccess(): Promise<AuthUserContext> {
  return requireAdminUser();
}
