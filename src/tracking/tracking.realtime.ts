import { io, type Socket } from "socket.io-client";

import { getAccessToken } from "../api/client";

const REALTIME_BASE_URL =
  import.meta.env.VITE_REALTIME_URL ?? "http://localhost:3002";

export interface VehicleLocationNextStop {
  tripStopId: string;
  stopId: string;
  stopOrder: number;
  stopName: string;

  stopCode: string | null;

  latitude: number;
  longitude: number;

  geofenceRadiusMeters: number;

  scheduledArrivalAt: string | null;

  status: "pending" | "arrived" | "departed" | "skipped";

  /**
   * Straight-line distance from the current GPS position.
   */
  distanceMeters: number;

  /**
   * Route-aware distance when route geometry is available.
   */
  routeDistanceMeters: number | null;

  withinGeofence: boolean;

  /**
   * Distance actually used by the ETA engine.
   */
  etaDistanceMeters: number;

  etaDistanceSource: string;

  etaSeconds: number | null;

  estimatedArrivalAt: string | null;

  etaSpeedKph: number | null;

  etaSource: string;

  etaSampleCount: number;
}

export interface VehicleLocationUpdate {
  tenantId: string;
  vehicleId: string;
  gpsDeviceId: string;

  tripId: string | null;

  routeId: string | null;

  arrivedStop: unknown | null;

  departedStop: unknown | null;

  nextStop: VehicleLocationNextStop | null;

  latitude: number;
  longitude: number;

  speedKph: number | null;

  heading: number | null;

  accuracyMeters: number | null;

  recordedAt: string;

  recordedAtEpochMs: number;

  receivedAt: string;
}

export interface TripStopEvent {
  eventId: string;
  tenantId: string;
  tripId: string;
  routeId: string;
  vehicleId: string;
  tripStopId: string;
  stopId: string;
  stopOrder: number;
  stopName: string;

  stopCode: string | null;

  latitude: number;
  longitude: number;
  distanceMeters: number;
  geofenceRadiusMeters: number;

  eventType: "trip.stop.arrived" | "trip.stop.departed";
}

export interface RouteDeviationConfirmedOperationalEvent {
  eventType: "operational.route_deviation.confirmed";

  eventId: string;

  tenantId: string;

  schoolId: string | null;

  tripId: string;

  routeId: string;

  vehicleId: string;

  routeDeviationId: string;

  severity: "high";

  status: "open";

  occurredAt: string;

  firstObservedAt: string;

  confirmedAt: string;

  triggerDistanceMeters: number;

  recoveryDistanceMeters: number;

  initialDistanceMeters: number;

  maxDistanceMeters: number;

  distanceMeters: number;

  latitude: number;

  longitude: number;
}

export interface RouteDeviationResolvedOperationalEvent {
  eventType: "operational.route_deviation.resolved";

  eventId: string;

  tenantId: string;

  schoolId: string | null;

  tripId: string;

  routeId: string;

  vehicleId: string;

  routeDeviationId: string;

  severity: "high";

  status: "resolved";

  occurredAt: string;

  resolvedAt: string;

  distanceMeters: number;

  latitude: number;

  longitude: number;
}

export type OperationalSafetyTelemetryStatus = "open" | "resolved";

export type OperationalSafetyHandlingStatus =
  "unacknowledged" | "acknowledged" | "closed";

export type OperationalSafetyDriverReason =
  | "road_diversion"
  | "traffic_obstruction"
  | "emergency"
  | "wrong_turn"
  | "other";

export type OperationalSafetyStudentStatus =
  "all_safe" | "assistance_required" | "emergency";

interface OperationalSafetyWorkflowEventBase {
  eventId: string;

  tenantId: string;

  safetyEventId: string;

  tripId: string;

  status: OperationalSafetyTelemetryStatus;

  handlingStatus: OperationalSafetyHandlingStatus;

  occurredAt: string;
}

export interface DriverReasonRecordedOperationalEvent extends OperationalSafetyWorkflowEventBase {
  eventType: "operational.safety.driver_reason_recorded";

  driverReason: OperationalSafetyDriverReason;

  recordedAt: string;
}

export interface OperationalSafetyAcknowledgedEvent extends OperationalSafetyWorkflowEventBase {
  eventType: "operational.safety.acknowledged";

  handlingStatus: "acknowledged";

  acknowledgedAt: string;
}

export interface OperationalSafetyAssessmentUpdatedEvent extends OperationalSafetyWorkflowEventBase {
  eventType: "operational.safety.assessment_updated";

  handlingStatus: "acknowledged";

  studentSafetyStatus: OperationalSafetyStudentStatus;
}

export interface OperationalSafetyClosedEvent extends OperationalSafetyWorkflowEventBase {
  eventType: "operational.safety.closed";

  status: "resolved";

  handlingStatus: "closed";

  studentSafetyStatus: OperationalSafetyStudentStatus;

  closedAt: string;
}

export type OperationalSafetyWorkflowRealtimeEvent =
  | DriverReasonRecordedOperationalEvent
  | OperationalSafetyAcknowledgedEvent
  | OperationalSafetyAssessmentUpdatedEvent
  | OperationalSafetyClosedEvent;

export type OperationalSafetyRealtimeEvent =
  | RouteDeviationConfirmedOperationalEvent
  | RouteDeviationResolvedOperationalEvent
  | OperationalSafetyWorkflowRealtimeEvent;

export interface TrackingConnectionReady {
  tenantId: string;
  userId: string;
}

export interface TrackingConnectionDenied {
  message: string;
}

export function createTrackingSocket(tenantId: string): Socket {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Authentication token is missing");
  }

  return io(`${REALTIME_BASE_URL}/tracking`, {
    autoConnect: false,

    transports: ["websocket"],

    auth: {
      token,
      tenantId,
    },
  });
}

export interface TripSubscriptionResult {
  ok: boolean;

  tripId?: string;

  scope?: "tenant" | "trip";

  message?: string;
}

export function subscribeToTrip(
  socket: Socket,
  tripId: string,
): Promise<TripSubscriptionResult> {
  return new Promise<TripSubscriptionResult>((resolve, reject) => {
    socket.timeout(5_000).emit(
      "trip.subscribe",
      {
        tripId,
      },
      (
        error: Error | null,

        response: TripSubscriptionResult,
      ) => {
        if (error) {
          reject(error);

          return;
        }

        resolve(response);
      },
    );
  });
}

export function unsubscribeFromTrip(
  socket: Socket,
  tripId: string,
): Promise<TripSubscriptionResult> {
  return new Promise<TripSubscriptionResult>((resolve, reject) => {
    socket.timeout(5_000).emit(
      "trip.unsubscribe",
      {
        tripId,
      },
      (
        error: Error | null,

        response: TripSubscriptionResult,
      ) => {
        if (error) {
          reject(error);

          return;
        }

        resolve(response);
      },
    );
  });
}
