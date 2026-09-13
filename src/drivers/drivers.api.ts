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
  schoolId: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  licenseNumber: string;
  licenseClass: string | null;
  licenseExpiryDate: string | null;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDrivers {
  items: Driver[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListDriversQuery {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  status?: DriverStatus;
}

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

function buildDriversQueryString(
  query: ListDriversQuery,
): string {
  const parameters = new URLSearchParams();

  if (query.page) {
    parameters.set('page', String(query.page));
  }

  if (query.limit) {
    parameters.set('limit', String(query.limit));
  }

  if (query.search?.trim()) {
    parameters.set('search', query.search.trim());
  }

  if (query.schoolId) {
    parameters.set('schoolId', query.schoolId);
  }

  if (query.status) {
    parameters.set('status', query.status);
  }

  const value = parameters.toString();
  return value ? `?${value}` : '';
}

export function listDriversPage(
  tenantId: string,
  query: ListDriversQuery = {},
): Promise<PaginatedDrivers> {
  return apiRequest<PaginatedDrivers>(
    `/drivers${buildDriversQueryString(query)}`,
    {
      tenantId,
    },
  );
}

/**
 * Compatibility helper for operational selectors such as
 * Trip scheduling. Dashboard/list screens should use
 * listDriversPage() so they remain server-paginated.
 */
export async function listDrivers(
  tenantId: string,
): Promise<Driver[]> {
  const items: Driver[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await listDriversPage(
      tenantId,
      {
        page,
        limit: 100,
      },
    );

    items.push(...response.items);
    totalPages = response.totalPages;
    page += 1;
  }

  return items;
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
