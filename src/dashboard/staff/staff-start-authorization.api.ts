import { apiRequest } from "../../api/client";

export type StaffTripStartAuthorizationStatus =
  "pending" | "approved" | "rejected" | "consumed";

export interface StaffTripStartAuthorization {
  id: string;
  tenantId: string;
  tripId: string;
  requestedByUserId: string;
  requestedAt: string;
  scheduledStartAtSnapshot: string;
  reasonCode: string;
  reasonText: string | null;
  status: StaffTripStartAuthorizationStatus;
  decidedByUserId: string | null;
  decidedAt: string | null;
  authorityType: "transport_manager" | "onboard_chaperone" | null;
  actualStartAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function getMyStaffStartAuthorization(
  tenantId: string,
): Promise<StaffTripStartAuthorization | null> {
  return apiRequest<StaffTripStartAuthorization | null>(
    "/me/staff/trip/start-authorization",
    {
      tenantId,
    },
  );
}

export function approveMyStaffStartAuthorization(
  tenantId: string,
): Promise<StaffTripStartAuthorization> {
  return apiRequest<StaffTripStartAuthorization>(
    "/me/staff/trip/start-authorization/approve",
    {
      method: "POST",
      tenantId,
    },
  );
}

export function rejectMyStaffStartAuthorization(
  tenantId: string,
): Promise<StaffTripStartAuthorization> {
  return apiRequest<StaffTripStartAuthorization>(
    "/me/staff/trip/start-authorization/reject",
    {
      method: "POST",
      tenantId,
    },
  );
}
