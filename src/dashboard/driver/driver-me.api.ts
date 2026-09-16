import { apiRequest } from "../../api/client";

export type DriverTripStatus =
  "scheduled" | "boarding" | "in_progress" | "completed";

export interface DriverAssignedTrip {
  id: string;
  serviceDate: string;
  scheduledStartAt: string;
  scheduledEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  status: DriverTripStatus;

  driverName: string;

  routeName: string;
  routeCode: string | null;

  vehicleRegistrationNumber: string | null;

  stopCount: number;
}

export function getMyAssignedTrip(
  tenantId: string,
): Promise<DriverAssignedTrip | null> {
  return apiRequest<DriverAssignedTrip | null>("/me/driver/trip", {
    tenantId,
  });
}

export function beginMyBoarding(tenantId: string): Promise<DriverAssignedTrip> {
  return apiRequest<DriverAssignedTrip>("/me/driver/trip/board", {
    method: "POST",
    tenantId,
  });
}

export function startMyTrip(tenantId: string): Promise<DriverAssignedTrip> {
  return apiRequest<DriverAssignedTrip>("/me/driver/trip/start", {
    method: "POST",
    tenantId,
  });
}

export function completeMyTrip(tenantId: string): Promise<DriverAssignedTrip> {
  return apiRequest<DriverAssignedTrip>("/me/driver/trip/complete", {
    method: "POST",
    tenantId,
  });
}

// ============================================================
// DRIVER RELATIONSHIP-SCOPED INCIDENT REPORTING
// ============================================================

export type DriverIncidentSeverity = "low" | "medium" | "high" | "critical";

export interface ReportDriverIncidentInput {
  /**
   * IMPORTANT:
   *
   * There are intentionally NO relationship IDs here.
   *
   * schoolId / tripId / vehicleId are derived by the backend
   * from the authenticated Driver's active assignment.
   */
  severity: DriverIncidentSeverity;

  type: string;

  description: string;
}

export interface DriverReportedIncident {
  id: string;

  severity: DriverIncidentSeverity;

  type: string;

  description: string;

  status: "open" | "resolved" | "closed";

  createdAt: string;
}

/**
 * Relationship-scoped Driver incident report.
 *
 * This must NEVER call the generic POST /incidents endpoint.
 */
export function reportMyDriverIncident(
  tenantId: string,

  input: ReportDriverIncidentInput,

  idempotencyKey: string,
): Promise<DriverReportedIncident> {
  return apiRequest<DriverReportedIncident>("/me/driver/incidents", {
    method: "POST",

    tenantId,

    headers: {
      "Idempotency-Key": idempotencyKey,
    },

    body: JSON.stringify(input),
  });
}

// ============================================================
// DRIVER JOURNEY PROGRESS
// ============================================================

export type DriverJourneyStopStatus =
  "pending" | "arrived" | "departed" | "skipped";

export interface DriverJourneyStop {
  id: string;

  stopOrder: number;

  stopName: string;

  stopCode: string | null;

  scheduledArrivalAt: string | null;

  actualArrivalAt: string | null;

  actualDepartureAt: string | null;

  status: DriverJourneyStopStatus;
}

export interface DriverJourneyProgress {
  tripId: string;

  tripStatus: DriverTripStatus;

  totalStops: number;

  completedStops: number;

  progressPercent: number;

  currentStop: DriverJourneyStop | null;

  nextStop: DriverJourneyStop | null;

  stops: DriverJourneyStop[];
}

/**
 * Relationship-scoped Driver journey progress.
 *
 * SECURITY:
 *
 * The frontend does NOT supply a trip ID.
 *
 * The backend derives:
 *
 * authenticated user
 *   -> Driver profile
 *   -> assigned trip
 *   -> ordered trip stops
 */
export function getMyJourneyProgress(
  tenantId: string,
): Promise<DriverJourneyProgress | null> {
  return apiRequest<DriverJourneyProgress | null>("/me/driver/trip/progress", {
    tenantId,
  });
}
