import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';

import {
  DirectionsBusRounded,
  GpsFixedRounded,
  SpeedRounded,
  WifiRounded,
  WifiOffRounded,
} from '@mui/icons-material';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useAuth,
} from '../auth/AuthProvider';

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from '../auth/frontend-permissions';

import {
  listVehicles,
  type Vehicle,
} from '../vehicles/vehicles.api';

import {
  GuardianTrackingPanel,
} from './GuardianTrackingPanel';

import {
  LiveTrackingMap,
} from './LiveTrackingMap';

import {
  TrackingProgressPanel,
} from './TrackingProgressPanel';

import {
  createTrackingSocket,
  type TrackingConnectionDenied,
  type TrackingConnectionReady,
  type TripStopEvent,
  type VehicleLocationUpdate,
} from './tracking.realtime';

type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'denied'
  | 'error';

interface VehicleLiveState {
  location:
    VehicleLocationUpdate;

  lastStopEvent:
    | TripStopEvent
    | null;
}

function errorMessage(
  error:
    unknown,
): string {
  return error instanceof
    Error
    ? error.message
    : 'Realtime tracking failed.';
}

function formatDateTime(
  value:
    string,
): string {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      dateStyle:
        'medium',

      timeStyle:
        'medium',

      timeZone:
        'Africa/Nairobi',
    },
  ).format(
    date,
  );
}

function vehicleLabel(
  vehicle:
    Vehicle,
): string {
  if (
    vehicle.registrationNumber
  ) {
    return vehicle.registrationNumber;
  }

  if (
    vehicle.fleetNumber
  ) {
    return vehicle.fleetNumber;
  }

  const makeModel =
    [
      vehicle.make,
      vehicle.model,
    ]
      .filter(
        Boolean,
      )
      .join(
        ' ',
      );

  return (
    makeModel ||
    'Vehicle'
  );
}

