import { apiRequest } from "../api/client";

import type { VehicleLocationUpdate } from "./tracking.realtime";

export interface GuardianChild {
  studentId: string;
  schoolId: string;
  schoolName: string;
  schoolCode: string;

  externalRef: string | null;

  firstName: string;
  lastName: string;

  status: "active";

  relationshipType: string;

  isPrimary: boolean;

  receiveNotifications: boolean;
}

export type GuardianActiveTripStatus = "boarding" | "in_progress";

export interface GuardianActiveTrip {
  tripId: string;

  studentId: string;

  schoolId: string;

  routeId: string;

  routeName: string;

  routeCode: string | null;

  vehicleId: string | null;

  vehicleRegistrationNumber: string | null;

  serviceDate: string;

  scheduledStartAt: string | null;

  scheduledEndAt: string | null;

  actualStartAt: string | null;

  status: GuardianActiveTripStatus;
}

export interface GuardianRouteGeometry {
  routeId: string;

  status: "pending" | "building" | "ready" | "failed";

  version: number;

  updatedAt: string | null;

  geometry: {
    type: "LineString";

    /**
     * GeoJSON coordinate order:
     *
     * [longitude, latitude]
     */
    coordinates: [number, number][];
  } | null;
}

export interface GuardianTrackingBootstrap {
  activeTrip: GuardianActiveTrip;

  /**
   * Last accepted GPS packet for this authorised active trip.
   *
   * Null is valid when the vehicle has not reported yet.
   */
  latestLocation: VehicleLocationUpdate | null;

  /**
   * Canonical geometry belonging specifically to the
   * authorised active trip's route.
   */
  routeGeometry: GuardianRouteGeometry | null;
}

export interface GuardianTrackableChild {
  child: GuardianChild;

  activeTrip: GuardianActiveTrip | null;

  trackingBootstrap: GuardianTrackingBootstrap | null;
}

export function listMyChildren(tenantId: string): Promise<GuardianChild[]> {
  return apiRequest<GuardianChild[]>("/me/children", {
    tenantId,
  });
}

export async function getMyChildActiveTrip(
  tenantId: string,
  studentId: string,
): Promise<GuardianActiveTrip | null> {
  try {
    return await apiRequest<GuardianActiveTrip>(
      `/me/children/${studentId}/active-trip`,
      {
        tenantId,
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("404") ||
        error.message.toLowerCase().includes("active trip"))
    ) {
      return null;
    }

    throw error;
  }
}

/**
 * Guardian-scoped initial tracking state.
 *
 * This is deliberately NOT the operational/admin snapshot.
 *
 * The backend proves the Guardian -> child -> active-trip
 * relationship before returning any vehicle position or route
 * geometry.
 */
export async function getMyChildTrackingBootstrap(
  tenantId: string,
  studentId: string,
): Promise<GuardianTrackingBootstrap | null> {
  try {
    return await apiRequest<GuardianTrackingBootstrap>(
      `/me/children/${studentId}/tracking-bootstrap`,
      {
        tenantId,
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("404") ||
        error.message.toLowerCase().includes("active trip"))
    ) {
      return null;
    }

    throw error;
  }
}

export async function listMyTrackableChildren(
  tenantId: string,
): Promise<GuardianTrackableChild[]> {
  const children = await listMyChildren(tenantId);

  return Promise.all(
    children.map(async (child) => {
      const trackingBootstrap = await getMyChildTrackingBootstrap(
        tenantId,
        child.studentId,
      );

      return {
        child,

        activeTrip: trackingBootstrap?.activeTrip ?? null,

        trackingBootstrap,
      };
    }),
  );
}
