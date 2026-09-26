import { apiRequest } from "../../api/client";

export type StaffRole = "teacher" | "chaperone";

export type StaffPassengerStatus =
  "waiting" | "no_show" | "boarded" | "dropped_off";

export type StaffPassengerAssignmentType = "pickup" | "dropoff";

export interface StaffTripPassenger {
  riderId: string;

  studentId: string;

  studentExternalRef: string | null;

  studentFirstName: string;

  studentLastName: string;

  assignmentType: StaffPassengerAssignmentType;

  assignedTripStopId: string;

  assignedStopName: string;

  assignedStopOrder: number;

  status: StaffPassengerStatus;

  noShowAt: string | null;

  boardedAt: string | null;

  droppedOffAt: string | null;
}

export interface StaffTripManifest {
  tripId: string;

  staffRole: StaffRole;

  tripStatus: string;

  serviceDate: string;

  scheduledStartAt: string;

  routeName: string;

  vehicleRegistrationNumber: string | null;

  driverName: string | null;

  passengers: StaffTripPassenger[];
}

export interface StaffPassengerEvent {
  id: string;

  tripId: string;

  tripRiderId: string;

  tripStopId: string;

  eventType: "boarded" | "no_show" | "dropped_off";

  eventSource: "manual" | "scanner" | "system";

  occurredAt: string;

  notes: string | null;
}

export function getMyStaffTripManifest(
  tenantId: string,
): Promise<StaffTripManifest | null> {
  return apiRequest<StaffTripManifest | null>("/me/staff/trip/riders", {
    tenantId,
  });
}

function passengerEvent(
  tenantId: string,
  riderId: string,
  action: "board" | "no-show" | "drop-off",
  tripStopId: string,
  idempotencyKey: string,
): Promise<StaffPassengerEvent> {
  return apiRequest<StaffPassengerEvent>(
    `/me/staff/trip/riders/${riderId}/${action}`,
    {
      tenantId,

      method: "POST",

      headers: {
        "Idempotency-Key": idempotencyKey,
      },

      body: JSON.stringify({
        tripStopId,
      }),
    },
  );
}

export function boardStaffPassenger(
  tenantId: string,
  riderId: string,
  tripStopId: string,
  idempotencyKey: string,
): Promise<StaffPassengerEvent> {
  return passengerEvent(tenantId, riderId, "board", tripStopId, idempotencyKey);
}

export function markStaffPassengerNoShow(
  tenantId: string,
  riderId: string,
  tripStopId: string,
  idempotencyKey: string,
): Promise<StaffPassengerEvent> {
  return passengerEvent(
    tenantId,
    riderId,
    "no-show",
    tripStopId,
    idempotencyKey,
  );
}

export function dropOffStaffPassenger(
  tenantId: string,
  riderId: string,
  tripStopId: string,
  idempotencyKey: string,
): Promise<StaffPassengerEvent> {
  return passengerEvent(
    tenantId,
    riderId,
    "drop-off",
    tripStopId,
    idempotencyKey,
  );
}
