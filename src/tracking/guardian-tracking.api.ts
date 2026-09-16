import { apiRequest } from "../api/client";

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

export interface GuardianActiveTrip {
  tripId: string;

  /**
   * The current backend may return additional
   * trip metadata.
   *
   * The realtime UI deliberately needs only
   * the authorised trip id for subscription.
   */
  [key: string]: unknown;
}

export interface GuardianTrackableChild {
  child: GuardianChild;

  activeTrip: GuardianActiveTrip | null;
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
    /**
     * A linked child may legitimately have no currently
     * trackable trip.
     *
     * The self-service endpoint expresses that as either
     * no result or a not-found response depending on the
     * current backend path.
     */
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
    children.map(async (child) => ({
      child,

      activeTrip: await getMyChildActiveTrip(tenantId, child.studentId),
    })),
  );
}
