import { apiRequest } from "../api/client";

export type OperationalSafetyEventStatus = "open" | "resolved";

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

  status: OperationalSafetyEventStatus;

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

/**
 * Bootstrap the dashboard from durable PostgreSQL state.
 *
 * Realtime events are layered over this response separately.
 */
export function listOperationalSafetyEvents(
  tenantId: string,
  limit = 20,
): Promise<OperationalSafetyEventPage> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  return apiRequest<OperationalSafetyEventPage>(
    `/operational-safety-events?${params.toString()}`,
    {
      tenantId,
    },
  );
}
