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

function buildStopsQueryString(
  query: ListStopsQuery,
): string {
  const parameters = new URLSearchParams();

  if (query.page) parameters.set('page', String(query.page));
  if (query.limit) parameters.set('limit', String(query.limit));
  if (query.search?.trim()) parameters.set('search', query.search.trim());
  if (query.schoolId) parameters.set('schoolId', query.schoolId);
  if (query.status) parameters.set('status', query.status);

  const value = parameters.toString();
  return value ? `?${value}` : '';
}

export function listStopsPage(
  tenantId: string,
  query: ListStopsQuery = {},
): Promise<PaginatedStops> {
  return apiRequest<PaginatedStops>(
    `/stops${buildStopsQueryString(query)}`,
    {
      tenantId,
    },
  );
}

/**
 * Compatibility helper for RouteStopsDialog.
 * The Stops dashboard uses listStopsPage().
 */
export async function listStops(
  tenantId: string,
): Promise<Stop[]> {
  const items: Stop[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await listStopsPage(
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
