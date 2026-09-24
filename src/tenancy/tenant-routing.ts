/**
 * Build a canonical tenant-scoped application URL.
 *
 * IMPORTANT:
 * The tenant slug is navigation context only.
 *
 * Verified tenant membership remains authoritative for access.
 */
export function buildTenantPath(tenantSlug: string, section?: string): string {
  const base = `/tenant/${encodeURIComponent(tenantSlug)}`;

  return section ? `${base}/${section}` : base;
}
