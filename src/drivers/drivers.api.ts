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

  schoolId?: string;

  includeShared?: boolean;

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

export interface CreateDriverWithAppAccessInput extends Omit<
  CreateDriverInput,
  "email" | "status"
> {
  email: string;
  temporaryPassword: string;
}

export interface DriverWithAppAccessResult {
  driver: Driver & { userId: string };
  appAccess: {
    enabled: boolean;
    userId: string;
    accountEmail: string;
    membershipRole: string;
    temporaryPasswordApplied: boolean;
  };
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

  if (query.schoolId) {
    parameters.set("schoolId", query.schoolId);
  }

  if (query.includeShared !== undefined) {
    parameters.set("includeShared", String(query.includeShared));
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
export async function listDrivers(
  tenantId: string,
  query: Omit<ListDriversQuery, "page" | "limit"> = {},
): Promise<Driver[]> {
  const drivers: Driver[] = [];

  let page = 1;

  const limit = 100;

  while (true) {
    const response = await listDriversPage(tenantId, {
      ...query,
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

export function createDriverWithAppAccess(
  tenantId: string,
  input: CreateDriverWithAppAccessInput,
): Promise<DriverWithAppAccessResult> {
  return apiRequest<DriverWithAppAccessResult>("/drivers/with-app-access", {
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

export interface ImportDriverRowInput {
  firstName: string;
  lastName: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  licenseNumber: string;
  licenseClass?: string;
  licenseExpiryDate: string;
  status?: DriverStatus;
}

export interface ImportDriversInput {
  schoolId: string;
  rows: ImportDriverRowInput[];
}

export interface ImportDriverRowResult {
  rowNumber: number;
  licenseNumber: string;
  email?: string;
  status: "imported" | "rejected";
  driverId?: string;
  message?: string;
}

export interface ImportDriversResult {
  total: number;
  imported: number;
  rejected: number;
  results: ImportDriverRowResult[];
}

export function importDrivers(
  tenantId: string,
  input: ImportDriversInput,
): Promise<ImportDriversResult> {
  return apiRequest<ImportDriversResult>("/drivers/import", {
    method: "POST",
    tenantId,
    body: JSON.stringify(input),
  });
}
