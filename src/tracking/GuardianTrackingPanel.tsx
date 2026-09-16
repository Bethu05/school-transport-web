import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";

import {
  CenterFocusStrongRounded,
  DirectionsBusRounded,
  FamilyRestroomRounded,
  GpsFixedRounded,
  WifiRounded,
  WifiOffRounded,
} from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import {
  listMyTrackableChildren,
  type GuardianTrackableChild,
} from "./guardian-tracking.api";

import { LiveTrackingMap } from "./LiveTrackingMap";

import { TrackingProgressPanel } from "./TrackingProgressPanel";

import { sliceRouteBetweenPoints } from "./route-segment";

import {
  createTrackingSocket,
  subscribeToTrip,
  unsubscribeFromTrip,
  type TrackingConnectionDenied,
  type TrackingConnectionReady,
  type VehicleLocationUpdate,
} from "./tracking.realtime";

interface GuardianTrackingPanelProps {
  tenantId: string;
}

const EMPTY_TRACKABLE_CHILDREN: GuardianTrackableChild[] = [];

type ConnectionStatus =
  "connecting" | "connected" | "disconnected" | "denied" | "error";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Live trip tracking could not be loaded.";
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",

    timeStyle: "medium",

    timeZone: "Africa/Nairobi",
  }).format(date);
}

