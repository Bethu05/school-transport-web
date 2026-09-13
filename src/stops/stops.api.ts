import {
  apiRequest,
} from '../api/client';

export type StopStatus =
  | 'active'
  | 'inactive';

export interface Stop {
  id: string;
  tenantId: string;
  schoolId: string | null;
  name: string;
  code: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  status: StopStatus | string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch stops visible to the authenticated tenant.
 *
 * The Routes UI filters this list to active stops belonging
 * to the route's school, plus tenant-wide shared stops.
 */
export function listStops(
  tenantId: string,
): Promise<Stop[]> {
  return apiRequest<Stop[]>(
    '/stops',
    {
      tenantId,
    },
  );
}
