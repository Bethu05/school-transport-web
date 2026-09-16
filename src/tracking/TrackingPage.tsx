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
  GpsFixedRounded,
  SpeedRounded,
  WifiRounded,
  WifiOffRounded,
} from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { listVehicles, type Vehicle } from "../vehicles/vehicles.api";

import { GuardianTrackingPanel } from "./GuardianTrackingPanel";

import { LiveTrackingMap } from "./LiveTrackingMap";

import { TrackingProgressPanel } from "./TrackingProgressPanel";

import { getLatestTrackingLocations } from "./tracking-snapshot.api";

import {
  mergeVehicleLocation,
  mergeVehicleLocations,
  type VehicleLiveState,
} from "./tracking-state";

import { getRouteGeometry } from "./route-geometry.api";

import { sliceRouteBetweenPoints } from "./route-segment";

import {
  createTrackingSocket,
  type TrackingConnectionDenied,
  type TrackingConnectionReady,
  type TripStopEvent,
  type VehicleLocationUpdate,
} from "./tracking.realtime";

type ConnectionStatus =
  "connecting" | "connected" | "disconnected" | "denied" | "error";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Realtime tracking failed.";
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

type TrackingHealthStatus = "live" | "delayed" | "stale";

interface TrackingHealth {
  status: TrackingHealthStatus;

  label: string;

  ageSeconds: number;
}

/**
 * GPS health thresholds for the operational control room.
 *
 * live:
 *   packet received within 30 seconds
 *
 * delayed:
 *   packet is 31-120 seconds old
 *
 * stale:
 *   no packet for more than 2 minutes
 */
function trackingHealth(
  recordedAtEpochMs: number,

  nowEpochMs: number,
): TrackingHealth {
  const ageSeconds = Math.max(
    0,

    Math.floor((nowEpochMs - recordedAtEpochMs) / 1000),
  );

  if (ageSeconds <= 30) {
    return {
      status: "live",

      label: "Live",

      ageSeconds,
    };
  }

  if (ageSeconds <= 120) {
    return {
      status: "delayed",

      label: "Delayed",

      ageSeconds,
    };
  }

  return {
    status: "stale",

    label: "Stale",

    ageSeconds,
  };
}

