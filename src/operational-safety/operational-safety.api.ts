import { apiRequest } from "../api/client";

export type OperationalSafetyEventStatus = "open" | "resolved";

export type OperationalSafetyDriverReason =
  | "road_diversion"
  | "traffic_obstruction"
  | "emergency"
  | "wrong_turn"
  | "other";

export type OperationalSafetyHandlingStatus =
  "unacknowledged" | "acknowledged" | "closed";

export type OperationalSafetyStudentStatus =
  "all_safe" | "assistance_required" | "emergency";

export interface OperationalSafetyEvent {
  id: string;

  tenantId: string;
  schoolId: string | null;

  tripId: string;
  routeId: string;
  vehicleId: string;
  routeDeviationId: string;

  eventType: "route_deviation";

  severity: "low" | "medium" | "high" | "critical";

  /**
   * Physical GPS lifecycle.
   */
  status: OperationalSafetyEventStatus;

  driverReason: OperationalSafetyDriverReason | null;

  driverReasonRecordedAt: string | null;

  driverReasonRecordedByUserId: string | null;

  /**
   * Human handling lifecycle.
   *
   * A physically recovered route can still require human
   * follow-up until this reaches "closed".
   */
  handlingStatus: OperationalSafetyHandlingStatus;

  acknowledgedAt: string | null;

  acknowledgedByUserId: string | null;

  studentSafetyStatus: OperationalSafetyStudentStatus | null;

  teacherNote: string | null;

  closedAt: string | null;

  closedByUserId: string | null;

  firstObservedAt: string;
  confirmedAt: string;
  lastObservedAt: string;
  resolvedAt: string | null;

  initialDistanceMeters: number;
  maxDistanceMeters: number;
  lastDistanceMeters: number;
}

export interface OperationalSafetyEventPage {
  items: OperationalSafetyEvent[];

  nextCursor: string | null;
}

export interface ListOperationalSafetyEventsQuery {
  limit?: number;

  status?: OperationalSafetyEventStatus;

  cursor?: string;
}

/**
 * Cursor-paginated operational safety history.
 */
export function listOperationalSafetyEventsPage(
  tenantId: string,
  query: ListOperationalSafetyEventsQuery = {},
): Promise<OperationalSafetyEventPage> {
  const params = new URLSearchParams();

  params.set("limit", String(query.limit ?? 20));

  if (query.status) {
    params.set("status", query.status);
  }

  if (query.cursor) {
    params.set("cursor", query.cursor);
  }

  return apiRequest<OperationalSafetyEventPage>(
    `/operational-safety-events?${params.toString()}`,
    {
      tenantId,
    },
  );
}

/**
 * Backward-compatible dashboard bootstrap.
 */
export function listOperationalSafetyEvents(
  tenantId: string,
  limit = 20,
): Promise<OperationalSafetyEventPage> {
  return listOperationalSafetyEventsPage(tenantId, {
    limit,
  });
}
