import type { SessionPayload } from "@/lib/session";
import type { PermissionKey } from "@/lib/rbac/permissions";

export function hasPermission(
  session: Pick<SessionPayload, "permissions"> | null,
  permission: PermissionKey
): boolean {
  return session?.permissions.includes(permission) ?? false;
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requirePermission(
  session: Pick<SessionPayload, "permissions"> | null,
  permission: PermissionKey
): void {
  if (!hasPermission(session, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}
