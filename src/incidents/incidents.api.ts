import { apiRequest } from "../api/client";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type IncidentStatus = "open" | "resolved" | "closed";

export interface Incident {
  id: string;
  tenantId: string;

  schoolId: string | null;

  tripId: string | null;

  vehicleId: string | null;

  studentId: string | null;

  severity: IncidentSeverity;

  type: string;

  description: string;

  reportedByUserId: string;

  status: IncidentStatus;

  createdAt: string;

  updatedAt: string;

  closedAt: string | null;
}

export interface IncidentListResponse {
  items: Incident[];

  nextCursor: string | null;
}

export interface ListIncidentsQuery {
  status?: IncidentStatus;

  severity?: IncidentSeverity;

  schoolId?: string;

  tripId?: string;

  cursor?: string;

  limit?: number;
}

export interface CreateIncidentInput {
  /**
   * Relationship fields are supported by the backend,
   * but the first operational frontend intentionally
   * does not expose raw UUID entry fields.
   *
   * We can add safe lookup selectors separately.
   */
  schoolId?: string;
  tripId?: string;
  vehicleId?: string;
  studentId?: string;

  severity: IncidentSeverity;

  type: string;

  description: string;
}

export interface UpdateIncidentInput {
  severity?: IncidentSeverity;

  type?: string;

  description?: string;

  status?: IncidentStatus;
}

function buildQuery(query: ListIncidentsQuery): string {
  const params = new URLSearchParams();

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.severity) {
    params.set("severity", query.severity);
  }

  if (query.schoolId) {
    params.set("schoolId", query.schoolId);
  }

  if (query.tripId) {
    params.set("tripId", query.tripId);
  }

  if (query.cursor) {
    params.set("cursor", query.cursor);
  }

  if (query.limit) {
    params.set("limit", String(query.limit));
  }

  const value = params.toString();

  return value ? `?${value}` : "";
}

export function listIncidents(
  tenantId: string,
  query: ListIncidentsQuery = {},
): Promise<IncidentListResponse> {
  return apiRequest<IncidentListResponse>(`/incidents${buildQuery(query)}`, {
    tenantId,
  });
}

export function getIncident(
  tenantId: string,
  incidentId: string,
): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${incidentId}`, {
    tenantId,
  });
}

export function createIncident(
  tenantId: string,
  input: CreateIncidentInput,
  idempotencyKey: string,
): Promise<Incident> {
  return apiRequest<Incident>("/incidents", {
    method: "POST",

    tenantId,

    headers: {
      "Idempotency-Key": idempotencyKey,
    },

    body: JSON.stringify(input),
  });
}

export function updateIncident(
  tenantId: string,
  incidentId: string,
  input: UpdateIncidentInput,
): Promise<Incident> {
  return apiRequest<Incident>(`/incidents/${incidentId}`, {
    method: "PATCH",

    tenantId,

    body: JSON.stringify(input),
  });
}
