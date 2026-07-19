// Mirrors the backend's RoleHierarchyConfig: SUPER_ADMIN > COMPANY_ADMIN > ADMIN > SALES/SUPPORT/USER.
const IMPLIES: Record<string, string[]> = {
  ROLE_SUPER_ADMIN: ["ROLE_COMPANY_ADMIN"],
  ROLE_COMPANY_ADMIN: ["ROLE_ADMIN"],
  ROLE_ADMIN: ["ROLE_SALES", "ROLE_SUPPORT", "ROLE_USER"],
};

export function expandRoles(roles: string[]): Set<string> {
  const result = new Set(roles);
  const queue = [...roles];
  while (queue.length > 0) {
    const role = queue.pop()!;
    for (const implied of IMPLIES[role] ?? []) {
      if (!result.has(implied)) {
        result.add(implied);
        queue.push(implied);
      }
    }
  }
  return result;
}

export function hasEffectiveRole(roles: string[] | undefined, role: string): boolean {
  if (!roles) return false;
  return expandRoles(roles).has(role);
}

/**
 * Company-wide attendance/time access — true for admin-tier roles AND for the standalone
 * ROLE_HR_MANAGER role. ROLE_HR_MANAGER is deliberately NOT part of the general role hierarchy
 * (IMPLIES above): it grants full visibility/approval over everyone's time/attendance data and
 * nothing else — no Users, Billing, or other module access.
 */
export function hasCompanyWideAttendanceAccess(roles: string[] | undefined): boolean {
  if (!roles) return false;
  return hasEffectiveRole(roles, "ROLE_ADMIN") || roles.includes("ROLE_HR_MANAGER");
}

/**
 * Global (platform-wide) admins that stay accountless: ADMIN and SUPER_ADMIN. Mirrors
 * UserService.isGlobalAdmin. Uses a literal role check, NOT the hierarchy — COMPANY_ADMIN
 * implies ADMIN but is company-scoped and must carry an account, so it must NOT count here.
 */
export function isGlobalAdmin(roles: string[] | undefined): boolean {
  if (!roles) return false;
  return roles.includes("ROLE_ADMIN") || roles.includes("ROLE_SUPER_ADMIN");
}
