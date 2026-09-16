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
