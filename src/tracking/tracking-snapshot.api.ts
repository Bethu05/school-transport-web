import { apiRequest } from "../api/client";

import type { VehicleLocationUpdate } from "./tracking.realtime";

export interface TrackingLocationSnapshot {
  items: VehicleLocationUpdate[];
}

/**
 * Load the latest accepted fleet positions before realtime
 * packets begin filling the screen.
 */
export function getLatestTrackingLocations(
  tenantId: string,
): Promise<TrackingLocationSnapshot> {
  return apiRequest<TrackingLocationSnapshot>("/tracking/locations/latest", {
    tenantId,
  });
}

export interface TrackingOperationalTripMapStop {
  id: string;
  stopId: string;
  stopOrder: number;
  stopName: string;
  stopCode: string | null;
  latitude: number;
  longitude: number;
  status: string;
  routeFraction: number;
  snapDistanceMeters: number;
}

export interface TrackingOperationalTripMap {
  tripId: string;
  routeId: string;
  version: number;
  snapshottedAt: string;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  stops: TrackingOperationalTripMapStop[];
}

export function getTrackingTripMap(
  tenantId: string,
  tripId: string,
): Promise<TrackingOperationalTripMap | null> {
  return apiRequest<TrackingOperationalTripMap | null>(
    `/tracking/locations/trips/${tripId}/map`,
    {
      tenantId,
    },
  );
}
