import {
  io,
  type Socket,
} from 'socket.io-client';

import {
  getAccessToken,
} from '../api/client';

const REALTIME_BASE_URL =
  import.meta.env.VITE_REALTIME_URL ??
  'http://localhost:3002';

export interface VehicleLocationNextStop {
  tripStopId: string;
  stopId: string;
  stopOrder: number;
  stopName: string;

  stopCode:
    | string
    | null;

  latitude: number;
  longitude: number;

  geofenceRadiusMeters:
    number;

  scheduledArrivalAt:
    | string
    | null;

  status:
    | 'pending'
    | 'arrived'
    | 'departed'
    | 'skipped';

  /**
   * Straight-line distance from the current GPS position.
   */
  distanceMeters:
    number;

  /**
   * Route-aware distance when route geometry is available.
   */
  routeDistanceMeters:
    | number
    | null;

  withinGeofence:
    boolean;

  /**
   * Distance actually used by the ETA engine.
   */
  etaDistanceMeters:
    number;

  etaDistanceSource:
    string;

  etaSeconds:
    | number
    | null;

  estimatedArrivalAt:
    | string
    | null;

  etaSpeedKph:
    | number
    | null;

  etaSource:
    string;

  etaSampleCount:
    number;
}

export interface VehicleLocationUpdate {
  tenantId: string;
  vehicleId: string;
  gpsDeviceId: string;

  tripId:
    | string
    | null;

  routeId:
    | string
    | null;

  arrivedStop:
    unknown | null;

  departedStop:
    unknown | null;

  nextStop:
    | VehicleLocationNextStop
    | null;

  latitude: number;
  longitude: number;

  speedKph:
    | number
    | null;

  heading:
    | number
    | null;

  accuracyMeters:
    | number
    | null;

  recordedAt: string;

  recordedAtEpochMs:
    number;

  receivedAt: string;
}

export interface TripStopEvent {
  eventId: string;
  tenantId: string;
  tripId: string;
  routeId: string;
  vehicleId: string;
  tripStopId: string;
  stopId: string;
  stopOrder: number;
  stopName: string;

  stopCode:
    | string
    | null;

  latitude: number;
  longitude: number;
  distanceMeters: number;
  geofenceRadiusMeters: number;

  eventType:
    | 'trip.stop.arrived'
    | 'trip.stop.departed';
}

export interface TrackingConnectionReady {
  tenantId: string;
  userId: string;
}

export interface TrackingConnectionDenied {
  message: string;
}

export function createTrackingSocket(
  tenantId: string,
): Socket {
  const token =
    getAccessToken();

  if (!token) {
    throw new Error(
      'Authentication token is missing',
    );
  }

  return io(
    `${REALTIME_BASE_URL}/tracking`,
    {
      autoConnect:
        false,

      transports: [
        'websocket',
      ],

      auth: {
        token,
        tenantId,
      },
    },
  );
}

export interface TripSubscriptionResult {
  ok: boolean;

  tripId?:
    string;

  scope?:
    'tenant'
    | 'trip';

  message?:
    string;
}

export function subscribeToTrip(
  socket: Socket,
  tripId: string,
): Promise<TripSubscriptionResult> {
  return new Promise<
    TripSubscriptionResult
  >(
    (
      resolve,
      reject,
    ) => {
      socket
        .timeout(
          5_000,
        )
        .emit(
          'trip.subscribe',
          {
            tripId,
          },
          (
            error:
              Error | null,

            response:
              TripSubscriptionResult,
          ) => {
            if (error) {
              reject(
                error,
              );

              return;
            }

            resolve(
              response,
            );
          },
        );
    },
  );
}

export function unsubscribeFromTrip(
  socket: Socket,
  tripId: string,
): Promise<TripSubscriptionResult> {
  return new Promise<
    TripSubscriptionResult
  >(
    (
      resolve,
      reject,
    ) => {
      socket
        .timeout(
          5_000,
        )
        .emit(
          'trip.unsubscribe',
          {
            tripId,
          },
          (
            error:
              Error | null,

            response:
              TripSubscriptionResult,
          ) => {
            if (error) {
              reject(
                error,
              );

              return;
            }

            resolve(
              response,
            );
          },
        );
    },
  );
}
