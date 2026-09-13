import {
  apiRequest,
} from '../api/client';

export type RouteType =
  | 'pickup'
  | 'dropoff'
  | 'other';

export type RouteStatus =
  | 'active'
  | 'inactive';

export interface Route {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  code: string | null;
  routeType: RouteType;
  status: RouteStatus;
  stopCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRoutes {
  items: Route[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListRoutesQuery {
  page?: number;
  limit?: number;
  search?: string;
  schoolId?: string;
  status?: RouteStatus;
  routeType?: RouteType;
}

export interface RouteStop {
  id: string;
  tenantId: string;
  routeId: string;
  stopId: string;
  stopOrder: number;
  plannedOffsetMinutes: number | null;
  stopName: string;
  stopCode: string | null;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRouteInput {
  schoolId: string;
  name: string;
  code?: string;
  routeType?: RouteType;
}

export interface UpdateRouteInput {
  name?: string;
  code?: string;
  routeType?: RouteType;
}

export interface AddRouteStopInput {
  stopId: string;
  stopOrder: number;
  plannedOffsetMinutes?: number;
}

export interface UpdateRouteStopInput {
  stopOrder?: number;
  plannedOffsetMinutes?: number;
}

export interface RemoveRouteStopResult {
  success: boolean;
}

function buildRoutesQueryString(
  query: ListRoutesQuery,
): string {
  const parameters = new URLSearchParams();

  if (query.page) parameters.set('page', String(query.page));
  if (query.limit) parameters.set('limit', String(query.limit));
  if (query.search?.trim()) parameters.set('search', query.search.trim());
  if (query.schoolId) parameters.set('schoolId', query.schoolId);
  if (query.status) parameters.set('status', query.status);
  if (query.routeType) parameters.set('routeType', query.routeType);

  const value = parameters.toString();
  return value ? `?${value}` : '';
}

export function listRoutesPage(
  tenantId: string,
  query: ListRoutesQuery = {},
): Promise<PaginatedRoutes> {
  return apiRequest<PaginatedRoutes>(
    `/routes${buildRoutesQueryString(query)}`,
    {
      tenantId,
    },
  );
}

/**
 * Compatibility helper for trip scheduling and other selectors.
 * The Routes dashboard uses listRoutesPage().
 */
export async function listRoutes(
  tenantId: string,
): Promise<Route[]> {
  const items: Route[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await listRoutesPage(
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
 * Fetch one route.
 */
export function getRoute(
  tenantId: string,
  routeId: string,
): Promise<Route> {
  return apiRequest<Route>(
    `/routes/${routeId}`,
    {
      tenantId,
    },
  );
}

/**
 * Requires routes.create.
 */
export function createRoute(
  tenantId: string,
  input: CreateRouteInput,
): Promise<Route> {
  return apiRequest<Route>(
    '/routes',
    {
      method: 'POST',
      tenantId,
      body: JSON.stringify(
        input,
      ),
    },
  );
}

/**
 * Requires routes.update.
 *
 * Lifecycle state is not changed through this generic PATCH.
 */
export function updateRoute(
  tenantId: string,
  routeId: string,
  input: UpdateRouteInput,
): Promise<Route> {
  return apiRequest<Route>(
    `/routes/${routeId}`,
    {
      method: 'PATCH',
      tenantId,
      body: JSON.stringify(
        input,
      ),
    },
  );
}

/**
 * Requires routes.activate.
 */
export function activateRoute(
  tenantId: string,
  routeId: string,
): Promise<Route> {
  return apiRequest<Route>(
    `/routes/${routeId}/activate`,
    {
      method: 'PATCH',
      tenantId,
    },
  );
}

/**
 * Requires routes.deactivate.
 *
 * Routes are soft-deactivated rather than deleted so trip history
 * can continue referencing the route template.
 */
export function deactivateRoute(
  tenantId: string,
  routeId: string,
): Promise<Route> {
  return apiRequest<Route>(
    `/routes/${routeId}`,
    {
      method: 'DELETE',
      tenantId,
    },
  );
}

/**
 * Return the ordered stops attached to one route.
 */
export function listRouteStops(
  tenantId: string,
  routeId: string,
): Promise<RouteStop[]> {
  return apiRequest<RouteStop[]>(
    `/routes/${routeId}/stops`,
    {
      tenantId,
    },
  );
}

/**
 * Attach an existing active stop to an active route.
 */
export function addRouteStop(
  tenantId: string,
  routeId: string,
  input: AddRouteStopInput,
): Promise<RouteStop> {
  return apiRequest<RouteStop>(
    `/routes/${routeId}/stops`,
    {
      method: 'POST',
      tenantId,
      body: JSON.stringify(
        input,
      ),
    },
  );
}

/**
 * Update a route-stop association.
 */
export function updateRouteStop(
  tenantId: string,
  routeId: string,
  routeStopId: string,
  input: UpdateRouteStopInput,
): Promise<RouteStop> {
  return apiRequest<RouteStop>(
    `/routes/${routeId}/stops/${routeStopId}`,
    {
      method: 'PATCH',
      tenantId,
      body: JSON.stringify(
        input,
      ),
    },
  );
}

/**
 * Remove the route-stop association only.
 * The underlying reusable stop remains intact.
 */
export function removeRouteStop(
  tenantId: string,
  routeId: string,
  routeStopId: string,
): Promise<RemoveRouteStopResult> {
  return apiRequest<RemoveRouteStopResult>(
    `/routes/${routeId}/stops/${routeStopId}`,
    {
      method: 'DELETE',
      tenantId,
    },
  );
}
