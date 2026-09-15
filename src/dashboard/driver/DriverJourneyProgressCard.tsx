import {
  useEffect,
  useState,
} from 'react';

import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';

import {
  CheckCircleRounded,
  LocationOnRounded,
  RadioButtonUncheckedRounded,
  ScheduleRounded,
  SkipNextRounded,
  WifiOffRounded,
  WifiRounded,
} from '@mui/icons-material';

import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  LiveTrackingMap,
} from '../../tracking/LiveTrackingMap';

import {
  TrackingProgressPanel,
} from '../../tracking/TrackingProgressPanel';

import {
  createTrackingSocket,
  subscribeToTrip,
  unsubscribeFromTrip,
  type TrackingConnectionDenied,
  type TrackingConnectionReady,
  type TripStopEvent,
  type VehicleLocationUpdate,
} from '../../tracking/tracking.realtime';

import {
  getMyJourneyProgress,
  type DriverJourneyStop,
  type DriverJourneyStopStatus,
} from './driver-me.api';


type DriverRealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'denied'
  | 'error';


interface DriverJourneyProgressCardProps {
  tenantId:
    string | undefined;

  enabled:
    boolean;
}


function formatTime(
  value:
    string | null,
): string {
  if (!value) {
    return '—';
  }

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
      hour:
        '2-digit',

      minute:
        '2-digit',

      timeZone:
        'Africa/Nairobi',
    },
  ).format(
    date,
  );
}


function statusLabel(
  status:
    DriverJourneyStopStatus,
): string {
  switch (
    status
  ) {
    case 'pending':
      return 'Upcoming';

    case 'arrived':
      return 'Current';

    case 'departed':
      return 'Completed';

    case 'skipped':
      return 'Skipped';
  }
}


function stopIcon(
  status:
    DriverJourneyStopStatus,
) {
  switch (
    status
  ) {
    case 'departed':
      return (
        <CheckCircleRounded
          color="success"
        />
      );

    case 'arrived':
      return (
        <LocationOnRounded
          color="primary"
        />
      );

    case 'skipped':
      return (
        <SkipNextRounded
          color="disabled"
        />
      );

    case 'pending':
      return (
        <RadioButtonUncheckedRounded
          color="disabled"
        />
      );
  }
}


function stopTime(
  stop:
    DriverJourneyStop,
): string {
  if (
    stop.status ===
      'departed' &&
    stop.actualDepartureAt
  ) {
    return (
      `Departed ${formatTime(
        stop.actualDepartureAt,
      )}`
    );
  }

  if (
    stop.status ===
      'arrived' &&
    stop.actualArrivalAt
  ) {
    return (
      `Arrived ${formatTime(
        stop.actualArrivalAt,
      )}`
    );
  }

  if (
    stop.status ===
    'skipped'
  ) {
    return 'Skipped';
  }

  return (
    `Scheduled ${formatTime(
      stop.scheduledArrivalAt,
    )}`
  );
}


/**
 * Driver-facing stop progress.
 *
 * This component never accepts or chooses a trip ID.
 *
 * The backend decides which trip belongs to the authenticated
 * Driver and returns only that journey's stop snapshot.
 */
