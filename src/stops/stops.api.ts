import {
  apiRequest,
} from '../api/client';

export type StopStatus =
  | 'active'
  | 'inactive';

export interface Stop {
  id: string;

  tenantId: string;

  schoolId:
    | string
    | null;

  name: string;

  code:
    | string
    | null;

  address:
    | string
    | null;

  latitude: number;

  longitude: number;

  geofenceRadiusMeters:
    number;

  status:
    StopStatus | string;

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

function buildQueryString(
  query:
    ListStopsQuery,
): string {
  const parameters =
    new URLSearchParams();

  if (query.page) {
    parameters.set(
      'page',
      String(
        query.page,
      ),
    );
  }

  if (query.limit) {
    parameters.set(
      'limit',
      String(
        query.limit,
      ),
    );
  }

  if (
    query.search?.trim()
  ) {
    parameters.set(
      'search',
      query.search.trim(),
    );
  }

  if (query.schoolId) {
    parameters.set(
      'schoolId',
      query.schoolId,
    );
  }

  if (query.status) {
    parameters.set(
      'status',
      query.status,
    );
  }

  const value =
    parameters.toString();

  return value
    ? `?${value}`
    : '';
}

/**
 * Server-side paginated Stops endpoint.
 *
 * The future Stops dashboard uses this directly.
 */
export function listStopsPage(
  tenantId: string,
  query:
    ListStopsQuery = {},
): Promise<PaginatedStops> {
  return apiRequest<PaginatedStops>(
    `/stops${buildQueryString(
      query,
    )}`,
    {
      tenantId,
    },
  );
}

/**
 * Compatibility helper for RouteStopsDialog and any existing
 * consumers that expect Stop[] rather than a paginated response.
 *
 * The backend now paginates /stops, so we walk through all pages
 * in batches of 100 and return the original array shape.
 */
export async function listStops(
  tenantId: string,
): Promise<Stop[]> {
  const stops:
    Stop[] = [];

  let page = 1;

  const limit = 100;

  while (true) {
    const response =
      await listStopsPage(
        tenantId,
        {
          page,
          limit,
        },
      );

    stops.push(
      ...response.items,
    );

    if (
      page >=
      response.totalPages
    ) {
      return stops;
    }

    page += 1;
  }
}
