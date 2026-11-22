import { apiRequest } from "../api/client";

export interface TrackerAuditEvent {
  id: string;
  tenantId: string;
  tenantName?: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TrackerAuditPage {
  items: TrackerAuditEvent[];
  nextCursor: string | null;
}

function buildQuery(entityId: string, cursor?: string): string {
  const params = new URLSearchParams({
    entityId,
    limit: "25",
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  return params.toString();
}

export function listTenantTrackerAudit(
  tenantId: string,
  vehicleId: string,
  cursor?: string,
): Promise<TrackerAuditPage> {
  const params = new URLSearchParams(buildQuery(vehicleId, cursor));
  params.set("entityType", "vehicle");
  params.set("actionPrefix", "vehicle.tracker_change.");

  return apiRequest<TrackerAuditPage>(`/admin/audit-log?${params}`, {
    tenantId,
  });
}

export function listPlatformTrackerAudit(
  cursor?: string,
): Promise<TrackerAuditPage> {
  const params = new URLSearchParams({ limit: "25" });

  if (cursor) {
    params.set("cursor", cursor);
  }

  return apiRequest<TrackerAuditPage>(
    `/platform/tracker-change-audit?${params}`,
  );
}