export function DriverJourneyProgressCard({
  tenantId,
  enabled,
}: DriverJourneyProgressCardProps) {
  const queryClient =
    useQueryClient();


  const [
    driverRealtimeStatus,
    setDriverRealtimeStatus,
  ] =
    useState<DriverRealtimeStatus>(
      'connecting',
    );


  const [
    realtimeError,
    setRealtimeError,
  ] =
    useState<
      string | null
    >(
      null,
    );


  const [
    liveVehicleLocation,
    setLiveVehicleLocation,
  ] =
    useState<
      VehicleLocationUpdate | null
    >(
      null,
    );


  const progressQuery =
    useQuery({
      queryKey: [
        'my-driver-journey-progress',
        tenantId,
      ],

      enabled:
        Boolean(
          tenantId &&
          enabled,
        ),

      queryFn:
        async () => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return getMyJourneyProgress(
            tenantId,
          );
        },

      /**
       * Temporary resilient fallback.
       *
       * The next checkpoint will also invalidate this query
       * from realtime stop arrival/departure events.
       */
      refetchInterval:
        enabled
          ? 15_000
          : false,
    });



  const assignedTripId =
    progressQuery.data
      ?.tripId ??
    null;


  // ==========================================================
  // DRIVER JOURNEY REALTIME SUBSCRIPTION
  //
  // SECURITY:
  //
  // The browser receives the trip ID from the relationship-
  // scoped Driver progress endpoint.
  //
  // The realtime gateway independently proves:
  //
  // authenticated user
  //   -> drivers.user_id
  //   -> trips.driver_id
  //
  // before allowing this socket into the trip room.
  //
  // IMPORTANT:
  //
  // We refresh the HTTP stop snapshot only for stop lifecycle
  // events. We deliberately do NOT refetch on every GPS packet
  // because vehicle telemetry may arrive very frequently.
  // ==========================================================

  useEffect(
    () => {
      if (
        !enabled ||
        !tenantId ||
        !assignedTripId
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
          error instanceof Error
            ? error.message
            : 'Realtime connection could not be created.';

        queueMicrotask(
          () => {
            setDriverRealtimeStatus(
              'error',
            );

            setRealtimeError(
              message,
            );
          },
        );

        return;
      }


      /**
       * Socket.IO emits `connect` after the transport is
       * established.
       *
       * Connection state therefore follows the external socket
       * system rather than being synchronously changed by the
       * React effect itself.
       */
      socket.on(
        'connect',
        () => {
          setDriverRealtimeStatus(
            'connecting',
          );

          setRealtimeError(
            null,
          );
        },
      );


      socket.on(
        'connection.ready',
        async (
          ready:
            TrackingConnectionReady,
        ) => {
          if (
            ready.tenantId !==
            tenantId
          ) {
            return;
          }


          try {
            const result =
              await subscribeToTrip(
                socket,
                assignedTripId,
              );


            if (!result.ok) {
              throw new Error(
                result.message ??
                'Driver trip subscription was denied',
              );
            }


            setDriverRealtimeStatus(
              'connected',
            );

            setRealtimeError(
              null,
            );
          } catch (
            error
          ) {
            setDriverRealtimeStatus(
              'denied',
            );

            setRealtimeError(
              error instanceof Error
                ? error.message
                : 'Driver trip subscription was denied',
            );
          }
        },
      );


      socket.on(
        'connection.denied',
        (
          denied:
            TrackingConnectionDenied,
        ) => {
          setDriverRealtimeStatus(
            'denied',
          );

          setRealtimeError(
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
          setDriverRealtimeStatus(
            'error',
          );

          setRealtimeError(
            error.message,
          );
        },
      );


      socket.on(
        'disconnect',
        () => {
          setDriverRealtimeStatus(
            'disconnected',
          );
        },
      );


      function handleVehicleLocation(
        location:
          VehicleLocationUpdate,
      ): void {
        if (
          location.tenantId !==
            tenantId ||
          location.tripId !==
            assignedTripId
        ) {
          return;
        }


        /**
         * GPS telemetry can arrive frequently.
         *
         * Keep the latest packet in local React state for
         * map / ETA rendering instead of invalidating the
         * Journey Progress HTTP query for every GPS update.
         */
        setLiveVehicleLocation(
          location,
        );
      }


      function handleStopEvent(
        event:
          TripStopEvent,
      ): void {
        if (
          event.tenantId !==
            tenantId ||
          event.tripId !==
            assignedTripId
        ) {
          return;
        }


        /**
         * Arrival/departure changes the authoritative
         * trip_stops snapshot, so immediately reload it.
         */
        void queryClient.invalidateQueries({
          queryKey: [
            'my-driver-journey-progress',
            tenantId,
          ],
        });
      }


      socket.on(
        'vehicle.location.updated',
        handleVehicleLocation,
      );


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
        void unsubscribeFromTrip(
          socket,
          assignedTripId,
        ).catch(
          () =>
            undefined,
        );

        socket.off(
          'connect',
        );

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
          handleVehicleLocation,
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
      enabled,
      assignedTripId,
      queryClient,
    ],
  );


  if (!enabled) {
    return null;
  }


  if (
    progressQuery.isLoading
  ) {
    return (
      <Paper
        elevation={
          0
        }
        sx={{
          mt:
            2.5,

          p:
            4,

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
            26
          }
        />
      </Paper>
    );
  }


  if (
    progressQuery.isError
  ) {
    return (
      <Paper
        elevation={
          0
        }
        sx={{
          mt:
            2.5,

          p:
            3,

          border:
            '1px solid',

          borderColor:
            'divider',
        }}
      >
        <Typography
          sx={{
            fontWeight:
              800,
          }}
        >
          Journey progress unavailable
        </Typography>

        <Typography
          sx={{
            mt:
              0.5,

            color:
              'text.secondary',

            fontSize:
              13,
          }}
        >
          The stop information could not be loaded.
        </Typography>
      </Paper>
    );
  }


  const progress =
    progressQuery.data;


  /**
   * Do not display a stale GPS packet if the Driver assignment
   * changes before a new telemetry packet arrives.
   */
  const activeLiveLocation =
    liveVehicleLocation
      ?.tenantId ===
        tenantId &&
    liveVehicleLocation
      ?.tripId ===
        assignedTripId
      ? liveVehicleLocation
      : null;


  const liveMapMarkers =
    activeLiveLocation
      ? [
          {
            key:
              'driver-live-vehicle',

            label:
              'Your vehicle',

            subtitle:
              'Live journey position',

            latitude:
              activeLiveLocation
                .latitude,

            longitude:
              activeLiveLocation
                .longitude,

            speedKph:
              activeLiveLocation
                .speedKph,

            heading:
              activeLiveLocation
                .heading,

            accuracyMeters:
              activeLiveLocation
                .accuracyMeters,
          },

          ...(
            activeLiveLocation
              .nextStop
              ? [
                  {
                    key:
                      'driver-next-stop',

                    kind:
                      'stop' as const,

                    label:
                      activeLiveLocation
                        .nextStop
                        .stopName,

                    subtitle:
                      'Next stop',

                    latitude:
                      activeLiveLocation
                        .nextStop
                        .latitude,

                    longitude:
                      activeLiveLocation
                        .nextStop
                        .longitude,
                  },
                ]
              : []
          ),
        ]
      : [];


  if (!progress) {
    return null;
  }


  return (
    <Paper
      elevation={
        0
      }
      sx={{
        mt:
          2.5,

        p: {
          xs:
            3,

          md:
            3.5,
        },

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
            sx={{
              fontSize:
                20,

              fontWeight:
                900,
            }}
          >
            Journey progress
          </Typography>

          <Typography
            sx={{
              mt:
                0.5,

              color:
                'text.secondary',

              fontSize:
                13,
            }}
          >
            {progress.completedStops}
            {' of '}
            {progress.totalStops}
            {' stops completed'}
          </Typography>
        </Box>

        <Box
          sx={{
            display:
              'flex',

            gap:
              1,

            flexWrap:
              'wrap',

            alignItems:
              'center',
          }}
        >
          <Chip
            icon={
              driverRealtimeStatus ===
              'connected'
                ? <WifiRounded />
                : <WifiOffRounded />
            }

            label={
              driverRealtimeStatus ===
              'connected'
                ? 'Live updates'
                : driverRealtimeStatus ===
                  'connecting'
                  ? 'Connecting'
                  : driverRealtimeStatus ===
                    'denied'
                    ? 'Realtime denied'
                    : driverRealtimeStatus ===
                      'error'
                      ? 'Realtime error'
                      : 'Disconnected'
            }

            color={
              driverRealtimeStatus ===
              'connected'
                ? 'success'
                : driverRealtimeStatus ===
                    'denied' ||
                  driverRealtimeStatus ===
                    'error'
                  ? 'error'
                  : 'default'
            }

            variant="outlined"
          />

          <Chip
            label={
              `${progress.progressPercent}% complete`
            }

            variant="outlined"
          />
        </Box>
      </Box>


      {realtimeError ? (
        <Typography
          sx={{
            mt:
              1.5,

            color:
              'text.secondary',

            fontSize:
              11.5,
          }}
        >
          Live updates unavailable. Journey progress will
          continue refreshing automatically.
        </Typography>
      ) : null}


      <LinearProgress
        variant="determinate"

        value={
          progress.progressPercent
        }

        sx={{
          mt:
            2.5,

          height:
            8,

          borderRadius:
            8,
        }}
      />


      {activeLiveLocation ? (
        <Box
          sx={{
            mt:
              3,
          }}
        >
          <Typography
            sx={{
              mb:
                1.25,

              fontSize:
                12,

              fontWeight:
                800,

              textTransform:
                'uppercase',

              letterSpacing:
                '0.07em',

              color:
                'text.secondary',
            }}
          >
            Live vehicle &amp; ETA
          </Typography>


          {activeLiveLocation.nextStop ? (
            <Box
              sx={{
                mb:
                  1.5,
              }}
            >
              <TrackingProgressPanel
                label="Your journey"

                nextStop={
                  activeLiveLocation
                    .nextStop
                }
              />
            </Box>
          ) : null}


          {liveMapMarkers.length >
          0 ? (
            <LiveTrackingMap
              markers={
                liveMapMarkers
              }

              height={
                300
              }
            />
          ) : null}
        </Box>
      ) : null}


      <Box
        sx={{
          mt:
            3,

          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            md:
              '1fr 1fr',
          },

          gap:
            1.5,
        }}
      >
        <Paper
          elevation={
            0
          }
          sx={{
            p:
              2,

            border:
              '1px solid',

            borderColor:
              progress.currentStop
                ? 'primary.main'
                : 'divider',
          }}
        >
          <Typography
            sx={{
              color:
                'text.secondary',

              fontSize:
                10.5,

              fontWeight:
                750,

              textTransform:
                'uppercase',

              letterSpacing:
                '0.08em',
            }}
          >
            Current stop
          </Typography>

          <Typography
            sx={{
              mt:
                0.7,

              fontSize:
                18,

              fontWeight:
                850,
            }}
          >
            {progress.currentStop
              ?.stopName ??
              'Between stops'}
          </Typography>

          {progress.currentStop ? (
            <Typography
              sx={{
                mt:
                  0.5,

                color:
                  'text.secondary',

                fontSize:
                  12,
              }}
            >
              Stop{' '}
              {
                progress
                  .currentStop
                  .stopOrder
              }
            </Typography>
          ) : null}
        </Paper>


        <Paper
          elevation={
            0
          }
          sx={{
            p:
              2,

            border:
              '1px solid',

            borderColor:
              'divider',
          }}
        >
          <Typography
            sx={{
              color:
                'text.secondary',

              fontSize:
                10.5,

              fontWeight:
                750,

              textTransform:
                'uppercase',

              letterSpacing:
                '0.08em',
            }}
          >
            Next stop
          </Typography>

          <Typography
            sx={{
              mt:
                0.7,

              fontSize:
                18,

              fontWeight:
                850,
            }}
          >
            {progress.nextStop
              ?.stopName ??
              'No remaining stops'}
          </Typography>

          {progress.nextStop ? (
            <Typography
              sx={{
                mt:
                  0.5,

                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  0.5,

                color:
                  'text.secondary',

                fontSize:
                  12,
              }}
            >
              <ScheduleRounded
                sx={{
                  fontSize:
                    15,
                }}
              />

              {formatTime(
                progress
                  .nextStop
                  .scheduledArrivalAt,
              )}
            </Typography>
          ) : null}
        </Paper>
      </Box>


      <Divider
        sx={{
          my:
            3,
        }}
      />


      <Typography
        sx={{
          mb:
            1.5,

          fontSize:
            12,

          fontWeight:
            800,

          textTransform:
            'uppercase',

          letterSpacing:
            '0.07em',

          color:
            'text.secondary',
        }}
      >
        Route stops
      </Typography>


      {progress.stops.length ===
      0 ? (
        <Typography
          sx={{
            color:
              'text.secondary',

            fontSize:
              13,
          }}
        >
          No stops are configured for this journey.
        </Typography>
      ) : (
        <Box>
          {progress.stops.map(
            (
              stop,
              index,
            ) => (
              <Box
                key={
                  stop.id
                }
                sx={{
                  display:
                    'grid',

                  gridTemplateColumns:
                    '34px minmax(0, 1fr) auto',

                  gap:
                    1,

                  alignItems:
                    'center',

                  py:
                    1.4,

                  borderBottom:
                    index <
                    progress
                      .stops
                      .length -
                      1
                      ? '1px solid'
                      : 'none',

                  borderColor:
                    'divider',
                }}
              >
                <Box
                  sx={{
                    display:
                      'grid',

                    placeItems:
                      'center',
                  }}
                >
                  {stopIcon(
                    stop.status,
                  )}
                </Box>


                <Box
                  sx={{
                    minWidth:
                      0,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize:
                        14,

                      fontWeight:
                        stop.status ===
                        'arrived'
                          ? 900
                          : 750,
                    }}
                  >
                    {stop.stopOrder}
                    {'. '}
                    {stop.stopName}
                  </Typography>

                  <Typography
                    sx={{
                      mt:
                        0.2,

                      color:
                        'text.secondary',

                      fontSize:
                        11.5,
                    }}
                  >
                    {stopTime(
                      stop,
                    )}
                  </Typography>
                </Box>


                <Chip
                  size="small"

                  label={
                    statusLabel(
                      stop.status,
                    )
                  }

                  color={
                    stop.status ===
                    'arrived'
                      ? 'primary'
                      : stop.status ===
                        'departed'
                        ? 'success'
                        : 'default'
                  }

                  variant={
                    stop.status ===
                    'pending'
                      ? 'outlined'
                      : 'filled'
                  }
                />
              </Box>
            ),
          )}
        </Box>
      )}
    </Paper>
  );
}
