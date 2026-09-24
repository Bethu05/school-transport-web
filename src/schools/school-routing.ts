/**
 * Build a canonical school-scoped application URL.
 *
 * IMPORTANT:
 * This is navigation context only.
 * Backend membership, permissions and relationship checks remain
 * authoritative for data access.
 */
export function buildSchoolPath(
  tenantSlug: string,
  schoolSlug: string,
  section: string,
): string {
  return `/school/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(
    schoolSlug,
  )}/${section}`;
}
