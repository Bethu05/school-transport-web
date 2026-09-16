export interface RouteProjectionPoint {
  latitude: number;

  longitude: number;
}

interface ProjectedRoutePoint {
  coordinate: [number, number];

  segmentIndex: number;

  segmentProgress: number;

  distanceAlongRouteMeters: number;
}

const METERS_PER_DEGREE_LATITUDE = 111_320;

/**
 * Approximate longitude metres at the supplied latitude.
 *
 * This is more than accurate enough for projecting a realtime
 * GPS point onto a city-scale route polyline.
 */
function metersPerDegreeLongitude(latitude: number): number {
  return METERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180);
}

function segmentLengthMeters(
  from: readonly [number, number],

  to: readonly [number, number],
): number {
  const averageLatitude = (from[1] + to[1]) / 2;

  const dx = (to[0] - from[0]) * metersPerDegreeLongitude(averageLatitude);

  const dy = (to[1] - from[1]) * METERS_PER_DEGREE_LATITUDE;

  return Math.hypot(dx, dy);
}

/**
 * Find the closest position on the canonical route to a
 * latitude/longitude point.
 *
 * The result includes the point's position along the complete
 * route so we can later slice the LineString without drawing a
 * crow-flies connection.
 */
function projectPointOntoRoute(
  routeCoordinates: readonly (readonly [number, number])[],

  point: RouteProjectionPoint,
): ProjectedRoutePoint | null {
  if (routeCoordinates.length < 2) {
    return null;
  }

  let best: {
    projection: ProjectedRoutePoint;

    distanceSquared: number;
  } | null = null;

  let cumulativeDistanceMeters = 0;

  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    const from = routeCoordinates[index];

    const to = routeCoordinates[index + 1];

    const averageLatitude = (from[1] + to[1] + point.latitude) / 3;

    const longitudeScale = metersPerDegreeLongitude(averageLatitude);

    const segmentX = (to[0] - from[0]) * longitudeScale;

    const segmentY = (to[1] - from[1]) * METERS_PER_DEGREE_LATITUDE;

    const pointX = (point.longitude - from[0]) * longitudeScale;

    const pointY = (point.latitude - from[1]) * METERS_PER_DEGREE_LATITUDE;

    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

    const segmentLength = Math.sqrt(segmentLengthSquared);

    if (segmentLengthSquared <= Number.EPSILON) {
      continue;
    }

    const rawProgress =
      (pointX * segmentX + pointY * segmentY) / segmentLengthSquared;

    const segmentProgress = Math.max(0, Math.min(1, rawProgress));

    const projectedX = segmentX * segmentProgress;

    const projectedY = segmentY * segmentProgress;

    const dx = pointX - projectedX;

    const dy = pointY - projectedY;

    const distanceSquared = dx * dx + dy * dy;

    const projectedCoordinate: [number, number] = [
      from[0] + (to[0] - from[0]) * segmentProgress,

      from[1] + (to[1] - from[1]) * segmentProgress,
    ];

    const projection: ProjectedRoutePoint = {
      coordinate: projectedCoordinate,

      segmentIndex: index,

      segmentProgress,

      distanceAlongRouteMeters:
        cumulativeDistanceMeters + segmentLength * segmentProgress,
    };

    if (!best || distanceSquared < best.distanceSquared) {
      best = {
        projection,

        distanceSquared,
      };
    }

    cumulativeDistanceMeters += segmentLengthMeters(from, to);
  }

  return best?.projection ?? null;
}

function sameCoordinate(
  left: readonly [number, number],

  right: readonly [number, number],
): boolean {
  return (
    Math.abs(left[0] - right[0]) < 1e-10 && Math.abs(left[1] - right[1]) < 1e-10
  );
}

/**
 * Slice canonical route geometry between the live bus and the
 * current next stop.
 *
 * Both endpoints are first projected onto the road route.
 *
 * The returned coordinates therefore preserve every road bend
 * between those projections instead of drawing a direct line.
 */
export function sliceRouteBetweenPoints(
  routeCoordinates: readonly (readonly [number, number])[],

  from: RouteProjectionPoint,

  to: RouteProjectionPoint,
): [number, number][] | null {
  const fromProjection = projectPointOntoRoute(routeCoordinates, from);

  const toProjection = projectPointOntoRoute(routeCoordinates, to);

  if (!fromProjection || !toProjection) {
    return null;
  }

  /**
   * The backend nextStop is authoritative and should occur
   * ahead of the vehicle on the canonical route.
   *
   * If projection noise puts it behind the vehicle, do not draw
   * a misleading backwards route.
   */
  if (
    toProjection.distanceAlongRouteMeters <=
    fromProjection.distanceAlongRouteMeters
  ) {
    return null;
  }

  const coordinates: [number, number][] = [fromProjection.coordinate];

  /**
   * Keep every canonical route vertex between the two
   * projected positions.
   */
  for (
    let index = fromProjection.segmentIndex + 1;
    index <= toProjection.segmentIndex;
    index += 1
  ) {
    const coordinate = routeCoordinates[index];

    const nextCoordinate: [number, number] = [coordinate[0], coordinate[1]];

    if (!sameCoordinate(coordinates[coordinates.length - 1], nextCoordinate)) {
      coordinates.push(nextCoordinate);
    }
  }

  if (
    !sameCoordinate(
      coordinates[coordinates.length - 1],
      toProjection.coordinate,
    )
  ) {
    coordinates.push(toProjection.coordinate);
  }

  return coordinates.length >= 2 ? coordinates : null;
}
