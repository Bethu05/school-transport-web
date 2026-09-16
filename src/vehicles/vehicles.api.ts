import { apiRequest } from "../api/client";

export type VehicleStatus = "active" | "maintenance" | "inactive" | "retired";

export interface Vehicle {
  id: string;
  tenantId: string;
  schoolId: string | null;
  registrationNumber: string;
  fleetNumber: string | null;
  make: string | null;
  model: string | null;
  manufactureYear: number | null;
  seatCapacity: number;
  gpsDeviceId: string | null;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedVehicles {
  items: Vehicle[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListVehiclesQuery {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  status?: VehicleStatus;
}

export interface CreateVehicleInput {
  schoolId?: string;
  registrationNumber: string;
  fleetNumber?: string;
  make?: string;
  model?: string;
  manufactureYear?: number;
  seatCapacity: number;
  gpsDeviceId?: string;
  status?: VehicleStatus;
}

export interface UpdateVehicleInput {
  schoolId?: string;
  registrationNumber?: string;
  fleetNumber?: string;
  make?: string;
  model?: string;
  manufactureYear?: number;
  seatCapacity?: number;
  gpsDeviceId?: string;
  status?: VehicleStatus;
}

function buildQueryString(query: ListVehiclesQuery): string {
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

  if (query.status) {
    parameters.set("status", query.status);
  }

  const value = parameters.toString();

  return value ? `?${value}` : "";
}

export function listVehicles(
  tenantId: string,
  query: ListVehiclesQuery = {},
): Promise<PaginatedVehicles> {
  return apiRequest<PaginatedVehicles>(`/vehicles${buildQueryString(query)}`, {
    tenantId,
  });
}

export function getVehicle(
  tenantId: string,
  vehicleId: string,
): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${vehicleId}`, {
    tenantId,
  });
}

/**
 * Requires vehicles.create.
 */
export function createVehicle(
  tenantId: string,
  input: CreateVehicleInput,
): Promise<Vehicle> {
  return apiRequest<Vehicle>("/vehicles", {
    method: "POST",

    tenantId,

    body: JSON.stringify(input),
  });
}

/**
 * Requires vehicles.update.
 */
export function updateVehicle(
  tenantId: string,
  vehicleId: string,
  input: UpdateVehicleInput,
): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${vehicleId}`, {
    method: "PATCH",

    tenantId,

    body: JSON.stringify(input),
  });
}

/**
 * Vehicles are retired rather than physically deleted.
 *
 * This preserves operational history.
 *
 * Requires vehicles.retire.
 */
export function retireVehicle(
  tenantId: string,
  vehicleId: string,
): Promise<Vehicle> {
  return apiRequest<Vehicle>(`/vehicles/${vehicleId}`, {
    method: "DELETE",

    tenantId,
  });
}
