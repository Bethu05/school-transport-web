import {
  apiRequest,
} from '../api/client';

export type DriverStatus =
  | 'active'
  | 'inactive'
  | 'suspended';

export interface Driver {
  id: string;

  tenantId: string;

  schoolId:
    | string
    | null;

  firstName: string;

  lastName: string;

  phone:
    | string
    | null;

  email:
    | string
    | null;

  licenseNumber: string;

  licenseClass:
    | string
    | null;

  licenseExpiryDate:
    | string
    | null;

  status:
    DriverStatus;

  createdAt: string;

  updatedAt: string;
}

/**
 * Fields confirmed by the backend Drivers
 * CRUD checkpoint.
 */
export interface CreateDriverInput {
  firstName: string;

  lastName: string;

  licenseNumber: string;

  licenseExpiryDate: string;

  status?: DriverStatus;
}

export interface UpdateDriverInput {
  firstName?: string;

  lastName?: string;

  phone?: string;

  licenseExpiryDate?: string;

  status?: DriverStatus;
}

/**
 * Fetch every driver visible to the
 * authenticated tenant.
 */
export function listDrivers(
  tenantId: string,
): Promise<Driver[]> {
  return apiRequest<Driver[]>(
    '/drivers',
    {
      tenantId,
    },
  );
}

/**
 * Requires drivers.create.
 */
export function createDriver(
  tenantId: string,
  input: CreateDriverInput,
): Promise<Driver> {
  return apiRequest<Driver>(
    '/drivers',
    {
      method: 'POST',

      tenantId,

      body:
        JSON.stringify(
          input,
        ),
    },
  );
}

/**
 * Requires drivers.update.
 */
export function updateDriver(
  tenantId: string,
  driverId: string,
  input: UpdateDriverInput,
): Promise<Driver> {
  return apiRequest<Driver>(
    `/drivers/${driverId}`,
    {
      method: 'PATCH',

      tenantId,

      body:
        JSON.stringify(
          input,
        ),
    },
  );
}

/**
 * Drivers are deactivated rather than
 * physically deleted.
 *
 * Requires drivers.deactivate.
 */
export function deactivateDriver(
  tenantId: string,
  driverId: string,
): Promise<Driver> {
  return apiRequest<Driver>(
    `/drivers/${driverId}`,
    {
      method: 'DELETE',

      tenantId,
    },
  );
}