export function TrackingPage() {
  const {
    permissions,
    tenant,
  } =
    useAuth();

  const tenantId =
    tenant?.tenantId;

  /**
   * First tracking checkpoint is the operational fleet view.
   *
   * We deliberately require fleet-read permission before
   * connecting this page to the tenant-wide live feed.
   *
   * Guardian tracking is implemented through explicit
   * authorised trip subscription in the next checkpoint.
   */
  const canReadFleet =
    hasFrontendPermission(
      permissions,
      FRONTEND_PERMISSIONS.VEHICLES_READ,
    );

  const [
    connectionStatus,
    setConnectionStatus,
  ] =
    useState<ConnectionStatus>(
      'connecting',
    );

  const [
    connectionError,
    setConnectionError,
  ] =
    useState<
      string | null
    >(null);

  const [
    liveVehicles,
    setLiveVehicles,
  ] =
    useState<
      Record<
        string,
        VehicleLiveState
      >
    >({});

  const vehiclesQuery =
    useQuery({
      queryKey: [
        'vehicles',
        tenantId,
        'tracking-labels',
      ],

      enabled:
        Boolean(
          tenantId &&
          canReadFleet,
        ),

      queryFn:
        async () => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return listVehicles(
            tenantId,
            {
              page:
                1,

              limit:
                100,
            },
          );
        },
    });

  const vehicleById =
    useMemo(
      () =>
        new Map(
          (
            vehiclesQuery
              .data
              ?.items ??
            []
          ).map(
            (
              vehicle,
            ) => [
              vehicle.id,
              vehicle,
            ],
          ),
        ),
      [
        vehiclesQuery.data,
      ],
    );

  useEffect(
    () => {
      if (
        !tenantId ||
        !canReadFleet
      ) {
        return;
      }

      let socket;

      try {
        socket =
          createTrackingSocket(
            tenantId,
          );
      } catch (
        error
      ) {
        const message =
          errorMessage(
            error,
          );

        queueMicrotask(
          () => {
            setConnectionStatus(
              'error',
            );

            setConnectionError(
              message,
            );
          },
        );

        return;
      }

      socket.on(
        'connection.ready',
        (
          ready:
            TrackingConnectionReady,
        ) => {
          if (
            ready.tenantId !==
            tenantId
          ) {
            return;
          }

          setConnectionStatus(
            'connected',
          );

          setConnectionError(
            null,
          );
        },
      );

      socket.on(
        'connection.denied',
        (
          denied:
            TrackingConnectionDenied,
        ) => {
          setConnectionStatus(
            'denied',
          );

          setConnectionError(
            denied.message,
          );
        },
      );

      socket.on(
        'connect_error',
        (
          error:
            Error,
        ) => {
          setConnectionStatus(
            'error',
          );

          setConnectionError(
            error.message,
          );
        },
      );

      socket.on(
        'disconnect',
        () => {
          setConnectionStatus(
            'disconnected',
          );
        },
      );

      socket.on(
        'vehicle.location.updated',
        (
          location:
            VehicleLocationUpdate,
        ) => {
          if (
            location.tenantId !==
            tenantId
          ) {
            return;
          }

          setLiveVehicles(
            (
              current,
            ) => ({
              ...current,

              [location.vehicleId]: {
                location,

                lastStopEvent:
                  current[
                    location.vehicleId
                  ]?.lastStopEvent ??
                  null,
              },
            }),
          );
        },
      );

      function handleStopEvent(
        event:
          TripStopEvent,
      ): void {
        if (
          event.tenantId !==
          tenantId
        ) {
          return;
        }

        setLiveVehicles(
          (
            current,
          ) => {
            const existing =
              current[
                event.vehicleId
              ];

            if (!existing) {
              return current;
            }

            return {
              ...current,

              [event.vehicleId]: {
                ...existing,

                lastStopEvent:
                  event,
              },
            };
          },
        );
      }

      socket.on(
        'trip.stop.arrived',
        handleStopEvent,
      );

      socket.on(
        'trip.stop.departed',
        handleStopEvent,
      );

      socket.connect();

      return () => {
        socket.off(
          'connection.ready',
        );

        socket.off(
          'connection.denied',
        );

        socket.off(
          'connect_error',
        );

        socket.off(
          'disconnect',
        );

        socket.off(
          'vehicle.location.updated',
        );

        socket.off(
          'trip.stop.arrived',
          handleStopEvent,
        );

        socket.off(
          'trip.stop.departed',
          handleStopEvent,
        );

        socket.disconnect();
      };
    },
    [
      tenantId,
      canReadFleet,
    ],
  );

  const trackedVehicles =
    Object.values(
      liveVehicles,
    )
      .filter(
        (
          item,
        ) =>
          vehicleById.has(
            item.location
              .vehicleId,
          ),
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.location
            .recordedAtEpochMs -
          left.location
            .recordedAtEpochMs,
      );

  const operationalMapMarkers =
    trackedVehicles.flatMap(
      (
        item,
      ) => {
        const vehicle =
          vehicleById.get(
            item.location
              .vehicleId,
          );

        if (!vehicle) {
          return [];
        }

        return [
          {
            key:
              vehicle.id,

            label:
              vehicleLabel(
                vehicle,
              ),

            subtitle:
              item.lastStopEvent
                ? `${
                    item.lastStopEvent
                      .eventType ===
                    'trip.stop.arrived'
                      ? 'Arrived at'
                      : 'Departed'
                  } ${
                    item.lastStopEvent
                      .stopName
                  }`
                : 'Live vehicle',

            latitude:
              item.location
                .latitude,

            longitude:
              item.location
                .longitude,

            speedKph:
              item.location
                .speedKph,

            heading:
              item.location
                .heading,

            accuracyMeters:
              item.location
                .accuracyMeters,
          },
        ];
      },
    );

  const operationalStopMapMarkers =
    trackedVehicles.flatMap(
      (
        item,
      ) => {
        const nextStop =
          item.location
            .nextStop;

        const vehicle =
          vehicleById.get(
            item.location
              .vehicleId,
          );

        if (
          !nextStop ||
          !vehicle
        ) {
          return [];
        }

        return [
          {
            key:
              `${vehicle.id}:next-stop:${nextStop.tripStopId}`,

            kind:
              'stop' as const,

            label:
              nextStop.stopName,

            subtitle:
              `Next stop for ${vehicleLabel(
                vehicle,
              )}`,

            latitude:
              nextStop.latitude,

            longitude:
              nextStop.longitude,
          },
        ];
      },
    );

  const allOperationalMapMarkers = [
    ...operationalMapMarkers,
    ...operationalStopMapMarkers,
  ];

  if (!canReadFleet) {
    if (!tenantId) {
      return (
        <Alert severity="error">
          No active tenant.
        </Alert>
      );
    }

    return (
      <GuardianTrackingPanel
        tenantId={tenantId}
      />
    );
  }

  return (
    <Box>
      <Box
        sx={{
          mb:
            3,

          display:
            'flex',

          justifyContent:
            'space-between',

          alignItems: {
            xs:
              'flex-start',

            sm:
              'center',
          },

          flexDirection: {
            xs:
              'column',

            sm:
              'row',
          },

          gap:
            2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize:
                26,

              fontWeight:
                850,

              letterSpacing:
                '-0.03em',
            }}
          >
            Live Tracking
          </Typography>

          <Typography
            sx={{
              mt:
                0.5,

              color:
                'text.secondary',

              fontSize:
                13.5,
            }}
          >
            Realtime GPS positions from the school transport fleet.
          </Typography>
        </Box>

        <Chip
          icon={
            connectionStatus ===
            'connected'
              ? <WifiRounded />
              : <WifiOffRounded />
          }
          label={
            connectionStatus ===
            'connected'
              ? 'Realtime connected'
              : connectionStatus ===
                  'connecting'
                ? 'Connecting'
                : connectionStatus ===
                    'denied'
                  ? 'Access denied'
                  : 'Disconnected'
          }
          color={
            connectionStatus ===
            'connected'
              ? 'success'
              : connectionStatus ===
                  'error' ||
                connectionStatus ===
                  'denied'
                ? 'error'
                : 'default'
          }
          variant="outlined"
        />
      </Box>

      {vehiclesQuery.isLoading ? (
        <Paper
          elevation={
            0
          }
          sx={{
            py:
              7,

            display:
              'grid',

            placeItems:
              'center',

            border:
              '1px solid',

            borderColor:
              'divider',
          }}
        >
          <CircularProgress
            size={
              30
            }
          />
        </Paper>
      ) : null}

      {vehiclesQuery.isError ? (
        <Alert
          severity="error"
          sx={{
            mb:
              2,
          }}
        >
          {errorMessage(
            vehiclesQuery.error,
          )}
        </Alert>
      ) : null}

      {connectionError ? (
        <Alert
          severity="error"
          sx={{
            mb:
              2,
          }}
        >
          {connectionError}
        </Alert>
      ) : null}

      {allOperationalMapMarkers.length >
      0 ? (
        <Box
          sx={{
            mb:
              2.5,
          }}
        >
          <LiveTrackingMap
            markers={
              allOperationalMapMarkers
            }
          />
        </Box>
      ) : null}

      {trackedVehicles.some(
        (
          item,
        ) =>
          Boolean(
            item.location
              .nextStop,
          ),
      ) ? (
        <Box
          sx={{
            mb:
              2.5,
          }}
        >
          <Typography
            sx={{
              mb:
                1.25,

              fontWeight:
                850,

              fontSize:
                14,
            }}
          >
            Next stops and ETA
          </Typography>

          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                md:
                  'repeat(2, minmax(0, 1fr))',

                xl:
                  'repeat(3, minmax(0, 1fr))',
              },

              gap:
                1.5,
            }}
          >
            {trackedVehicles.map(
              (
                item,
              ) => {
                const vehicle =
                  vehicleById.get(
                    item.location
                      .vehicleId,
                  );

                if (
                  !vehicle ||
                  !item.location
                    .nextStop
                ) {
                  return null;
                }

                return (
                  <TrackingProgressPanel
                    key={
                      vehicle.id
                    }
                    label={
                      vehicleLabel(
                        vehicle,
                      )
                    }
                    nextStop={
                      item.location
                        .nextStop
                    }
                  />
                );
              },
            )}
          </Box>
        </Box>
      ) : null}

      {!vehiclesQuery.isLoading &&
      !vehiclesQuery.isError &&
      connectionStatus ===
        'connected' &&
      trackedVehicles.length ===
        0 ? (
        <Paper
          elevation={
            0
          }
          sx={{
            p:
              4,

            textAlign:
              'center',

            border:
              '1px solid',

            borderColor:
              'divider',
          }}
        >
          <GpsFixedRounded
            sx={{
              fontSize:
                42,

              color:
                'primary.main',
            }}
          />

          <Typography
            sx={{
              mt:
                1.5,

              fontWeight:
                800,
            }}
          >
            Waiting for live GPS data
          </Typography>

          <Typography
            sx={{
              mt:
                0.5,

              color:
                'text.secondary',

              fontSize:
                12.5,
            }}
          >
            The realtime gateway is connected. Vehicles will appear here as location events arrive.
          </Typography>
        </Paper>
      ) : null}

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            md:
              'repeat(2, minmax(0, 1fr))',

            xl:
              'repeat(3, minmax(0, 1fr))',
          },

          gap:
            2,
        }}
      >
        {trackedVehicles.map(
          (
            item,
          ) => {
            const vehicle =
              vehicleById.get(
                item.location
                  .vehicleId,
              );

            if (!vehicle) {
              return null;
            }

            return (
              <Paper
                key={
                  vehicle.id
                }
                elevation={
                  0
                }
                sx={{
                  p:
                    2.5,

                  border:
                    '1px solid',

                  borderColor:
                    'divider',
                }}
              >
                <Box
                  sx={{
                    display:
                      'flex',

                    alignItems:
                      'center',

                    gap:
                      1.25,
                  }}
                >
                  <DirectionsBusRounded
                    color="primary"
                  />

                  <Box>
                    <Typography
                      sx={{
                        fontWeight:
                          850,

                        fontSize:
                          16,
                      }}
                    >
                      {vehicleLabel(
                        vehicle,
                      )}
                    </Typography>

                    <Typography
                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          11.5,
                      }}
                    >
                      Live vehicle
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    mt:
                      2.25,

                    display:
                      'grid',

                    gridTemplateColumns:
                      'repeat(2, minmax(0, 1fr))',

                    gap:
                      1.5,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          10.5,

                        textTransform:
                          'uppercase',

                        letterSpacing:
                          '0.06em',
                      }}
                    >
                      Latitude
                    </Typography>

                    <Typography
                      sx={{
                        mt:
                          0.25,

                        fontWeight:
                          750,

                        fontSize:
                          13,
                      }}
                    >
                      {item.location
                        .latitude
                        .toFixed(
                          6,
                        )}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          10.5,

                        textTransform:
                          'uppercase',

                        letterSpacing:
                          '0.06em',
                      }}
                    >
                      Longitude
                    </Typography>

                    <Typography
                      sx={{
                        mt:
                          0.25,

                        fontWeight:
                          750,

                        fontSize:
                          13,
                      }}
                    >
                      {item.location
                        .longitude
                        .toFixed(
                          6,
                        )}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          10.5,

                        textTransform:
                          'uppercase',

                        letterSpacing:
                          '0.06em',
                      }}
                    >
                      Speed
                    </Typography>

                    <Box
                      sx={{
                        mt:
                          0.25,

                        display:
                          'flex',

                        alignItems:
                          'center',

                        gap:
                          0.5,
                      }}
                    >
                      <SpeedRounded
                        sx={{
                          fontSize:
                            15,
                        }}
                      />

                      <Typography
                        sx={{
                          fontWeight:
                            750,

                          fontSize:
                            13,
                        }}
                      >
                        {item.location
                          .speedKph ===
                        null
                          ? '—'
                          : `${Math.round(
                              item.location
                                .speedKph,
                            )} km/h`}
                      </Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          10.5,

                        textTransform:
                          'uppercase',

                        letterSpacing:
                          '0.06em',
                      }}
                    >
                      Heading
                    </Typography>

                    <Typography
                      sx={{
                        mt:
                          0.25,

                        fontWeight:
                          750,

                        fontSize:
                          13,
                      }}
                    >
                      {item.location
                        .heading ===
                      null
                        ? '—'
                        : `${Math.round(
                            item.location
                              .heading,
                          )}°`}
                    </Typography>
                  </Box>
                </Box>

                {item.lastStopEvent ? (
                  <Alert
                    severity="info"
                    sx={{
                      mt:
                        2,
                    }}
                  >
                    {item.lastStopEvent
                      .eventType ===
                    'trip.stop.arrived'
                      ? 'Arrived at'
                      : 'Departed'}{' '}
                    {item.lastStopEvent
                      .stopName}
                  </Alert>
                ) : null}

                <Typography
                  sx={{
                    mt:
                      2,

                    color:
                      'text.secondary',

                    fontSize:
                      10.5,
                  }}
                >
                  Last update:{' '}
                  {formatDateTime(
                    item.location
                      .recordedAt,
                  )}
                </Typography>
              </Paper>
            );
          },
        )}
      </Box>
    </Box>
  );
}
