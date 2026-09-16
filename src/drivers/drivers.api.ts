import { apiRequest } from "../api/client";

export type DriverStatus = "active" | "inactive" | "suspended";

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

  status?: DriverStatus;
}

/**
 * Driver fields supported by the backend create contract.
 */
export interface CreateDriverInput {
  schoolId?: string;

  firstName: string;

  lastName: string;

  phone?: string;

  email?: string;

  licenseNumber: string;

  licenseClass?: string;

  licenseExpiryDate: string;

  status?: DriverStatus;
}

/**
 * Driver fields supported by the backend PATCH contract.
 */
export interface UpdateDriverInput {
  schoolId?: string;

  firstName?: string;

  lastName?: string;

  phone?: string;

  email?: string;

  licenseNumber?: string;

  licenseClass?: string;

  licenseExpiryDate?: string;

  status?: DriverStatus;
}

function buildQueryString(query: ListDriversQuery): string {
  const parameters = new URLSearchParams();

  if (query.page) {
    parameters.set("page", String(query.page));
  }

  if (query.limit) {
    parameters.set("limit", String(query.limit));
  }

  if (query.search?.trim()) {
    parameters.set("search", query.search.trim());
  }

  if (query.status) {
    parameters.set("status", query.status);
  }

  const value = parameters.toString();

  return value ? `?${value}` : "";
}

/**
 * Server-side paginated Driver list.
 */
export function listDriversPage(
  tenantId: string,
  query: ListDriversQuery = {},
): Promise<PaginatedDrivers> {
  return apiRequest<PaginatedDrivers>(`/drivers${buildQueryString(query)}`, {
    tenantId,
  });
}

/**
 * Compatibility helper for Trips and existing consumers
 * that still expect a plain Driver[].
 */
export async function listDrivers(tenantId: string): Promise<Driver[]> {
  const drivers: Driver[] = [];

  let page = 1;

  const limit = 100;

  while (true) {
    const response = await listDriversPage(tenantId, {
      page,
      limit,
    });

    drivers.push(...response.items);

    if (page >= response.totalPages) {
      return drivers;
    }

    page += 1;
  }
}

export function createDriver(
  tenantId: string,
  input: CreateDriverInput,
): Promise<Driver> {
  return apiRequest<Driver>("/drivers", {
    method: "POST",

    tenantId,

    body: JSON.stringify(input),
  });
}

export function updateDriver(
  tenantId: string,
  driverId: string,
  input: UpdateDriverInput,
): Promise<Driver> {
  return apiRequest<Driver>(`/drivers/${driverId}`, {
    method: "PATCH",

    tenantId,

    body: JSON.stringify(input),
  });
}

export function deactivateDriver(
  tenantId: string,
  driverId: string,
): Promise<Driver> {
  return apiRequest<Driver>(`/drivers/${driverId}`, {
    method: "DELETE",

    tenantId,
  });
}