export function GuardianTrackingPanel({
  tenantId,
}: GuardianTrackingPanelProps) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  const [connectionError, setConnectionError] = useState<string | null>(null);

  /**
   * WebSocket locations are kept separately from the bootstrap
   * response.
   *
   * During rendering we choose whichever packet has the newest
   * recordedAtEpochMs. This prevents a late HTTP response or a
   * stale realtime packet from moving the bus backwards.
   */
  const [realtimeLocationsByTrip, setRealtimeLocationsByTrip] = useState<
    Record<string, VehicleLocationUpdate>
  >({});

  const [realtimeTrailsByTrip, setRealtimeTrailsByTrip] = useState<
    Record<
      string,
      {
        latitude: number;
        longitude: number;
        recordedAtEpochMs: number;
      }[]
    >
  >({});

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const [followTripId, setFollowTripId] = useState<string | null>(null);

  function selectTrip(tripId: string): void {
    setSelectedTripId(tripId);

    /**
     * If Follow Bus is already enabled, transfer it to the
     * newly selected authorised journey.
     */
    setFollowTripId((current) => (current === null ? null : tripId));
  }

  const guardianQuery = useQuery({
    queryKey: ["guardian-live-tracking", tenantId],

    queryFn: () => listMyTrackableChildren(tenantId),
  });

  const trackableChildren = guardianQuery.data ?? EMPTY_TRACKABLE_CHILDREN;

  const activeTripIds = useMemo(
    () =>
      Array.from(
        new Set(
          trackableChildren
            .map((entry) => entry.activeTrip?.tripId)
            .filter((tripId): tripId is string => Boolean(tripId)),
        ),
      ),
    [trackableChildren],
  );

  const childrenByTrip = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const entry of trackableChildren) {
      const tripId = entry.activeTrip?.tripId;

      if (!tripId) {
        continue;
      }

      const label = `${entry.child.firstName} ${entry.child.lastName}`;

      map.set(tripId, [...(map.get(tripId) ?? []), label]);
    }

    return map;
  }, [trackableChildren]);

  /**
   * Each bootstrap is already relationship-authorised by the
   * backend. Keying it by trip keeps all rendering below scoped
   * to the exact journeys returned for this Guardian.
   */
  const bootstrapByTrip = useMemo(() => {
    const map = new Map(
      trackableChildren.flatMap((entry) =>
        entry.trackingBootstrap
          ? [
              [
                entry.trackingBootstrap.activeTrip.tripId,
                entry.trackingBootstrap,
              ] as const,
            ]
          : [],
      ),
    );

    return map;
  }, [trackableChildren]);

  const locationsByTrip = useMemo(() => {
    const locations: Record<string, VehicleLocationUpdate> = {};

    for (const tripId of activeTripIds) {
      const bootstrapLocation =
        bootstrapByTrip.get(tripId)?.latestLocation ?? null;

      const realtimeLocation = realtimeLocationsByTrip[tripId] ?? null;

      if (
        realtimeLocation &&
        (!bootstrapLocation ||
          realtimeLocation.recordedAtEpochMs >=
            bootstrapLocation.recordedAtEpochMs)
      ) {
        locations[tripId] = realtimeLocation;

        continue;
      }

      if (bootstrapLocation) {
        locations[tripId] = bootstrapLocation;
      }
    }

    return locations;
  }, [activeTripIds, bootstrapByTrip, realtimeLocationsByTrip]);

  const effectiveSelectedTripId =
    selectedTripId && activeTripIds.includes(selectedTripId)
      ? selectedTripId
      : (activeTripIds[0] ?? null);

  const selectedLocation = effectiveSelectedTripId
    ? (locationsByTrip[effectiveSelectedTripId] ?? null)
    : null;

  const selectedBootstrap = effectiveSelectedTripId
    ? (bootstrapByTrip.get(effectiveSelectedTripId) ?? null)
    : null;

  const selectedPlannedRoute =
    selectedBootstrap?.routeGeometry?.status === "ready" &&
    selectedBootstrap.routeGeometry.geometry
      ? {
          key: selectedBootstrap.routeGeometry.routeId,

          coordinates: selectedBootstrap.routeGeometry.geometry.coordinates,
        }
      : null;

  /**
   * The highlighted road ahead is presentation-only geometry.
   *
   * ETA/distance values remain authoritative from the backend
   * realtime packet.
   */
  const selectedRemainingRouteCoordinates =
    selectedPlannedRoute && selectedLocation?.nextStop
      ? sliceRouteBetweenPoints(
          selectedPlannedRoute.coordinates,
          {
            latitude: selectedLocation.latitude,

            longitude: selectedLocation.longitude,
          },
          {
            latitude: selectedLocation.nextStop.latitude,

            longitude: selectedLocation.nextStop.longitude,
          },
        )
      : null;

  const selectedRemainingRoute =
    selectedRemainingRouteCoordinates && selectedLocation?.nextStop
      ? {
          key: `${selectedLocation.tripId}:remaining:${selectedLocation.nextStop.tripStopId}`,

          coordinates: selectedRemainingRouteCoordinates,
        }
      : null;

  const guardianTrails = activeTripIds.map((tripId) => {
    const bootstrapLocation =
      bootstrapByTrip.get(tripId)?.latestLocation ?? null;

    const realtimeTrail = realtimeTrailsByTrip[tripId] ?? [];

    const points = [
      ...(bootstrapLocation
        ? [
            {
              latitude: bootstrapLocation.latitude,

              longitude: bootstrapLocation.longitude,

              recordedAtEpochMs: bootstrapLocation.recordedAtEpochMs,
            },
          ]
        : []),

      ...realtimeTrail.filter(
        (point) =>
          !bootstrapLocation ||
          point.recordedAtEpochMs > bootstrapLocation.recordedAtEpochMs,
      ),
    ]
      .filter(
        (point, index, all) =>
          index === 0 ||
          Math.abs(point.latitude - all[index - 1].latitude) > 0.000001 ||
          Math.abs(point.longitude - all[index - 1].longitude) > 0.000001,
      )
      .slice(-40);

    return {
      key: tripId,

      points: points.map((point) => ({
        latitude: point.latitude,

        longitude: point.longitude,
      })),
    };
  });

  const guardianMapMarkers = activeTripIds.flatMap((tripId) => {
    const location = locationsByTrip[tripId];

    if (!location) {
      return [];
    }

    const children = childrenByTrip.get(tripId) ?? [];

    return [
      {
        key: tripId,

        label: children.length > 0 ? children.join(", ") : "School bus",

        subtitle: "Active school journey",

        latitude: location.latitude,

        longitude: location.longitude,

        speedKph: location.speedKph,

        heading: location.heading,

        accuracyMeters: location.accuracyMeters,
      },
    ];
  });

  const guardianStopMapMarkers = activeTripIds.flatMap((tripId) => {
    const location = locationsByTrip[tripId];

    const nextStop = location?.nextStop;

    if (!nextStop) {
      return [];
    }

    const children = childrenByTrip.get(tripId) ?? [];

    return [
      {
        key: `${tripId}:next-stop:${nextStop.tripStopId}`,

        kind: "stop" as const,

        label: nextStop.stopName,

        subtitle:
          children.length > 0
            ? `Next stop for ${children.join(", ")}`
            : "Next school stop",

        latitude: nextStop.latitude,

        longitude: nextStop.longitude,
      },
    ];
  });

  const allGuardianMapMarkers = [
    ...guardianMapMarkers,
    ...guardianStopMapMarkers,
  ];

  useEffect(() => {
    if (
      guardianQuery.isLoading ||
      guardianQuery.isError ||
      activeTripIds.length === 0
    ) {
      return;
    }

    const socket = createTrackingSocket(tenantId);

    socket.on("connection.ready", async (ready: TrackingConnectionReady) => {
      if (ready.tenantId !== tenantId) {
        return;
      }

      try {
        for (const tripId of activeTripIds) {
          const result = await subscribeToTrip(socket, tripId);

          if (!result.ok) {
            throw new Error(result.message ?? "Trip subscription was denied");
          }
        }

        setConnectionStatus("connected");

        setConnectionError(null);
      } catch (error) {
        setConnectionStatus("denied");

        setConnectionError(errorMessage(error));
      }
    });

    socket.on("connection.denied", (denied: TrackingConnectionDenied) => {
      setConnectionStatus("denied");

      setConnectionError(denied.message);
    });

    socket.on("connect_error", (error: Error) => {
      setConnectionStatus("error");

      setConnectionError(error.message);
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("vehicle.location.updated", (location: VehicleLocationUpdate) => {
      if (
        location.tenantId !== tenantId ||
        !location.tripId ||
        !activeTripIds.includes(location.tripId)
      ) {
        return;
      }

      const tripId = location.tripId;

      setRealtimeLocationsByTrip((current) => {
        const existing = current[tripId];

        if (
          existing &&
          existing.recordedAtEpochMs >= location.recordedAtEpochMs
        ) {
          return current;
        }

        return {
          ...current,

          [tripId]: location,
        };
      });

      setRealtimeTrailsByTrip((current) => {
        const previous = current[tripId] ?? [];

        const last = previous[previous.length - 1];

        const moved =
          !last ||
          Math.abs(last.latitude - location.latitude) > 0.000001 ||
          Math.abs(last.longitude - location.longitude) > 0.000001;

        if (!moved) {
          return current;
        }

        return {
          ...current,

          [tripId]: [
            ...previous,

            {
              latitude: location.latitude,

              longitude: location.longitude,

              recordedAtEpochMs: location.recordedAtEpochMs,
            },
          ].slice(-40),
        };
      });
    });

    socket.connect();

    return () => {
      for (const tripId of activeTripIds) {
        void unsubscribeFromTrip(socket, tripId).catch(() => undefined);
      }

      socket.removeAllListeners();

      socket.disconnect();
    };
  }, [tenantId, activeTripIds, guardianQuery.isLoading, guardianQuery.isError]);

  if (guardianQuery.isLoading) {
    return (
      <Paper
        elevation={0}
        sx={{
          py: 7,

          display: "grid",

          placeItems: "center",

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <CircularProgress size={30} />
      </Paper>
    );
  }

  if (guardianQuery.isError) {
    return <Alert severity="error">{errorMessage(guardianQuery.error)}</Alert>;
  }

  if (trackableChildren.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,

          textAlign: "center",

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <FamilyRestroomRounded
          sx={{
            fontSize: 42,

            color: "primary.main",
          }}
        />

        <Typography
          sx={{
            mt: 1.5,

            fontWeight: 800,
          }}
        >
          No linked children
        </Typography>

        <Typography
          sx={{
            mt: 0.5,

            color: "text.secondary",

            fontSize: 12.5,
          }}
        >
          Live parent tracking becomes available when this account is linked to
          an active student.
        </Typography>
      </Paper>
    );
  }

  if (activeTripIds.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,

          textAlign: "center",

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <DirectionsBusRounded
          sx={{
            fontSize: 42,

            color: "primary.main",
          }}
        />

        <Typography
          sx={{
            mt: 1.5,

            fontWeight: 800,
          }}
        >
          No active journey
        </Typography>

        <Typography
          sx={{
            mt: 0.5,

            color: "text.secondary",

            fontSize: 12.5,
          }}
        >
          Your linked children do not currently have a live trackable trip.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          mb: 3,

          display: "flex",

          justifyContent: "space-between",

          alignItems: {
            xs: "flex-start",

            sm: "center",
          },

          flexDirection: {
            xs: "column",

            sm: "row",
          },

          gap: 2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: 26,

              fontWeight: 850,

              letterSpacing: "-0.03em",
            }}
          >
            Live Tracking
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",

              fontSize: 13.5,
            }}
          >
            Track the current journey for your linked child.
          </Typography>
        </Box>

        <Chip
          icon={
            connectionStatus === "connected" ? (
              <WifiRounded />
            ) : (
              <WifiOffRounded />
            )
          }
          label={
            connectionStatus === "connected"
              ? "Live trip connected"
              : connectionStatus === "connecting"
                ? "Connecting"
                : connectionStatus === "denied"
                  ? "Access denied"
                  : "Disconnected"
          }
          color={
            connectionStatus === "connected"
              ? "success"
              : connectionStatus === "denied" || connectionStatus === "error"
                ? "error"
                : "default"
          }
          variant="outlined"
        />
      </Box>

      {connectionError ? (
        <Alert
          severity="error"
          sx={{
            mb: 2,
          }}
        >
          {connectionError}
        </Alert>
      ) : null}

      {effectiveSelectedTripId && selectedLocation ? (
        <Box
          sx={{
            mb: 1.5,

            display: "flex",

            justifyContent: "flex-end",
          }}
        >
          {/* Guardian Follow Bus camera control */}
          <Button
            size="small"
            variant={
              followTripId === effectiveSelectedTripId
                ? "contained"
                : "outlined"
            }
            startIcon={<CenterFocusStrongRounded />}
            onClick={() => {
              setFollowTripId((current) =>
                current === effectiveSelectedTripId
                  ? null
                  : effectiveSelectedTripId,
              );
            }}
          >
            {followTripId === effectiveSelectedTripId
              ? "Stop Following"
              : "Follow Bus"}
          </Button>
        </Box>
      ) : null}

      {allGuardianMapMarkers.length > 0 ? (
        <Box
          sx={{
            mb: 2.5,
          }}
        >
          <LiveTrackingMap
            markers={allGuardianMapMarkers}
            plannedRoute={selectedPlannedRoute}
            remainingRoute={selectedRemainingRoute}
            trails={guardianTrails}
            selectedMarkerKey={effectiveSelectedTripId}
            focusMarkerKey={selectedTripId}
            followMarkerKey={followTripId}
            onMarkerClick={(markerKey) => {
              if (activeTripIds.includes(markerKey)) {
                selectTrip(markerKey);
              }
            }}
            height={360}
          />
        </Box>
      ) : null}

      {activeTripIds.some((tripId) =>
        Boolean(locationsByTrip[tripId]?.nextStop),
      ) ? (
        <Box
          sx={{
            mb: 2.5,
          }}
        >
          <Typography
            sx={{
              mb: 1.25,

              fontWeight: 850,

              fontSize: 14,
            }}
          >
            Live journey progress
          </Typography>

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                md: "repeat(2, minmax(0, 1fr))",
              },

              gap: 1.5,
            }}
          >
            {activeTripIds.map((tripId) => {
              const location = locationsByTrip[tripId];

              const children = childrenByTrip.get(tripId) ?? [];

              if (!location?.nextStop) {
                return null;
              }

              return (
                <TrackingProgressPanel
                  key={tripId}
                  label={
                    children.length > 0 ? children.join(", ") : "School journey"
                  }
                  nextStop={location.nextStop}
                />
              );
            })}
          </Box>
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            md: "repeat(2, minmax(0, 1fr))",
          },

          gap: 2,
        }}
      >
        {activeTripIds.map((tripId) => {
          const location = locationsByTrip[tripId];

          const children = childrenByTrip.get(tripId) ?? [];

          return (
            <Paper
              key={tripId}
              elevation={0}
              role="button"
              tabIndex={0}
              onClick={() => {
                selectTrip(tripId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();

                  selectTrip(tripId);
                }
              }}
              sx={{
                p: 2.5,

                border: "1px solid",

                borderColor:
                  effectiveSelectedTripId === tripId
                    ? "primary.main"
                    : "divider",

                cursor: "pointer",

                transition: "border-color 120ms ease",
              }}
            >
              <Box
                sx={{
                  display: "flex",

                  alignItems: "center",

                  gap: 1.25,
                }}
              >
                <DirectionsBusRounded color="primary" />

                <Box>
                  <Typography
                    sx={{
                      fontWeight: 850,
                    }}
                  >
                    {children.join(", ")}
                  </Typography>

                  <Typography
                    sx={{
                      color: "text.secondary",

                      fontSize: 11.5,
                    }}
                  >
                    Active school journey
                  </Typography>
                </Box>
              </Box>

              {!location ? (
                <Box
                  sx={{
                    mt: 3,

                    py: 2,

                    textAlign: "center",
                  }}
                >
                  <GpsFixedRounded
                    sx={{
                      color: "text.secondary",
                    }}
                  />

                  <Typography
                    sx={{
                      mt: 1,

                      color: "text.secondary",

                      fontSize: 12.5,
                    }}
                  >
                    Waiting for the next GPS update…
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    mt: 2.5,

                    display: "grid",

                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 10.5,
                      }}
                    >
                      Latitude
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 750,
                      }}
                    >
                      {location.latitude.toFixed(6)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 10.5,
                      }}
                    >
                      Longitude
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 750,
                      }}
                    >
                      {location.longitude.toFixed(6)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 10.5,
                      }}
                    >
                      Speed
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 750,
                      }}
                    >
                      {location.speedKph === null
                        ? "—"
                        : `${Math.round(location.speedKph)} km/h`}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 10.5,
                      }}
                    >
                      Last update
                    </Typography>

                    <Typography
                      sx={{
                        fontWeight: 750,

                        fontSize: 12,
                      }}
                    >
                      {formatDateTime(location.recordedAt)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
