import {
  apiRequest,
} from '../../api/client';

export type DriverTripStatus =
  | 'scheduled'
  | 'boarding'
  | 'in_progress'
  | 'completed';

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

  vehicleRegistrationNumber:
    | string
    | null;

  stopCount: number;
}

export function getMyAssignedTrip(
  tenantId: string,
): Promise<DriverAssignedTrip | null> {
  return apiRequest<DriverAssignedTrip | null>(
    '/me/driver/trip',
    {
      tenantId,
    },
  );
}

export function beginMyBoarding(
  tenantId: string,
): Promise<DriverAssignedTrip> {
  return apiRequest<DriverAssignedTrip>(
    '/me/driver/trip/board',
    {
      method: 'POST',
      tenantId,
    },
  );
}

export function startMyTrip(
  tenantId: string,
): Promise<DriverAssignedTrip> {
  return apiRequest<DriverAssignedTrip>(
    '/me/driver/trip/start',
    {
      method: 'POST',
      tenantId,
    },
  );
}

export function completeMyTrip(
  tenantId: string,
): Promise<DriverAssignedTrip> {
  return apiRequest<DriverAssignedTrip>(
    '/me/driver/trip/complete',
    {
      method: 'POST',
      tenantId,
    },
  );
}
