import type { TripStopEvent, VehicleLocationUpdate } from "./tracking.realtime";

export interface VehicleTrailPoint {
  latitude: number;

  longitude: number;

  recordedAtEpochMs: number;
}

export interface VehicleLiveState {
  location: VehicleLocationUpdate;

  lastStopEvent: TripStopEvent | null;

  trail: VehicleTrailPoint[];
}

/**
 * Merge one location into operational tracking state.
 *
 * Most importantly, an older snapshot/realtime packet can
 * never replace a newer vehicle position.
 */
export function mergeVehicleLocation(
  current: Record<string, VehicleLiveState>,

  location: VehicleLocationUpdate,
): Record<string, VehicleLiveState> {
  const existing = current[location.vehicleId];

  if (
    existing &&
    existing.location.recordedAtEpochMs >= location.recordedAtEpochMs
  ) {
    return current;
  }

  /**
   * A vehicle may finish one Trip and later begin another.
   *
   * Never join the last GPS point of the previous Trip to the
   * first GPS point of the new Trip. That would render a false
   * straight breadcrumb across the map during startup.
   */
  const sameTrip = existing?.location.tripId === location.tripId;

  const previousTrail = sameTrip ? (existing?.trail ?? []) : [];

  const lastPoint = previousTrail[previousTrail.length - 1];

  const moved =
    !lastPoint ||
    Math.abs(lastPoint.latitude - location.latitude) > 0.000001 ||
    Math.abs(lastPoint.longitude - location.longitude) > 0.000001;

  const nextTrail = moved
    ? [
        ...previousTrail,

        {
          latitude: location.latitude,

          longitude: location.longitude,

          recordedAtEpochMs: location.recordedAtEpochMs,
        },
      ].slice(-40)
    : previousTrail;

  return {
    ...current,

    [location.vehicleId]: {
      location,

      lastStopEvent: sameTrip ? (existing?.lastStopEvent ?? null) : null,

      trail: nextTrail,
    },
  };
}

/**
 * Used by initial page-load snapshots.
 *
 * mergeVehicleLocation performs the timestamp protection, so
 * a WebSocket packet that arrived while the HTTP request was
 * in flight always wins.
 */
export function mergeVehicleLocations(
  current: Record<string, VehicleLiveState>,

  locations: readonly VehicleLocationUpdate[],
): Record<string, VehicleLiveState> {
  return locations.reduce(
    (state, location) => mergeVehicleLocation(state, location),

    current,
  );
}
