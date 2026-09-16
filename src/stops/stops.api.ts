import { apiRequest } from "../api/client";

export type StopStatus = "active" | "inactive";

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

  status: StopStatus;

  createdAt: string;

  updatedAt: string;
}

export interface PaginatedStops {
  items: Stop[];

  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export interface ListStopsQuery {
  page?: number;

  limit?: number;

  search?: string;

  schoolId?: string;

  status?: StopStatus;
}

/**
 * Stop lifecycle is intentionally not exposed through
 * generic create/update payloads here.
 *
 * New stops use the backend default active state.
 * Deactivation uses the dedicated DELETE endpoint protected by
 * stops.deactivate.
 */
export interface CreateStopInput {
  schoolId?: string;

  name: string;

  code?: string;

  address?: string;

  latitude: number;

  longitude: number;

  geofenceRadiusMeters?: number;
}

export interface UpdateStopInput {
  name?: string;

  code?: string;

  address?: string;

  latitude?: number;

  longitude?: number;

  geofenceRadiusMeters?: number;
}

function buildQueryString(query: ListStopsQuery): string {
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

export function listStopsPage(
  tenantId: string,
  query: ListStopsQuery = {},
): Promise<PaginatedStops> {
  return apiRequest<PaginatedStops>(`/stops${buildQueryString(query)}`, {
    tenantId,
  });
}

/**
 * Compatibility helper for RouteStopsDialog and any existing
 * consumer that still expects Stop[].
 */
export async function listStops(tenantId: string): Promise<Stop[]> {
  const stops: Stop[] = [];

  let page = 1;

  const limit = 100;

  while (true) {
    const response = await listStopsPage(tenantId, {
      page,
      limit,
    });

    stops.push(...response.items);

    if (page >= response.totalPages) {
      return stops;
    }

    page += 1;
  }
}

export function createStop(
  tenantId: string,
  input: CreateStopInput,
): Promise<Stop> {
  return apiRequest<Stop>("/stops", {
    method: "POST",

    tenantId,

    body: JSON.stringify(input),
  });
}

export function updateStop(
  tenantId: string,
  stopId: string,
  input: UpdateStopInput,
): Promise<Stop> {
  return apiRequest<Stop>(`/stops/${stopId}`, {
    method: "PATCH",

    tenantId,

    body: JSON.stringify(input),
  });
}

export function deactivateStop(
  tenantId: string,
  stopId: string,
): Promise<Stop> {
  return apiRequest<Stop>(`/stops/${stopId}`, {
    method: "DELETE",

    tenantId,
  });
}