function formatTrackingAge(ageSeconds: number): string {
  if (ageSeconds < 5) {
    return "just now";
  }

  if (ageSeconds < 60) {
    return `${ageSeconds} sec ago`;
  }

  if (ageSeconds < 3600) {
    const minutes = Math.floor(ageSeconds / 60);

    return `${minutes} min ago`;
  }

  const hours = Math.floor(ageSeconds / 3600);

  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function vehicleLabel(vehicle: Vehicle): string {
  if (vehicle.registrationNumber) {
    return vehicle.registrationNumber;
  }

  if (vehicle.fleetNumber) {
    return vehicle.fleetNumber;
  }

  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ");

  return makeModel || "Vehicle";
}

export function TrackingPage() {
  const { permissions, tenant } = useAuth();

  const tenantId = tenant?.tenantId;

  /**
   * First tracking checkpoint is the operational fleet view.
   *
   * We deliberately require fleet-read permission before
   * connecting this page to the tenant-wide live feed.
   *
   * Guardian tracking is implemented through explicit
   * authorised trip subscription in the next checkpoint.
   */
  const canReadFleet = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.VEHICLES_READ,
  );

  /**
   * Canonical planned-route geometry is protected by the
   * backend ROUTES_READ permission.
   *
   * The realtime vehicle map still works without it.
   */
  const canReadRoutes = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.ROUTES_READ,
  );

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [liveVehicles, setLiveVehicles] = useState<
    Record<string, VehicleLiveState>
  >({});

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );

  /**
   * Re-evaluate GPS freshness even when no new packet arrives.
   *
   * This lets a vehicle naturally move:
   *
   * Live -> Delayed -> Stale
   *
   * without requiring another realtime event.
   */
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(
      () => {
        setNowEpochMs(Date.now());
      },

      5_000,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const [followVehicleId, setFollowVehicleId] = useState<string | null>(null);

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", tenantId, "tracking-labels"],

    enabled: Boolean(tenantId && canReadFleet),

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listVehicles(tenantId, {
        page: 1,

        limit: 100,
      });
    },
  });

  const vehicleById = useMemo(
    () =>
      new Map(
        (vehiclesQuery.data?.items ?? []).map((vehicle) => [
          vehicle.id,
          vehicle,
        ]),
      ),
    [vehiclesQuery.data],
  );

  useEffect(() => {
    if (!tenantId || !canReadFleet) {
      return;
    }

    const activeTenantId = tenantId;

    let socket;

    try {
      socket = createTrackingSocket(activeTenantId);
    } catch (error) {
      const message = errorMessage(error);

      queueMicrotask(() => {
        setConnectionStatus("error");

        setConnectionError(message);
      });

      return;
    }

    let disposed = false;

    /**
     * HTTP snapshot closes the refresh/reload gap.
     *
     * Socket listeners are already registered before connect(),
     * so realtime packets may arrive while this request is in
     * flight. mergeVehicleLocations() compares timestamps and
     * therefore never lets the older snapshot win.
     */
    async function hydrateLatestLocations(): Promise<void> {
      try {
        const snapshot = await getLatestTrackingLocations(activeTenantId);

        if (disposed) {
          return;
        }

        setLiveVehicles((current) =>
          mergeVehicleLocations(current, snapshot.items),
        );
      } catch {
        /**
         * Snapshot availability must not disable realtime
         * tracking. The WebSocket remains authoritative.
         */
      }
    }

    socket.on("connection.ready", (ready: TrackingConnectionReady) => {
      if (ready.tenantId !== tenantId) {
        return;
      }

      setConnectionStatus("connected");

      setConnectionError(null);

      void hydrateLatestLocations();
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
      if (location.tenantId !== tenantId) {
        return;
      }

      setLiveVehicles((current) => mergeVehicleLocation(current, location));
    });

    function handleStopEvent(event: TripStopEvent): void {
      if (event.tenantId !== tenantId) {
        return;
      }

      setLiveVehicles((current) => {
        const existing = current[event.vehicleId];

        if (!existing) {
          return current;
        }

        return {
          ...current,

          [event.vehicleId]: {
            ...existing,

            lastStopEvent: event,
          },
        };
      });
    }

    socket.on("trip.stop.arrived", handleStopEvent);

    socket.on("trip.stop.departed", handleStopEvent);

    socket.connect();

    return () => {
      disposed = true;

      socket.off("connection.ready");

      socket.off("connection.denied");

      socket.off("connect_error");

      socket.off("disconnect");

      socket.off("vehicle.location.updated");

      socket.off("trip.stop.arrived", handleStopEvent);

      socket.off("trip.stop.departed", handleStopEvent);

      socket.disconnect();
    };
  }, [tenantId, canReadFleet]);

  const trackedVehicles = Object.values(liveVehicles)
    .filter((item) => vehicleById.has(item.location.vehicleId))
    .sort(
      (left, right) =>
        right.location.recordedAtEpochMs - left.location.recordedAtEpochMs,
    );

  const fleetTrackingHealth = trackedVehicles.reduce(
    (summary, item) => {
      const health = trackingHealth(
        item.location.recordedAtEpochMs,

        nowEpochMs,
      );

      summary[health.status] += 1;

      return summary;
    },

    {
      live: 0,

      delayed: 0,

      stale: 0,
    },
  );

  /**
   * If the operator has not explicitly selected a vehicle,
   * use the most recently updated tracked vehicle.
   *
   * This is derived state rather than an effect, avoiding
   * unnecessary React state synchronisation.
   */
  const selectedTrackedVehicle =
    trackedVehicles.find(
      (item) => item.location.vehicleId === selectedVehicleId,
    ) ??
    trackedVehicles[0] ??
    null;

  const selectedVehicle = selectedTrackedVehicle
    ? (vehicleById.get(selectedTrackedVehicle.location.vehicleId) ?? null)
    : null;

  const selectedVehicleHealth = selectedTrackedVehicle
    ? trackingHealth(
        selectedTrackedVehicle.location.recordedAtEpochMs,

        nowEpochMs,
      )
    : null;

  const effectiveSelectedVehicleId =
    selectedVehicleId ?? trackedVehicles[0]?.location.vehicleId ?? null;

  const selectedRouteId = selectedTrackedVehicle?.location.routeId ?? null;

  /**
   * Geometry changes rarely compared with GPS.
   *
   * It is therefore fetched independently instead of being
   * repeated inside every high-frequency realtime packet.
   */
  const routeGeometryQuery = useQuery({
    queryKey: ["route-geometry", tenantId, selectedRouteId],

    enabled: Boolean(tenantId && selectedRouteId && canReadRoutes),

    staleTime: 60_000,

    queryFn: async () => {
      if (!tenantId || !selectedRouteId) {
        throw new Error("No selected route");
      }

      return getRouteGeometry(tenantId, selectedRouteId);
    },
  });

  const canonicalPlannedRoute =
    routeGeometryQuery.data?.status === "ready" &&
    routeGeometryQuery.data.geometry
      ? {
          key: routeGeometryQuery.data.routeId,

          coordinates: routeGeometryQuery.data.geometry.coordinates,
        }
      : null;

  /**
   * Build the remaining journey highlight entirely from the
   * canonical route geometry.
   *
   * The live bus and next stop are projected onto the LineString
   * and only the road coordinates between those points are shown.
   */
  const remainingRouteCoordinates =
    canonicalPlannedRoute && selectedTrackedVehicle?.location.nextStop
      ? sliceRouteBetweenPoints(
          canonicalPlannedRoute.coordinates,
          {
            latitude: selectedTrackedVehicle.location.latitude,

            longitude: selectedTrackedVehicle.location.longitude,
          },
          {
            latitude: selectedTrackedVehicle.location.nextStop.latitude,

            longitude: selectedTrackedVehicle.location.nextStop.longitude,
          },
        )
      : null;

  const remainingRouteHighlight =
    remainingRouteCoordinates && selectedTrackedVehicle?.location.nextStop
      ? {
          key: `${selectedTrackedVehicle.location.vehicleId}:remaining:${selectedTrackedVehicle.location.nextStop.tripStopId}`,

          coordinates: remainingRouteCoordinates,
        }
      : null;

  const operationalTrails = trackedVehicles.map((item) => ({
    key: item.location.vehicleId,

    points: item.trail.map((point) => ({
      latitude: point.latitude,

      longitude: point.longitude,
    })),
  }));

  /**
   * Do NOT draw a straight bus -> next-stop connector here.
   *
   * A straight line visually implies crow-flies routing.
   * The operational map instead uses canonical route geometry
   * as the authoritative journey path.
   */

  const operationalMapMarkers = trackedVehicles.flatMap((item) => {
    const vehicle = vehicleById.get(item.location.vehicleId);

    if (!vehicle) {
      return [];
    }

    return [
      {
        key: vehicle.id,

        label: vehicleLabel(vehicle),

        subtitle: item.lastStopEvent
          ? `${
              item.lastStopEvent.eventType === "trip.stop.arrived"
                ? "Arrived at"
                : "Departed"
            } ${item.lastStopEvent.stopName}`
          : "Live vehicle",

        latitude: item.location.latitude,

        longitude: item.location.longitude,

        speedKph: item.location.speedKph,

        heading: item.location.heading,

        accuracyMeters: item.location.accuracyMeters,
      },
    ];
  });

  const operationalStopMapMarkers = trackedVehicles.flatMap((item) => {
    const nextStop = item.location.nextStop;

    const vehicle = vehicleById.get(item.location.vehicleId);

    if (!nextStop || !vehicle) {
      return [];
    }

    return [
      {
        key: `${vehicle.id}:next-stop:${nextStop.tripStopId}`,

        kind: "stop" as const,

        label: nextStop.stopName,

        subtitle: `Next stop for ${vehicleLabel(vehicle)}`,

        latitude: nextStop.latitude,

        longitude: nextStop.longitude,
      },
    ];
  });

  const allOperationalMapMarkers = [
    ...operationalMapMarkers,
    ...operationalStopMapMarkers,
  ];

  if (!canReadFleet) {
    if (!tenantId) {
      return <Alert severity="error">No active tenant.</Alert>;
    }

    return <GuardianTrackingPanel tenantId={tenantId} />;
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
            Realtime GPS positions from the school transport fleet.
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
              ? "Realtime connected"
              : connectionStatus === "connecting"
                ? "Connecting"
                : connectionStatus === "denied"
                  ? "Access denied"
                  : "Disconnected"
          }
          color={
            connectionStatus === "connected"
              ? "success"
              : connectionStatus === "error" || connectionStatus === "denied"
                ? "error"
                : "default"
          }
          variant="outlined"
        />
      </Box>

      {vehiclesQuery.isLoading ? (
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
      ) : null}

      {vehiclesQuery.isError ? (
        <Alert
          severity="error"
          sx={{
            mb: 2,
          }}
        >
          {errorMessage(vehiclesQuery.error)}
        </Alert>
      ) : null}

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

      {!vehiclesQuery.isLoading && !vehiclesQuery.isError ? (
        <Paper
          elevation={0}
          sx={{
            mb: 2.5,

            p: 2,

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",

              alignItems: "center",

              justifyContent: "space-between",

              flexWrap: "wrap",

              gap: 1.5,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontWeight: 850,

                  fontSize: 14,
                }}
              >
                Fleet signal
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,

                  color: "text.secondary",

                  fontSize: 11.5,
                }}
              >
                GPS freshness across vehicles currently reporting realtime data.
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",

                alignItems: "center",

                gap: 1,

                flexWrap: "wrap",
              }}
            >
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`Live ${fleetTrackingHealth.live}`}
              />

              <Chip
                size="small"
                color="warning"
                variant="outlined"
                label={`Delayed ${fleetTrackingHealth.delayed}`}
              />

              <Chip
                size="small"
                color="error"
                variant="outlined"
                label={`Stale ${fleetTrackingHealth.stale}`}
              />

              <Chip
                size="small"
                variant="outlined"
                label={`Tracking ${trackedVehicles.length}/${
                  vehiclesQuery.data?.items.length ?? 0
                }`}
              />
            </Box>
          </Box>
        </Paper>
      ) : null}

      {selectedTrackedVehicle ? (
        <Box
          sx={{
            mb: 1.5,

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            gap: 1.5,

            flexWrap: "wrap",
          }}
        >
          <Box
            sx={{
              display: "flex",

              alignItems: "center",

              gap: 1,
            }}
          >
            <DirectionsBusRounded color="primary" />

            <Typography
              sx={{
                fontWeight: 850,

                fontSize: 13,
              }}
            >
              {vehicleLabel(
                vehicleById.get(selectedTrackedVehicle.location.vehicleId)!,
              )}
            </Typography>

            <Chip size="small" label="Selected" variant="outlined" />

            {selectedRouteId && canReadRoutes ? (
              <Chip
                size="small"
                variant="outlined"
                color={
                  routeGeometryQuery.data?.status === "ready"
                    ? "success"
                    : routeGeometryQuery.data?.status === "failed"
                      ? "error"
                      : "default"
                }
                label={
                  routeGeometryQuery.isLoading
                    ? "Loading road route"
                    : routeGeometryQuery.data?.status === "ready"
                      ? "Road route ready"
                      : routeGeometryQuery.data?.status === "building"
                        ? "Road route rebuilding"
                        : routeGeometryQuery.data?.status === "pending"
                          ? "Road route pending"
                          : routeGeometryQuery.data?.status === "failed"
                            ? "Road route unavailable"
                            : "Road route unavailable"
                }
              />
            ) : null}
          </Box>

          <Button
            size="small"
            variant={
              followVehicleId === effectiveSelectedVehicleId
                ? "contained"
                : "outlined"
            }
            startIcon={<CenterFocusStrongRounded />}
            onClick={() => {
              setFollowVehicleId((current) =>
                current === effectiveSelectedVehicleId
                  ? null
                  : effectiveSelectedVehicleId,
              );
            }}
          >
            {followVehicleId === effectiveSelectedVehicleId
              ? "Stop Following"
              : "Follow Bus"}
          </Button>
        </Box>
      ) : null}

      {allOperationalMapMarkers.length > 0 ? (
        <Box
          sx={{
            mb: 2.5,
          }}
        >
          <LiveTrackingMap
            markers={allOperationalMapMarkers}

            plannedRoute={canonicalPlannedRoute}

            remainingRoute={remainingRouteHighlight}

            trails={operationalTrails}

            selectedMarkerKey={effectiveSelectedVehicleId}

            followMarkerKey={followVehicleId}

            onMarkerClick={(markerKey) => {
              if (vehicleById.has(markerKey)) {
                setSelectedVehicleId(markerKey);
              }
            }}
          />
        </Box>
      ) : null}

      {selectedTrackedVehicle && selectedVehicle && selectedVehicleHealth ? (
        <Paper
          elevation={0}
          sx={{
            mb: 2.5,

            p: 2.5,

            border: "1px solid",

            borderColor:
              selectedVehicleHealth.status === "stale"
                ? "error.main"
                : selectedVehicleHealth.status === "delayed"
                  ? "warning.main"
                  : "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",

              justifyContent: "space-between",

              alignItems: "flex-start",

              gap: 2,

              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography
                sx={{
                  color: "text.secondary",

                  fontSize: 10.5,

                  textTransform: "uppercase",

                  letterSpacing: "0.07em",
                }}
              >
                Selected vehicle
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,

                  fontWeight: 900,

                  fontSize: 20,
                }}
              >
                {vehicleLabel(selectedVehicle)}
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,

                  color: "text.secondary",

                  fontSize: 11.5,
                }}
              >
                Last seen {formatTrackingAge(selectedVehicleHealth.ageSeconds)}
              </Typography>
            </Box>

            <Chip
              label={selectedVehicleHealth.label}
              color={
                selectedVehicleHealth.status === "live"
                  ? "success"
                  : selectedVehicleHealth.status === "delayed"
                    ? "warning"
                    : "error"
              }
            />
          </Box>

          <Box
            sx={{
              mt: 2,

              display: "grid",

              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",

                md: "repeat(4, minmax(0, 1fr))",
              },

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
                Speed
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,

                  fontWeight: 800,

                  fontSize: 13,
                }}
              >
                {selectedTrackedVehicle.location.speedKph === null
                  ? "—"
                  : `${Math.round(
                      selectedTrackedVehicle.location.speedKph,
                    )} km/h`}
              </Typography>
            </Box>

            <Box>
              <Typography
                sx={{
                  color: "text.secondary",

                  fontSize: 10.5,
                }}
              >
                Heading
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,

                  fontWeight: 800,

                  fontSize: 13,
                }}
              >
                {selectedTrackedVehicle.location.heading === null
                  ? "—"
                  : `${Math.round(selectedTrackedVehicle.location.heading)}°`}
              </Typography>
            </Box>

            <Box>
              <Typography
                sx={{
                  color: "text.secondary",

                  fontSize: 10.5,
                }}
              >
                GPS accuracy
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,

                  fontWeight: 800,

                  fontSize: 13,
                }}
              >
                {selectedTrackedVehicle.location.accuracyMeters === null
                  ? "—"
                  : `±${Math.round(
                      selectedTrackedVehicle.location.accuracyMeters,
                    )} m`}
              </Typography>
            </Box>

            <Box>
              <Typography
                sx={{
                  color: "text.secondary",

                  fontSize: 10.5,
                }}
              >
                Journey
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,

                  fontWeight: 800,

                  fontSize: 13,
                }}
              >
                {selectedTrackedVehicle.location.tripId
                  ? "Active trip"
                  : "No active trip"}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 2,
            }}
          >
            <TrackingProgressPanel
              label={vehicleLabel(selectedVehicle)}
              nextStop={selectedTrackedVehicle.location.nextStop}
            />
          </Box>
        </Paper>
      ) : null}

      {trackedVehicles.some((item) => Boolean(item.location.nextStop)) ? (
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
            Next stops and ETA
          </Typography>

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                md: "repeat(2, minmax(0, 1fr))",

                xl: "repeat(3, minmax(0, 1fr))",
              },

              gap: 1.5,
            }}
          >
            {trackedVehicles.map((item) => {
              const vehicle = vehicleById.get(item.location.vehicleId);

              if (!vehicle || !item.location.nextStop) {
                return null;
              }

              return (
                <TrackingProgressPanel
                  key={vehicle.id}
                  label={vehicleLabel(vehicle)}
                  nextStop={item.location.nextStop}
                />
              );
            })}
          </Box>
        </Box>
      ) : null}

      {!vehiclesQuery.isLoading &&
      !vehiclesQuery.isError &&
      connectionStatus === "connected" &&
      trackedVehicles.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,

            textAlign: "center",

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <GpsFixedRounded
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
            Waiting for live GPS data
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",

              fontSize: 12.5,
            }}
          >
            The realtime gateway is connected. Vehicles will appear here as
            location events arrive.
          </Typography>
        </Paper>
      ) : null}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            md: "repeat(2, minmax(0, 1fr))",

            xl: "repeat(3, minmax(0, 1fr))",
          },

          gap: 2,
        }}
      >
        {trackedVehicles.map((item) => {
          const vehicle = vehicleById.get(item.location.vehicleId);

          if (!vehicle) {
            return null;
          }

          return (
            <Paper
              key={vehicle.id}
              elevation={0}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedVehicleId(vehicle.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();

                  setSelectedVehicleId(vehicle.id);
                }
              }}
              sx={{
                p: 2.5,

                border: "1px solid",

                borderColor:
                  selectedTrackedVehicle?.location.vehicleId === vehicle.id
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

                      fontSize: 16,
                    }}
                  >
                    {vehicleLabel(vehicle)}
                  </Typography>

                  <Typography
                    sx={{
                      color: "text.secondary",

                      fontSize: 11.5,
                    }}
                  >
                    Live vehicle
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 2.25,

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

                      textTransform: "uppercase",

                      letterSpacing: "0.06em",
                    }}
                  >
                    Latitude
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,

                      fontWeight: 750,

                      fontSize: 13,
                    }}
                  >
                    {item.location.latitude.toFixed(6)}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",

                      fontSize: 10.5,

                      textTransform: "uppercase",

                      letterSpacing: "0.06em",
                    }}
                  >
                    Longitude
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,

                      fontWeight: 750,

                      fontSize: 13,
                    }}
                  >
                    {item.location.longitude.toFixed(6)}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",

                      fontSize: 10.5,

                      textTransform: "uppercase",

                      letterSpacing: "0.06em",
                    }}
                  >
                    Speed
                  </Typography>

                  <Box
                    sx={{
                      mt: 0.25,

                      display: "flex",

                      alignItems: "center",

                      gap: 0.5,
                    }}
                  >
                    <SpeedRounded
                      sx={{
                        fontSize: 15,
                      }}
                    />

                    <Typography
                      sx={{
                        fontWeight: 750,

                        fontSize: 13,
                      }}
                    >
                      {item.location.speedKph === null
                        ? "—"
                        : `${Math.round(item.location.speedKph)} km/h`}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",

                      fontSize: 10.5,

                      textTransform: "uppercase",

                      letterSpacing: "0.06em",
                    }}
                  >
                    Heading
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,

                      fontWeight: 750,

                      fontSize: 13,
                    }}
                  >
                    {item.location.heading === null
                      ? "—"
                      : `${Math.round(item.location.heading)}°`}
                  </Typography>
                </Box>
              </Box>

              {item.lastStopEvent ? (
                <Alert
                  severity="info"
                  sx={{
                    mt: 2,
                  }}
                >
                  {item.lastStopEvent.eventType === "trip.stop.arrived"
                    ? "Arrived at"
                    : "Departed"}{" "}
                  {item.lastStopEvent.stopName}
                </Alert>
              ) : null}

              <Box
                sx={{
                  mt: 2,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  gap: 1,
                }}
              >
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    trackingHealth(
                      item.location.recordedAtEpochMs,

                      nowEpochMs,
                    ).label
                  }
                  color={
                    trackingHealth(
                      item.location.recordedAtEpochMs,

                      nowEpochMs,
                    ).status === "live"
                      ? "success"
                      : trackingHealth(
                            item.location.recordedAtEpochMs,

                            nowEpochMs,
                          ).status === "delayed"
                        ? "warning"
                        : "error"
                  }
                />

                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 10.5,
                  }}
                >
                  Last seen{" "}
                  {formatTrackingAge(
                    trackingHealth(
                      item.location.recordedAtEpochMs,

                      nowEpochMs,
                    ).ageSeconds,
                  )}
                </Typography>
              </Box>

              <Box
                sx={{
                  mt: 2,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  gap: 1,
                }}
              >
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    trackingHealth(
                      item.location.recordedAtEpochMs,

                      nowEpochMs,
                    ).label
                  }
                  color={
                    trackingHealth(
                      item.location.recordedAtEpochMs,

                      nowEpochMs,
                    ).status === "live"
                      ? "success"
                      : trackingHealth(
                            item.location.recordedAtEpochMs,

                            nowEpochMs,
                          ).status === "delayed"
                        ? "warning"
                        : "error"
                  }
                />

                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 10.5,
                  }}
                >
                  Last seen{" "}
                  {formatTrackingAge(
                    trackingHealth(
                      item.location.recordedAtEpochMs,

                      nowEpochMs,
                    ).ageSeconds,
                  )}
                </Typography>
              </Box>

              <Typography
                sx={{
                  mt: 2,

                  color: "text.secondary",

                  fontSize: 10.5,
                }}
              >
                Last update: {formatDateTime(item.location.recordedAt)}
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
