import { apiRequest } from "../api/client";

export interface RouteGeometryLineString {
  type: "LineString";

  /**
   * GeoJSON order:
   *
   * [longitude, latitude]
   */
  coordinates: [number, number][];
}

export interface RouteGeometryResponse {
  routeId: string;

  status: "pending" | "building" | "ready" | "failed";

  version: number;

  updatedAt: string | null;

  geometry: RouteGeometryLineString | null;
}

export function getRouteGeometry(
  tenantId: string,

  routeId: string,
): Promise<RouteGeometryResponse> {
  return apiRequest<RouteGeometryResponse>(`/routes/${routeId}/geometry`, {
    tenantId,
  });
}
