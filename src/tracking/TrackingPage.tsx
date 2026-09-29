import { useEffect, useMemo, useRef, useState } from "react";

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
} from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { listTripsPage } from "../trips/trips.api";

import { listVehicles, type Vehicle } from "../vehicles/vehicles.api";

import { GuardianTrackingPanel } from "./GuardianTrackingPanel";

import { LiveTrackingMap } from "./LiveTrackingMap";

import {
  getLatestTrackingLocations,
  getTrackingTripMap,
} from "./tracking-snapshot.api";

import {
  mergeVehicleLocation,
  mergeVehicleLocations,
  type VehicleLiveState,
} from "./tracking-state";

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

function formatCompactEta(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return "ETA —";
  }

  if (seconds < 60) {
    return "ETA <1 min";
  }

  return `ETA ${Math.ceil(seconds / 60)} min`;
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
  const { permissions, tenant, features } = useAuth();

  const tenantId = tenant?.tenantId;

  /**
   * Commercial entitlement for the premium visual fleet map.
   *
   * Core tracking intelligence continues independently:
   *
   * - GPS ingestion
   * - trip progress
   * - ETA / next stop
   * - operational safety
   * - active-trip state
   *
   * When this feature is disabled LiveTrackingMap is not mounted,
   * which means Mapbox itself is not initialised.
   */
  const liveFleetMapEnabled = features.some(
    (feature) => feature.key === "control_room.live_map" && feature.enabled,
  );

  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const [workspaceHeight, setWorkspaceHeight] = useState(720);

  /**
   * Fit the Control Room into the exact browser space left by
   * the surrounding AppShell rather than assuming a header size.
   */
  useEffect(() => {
    function updateWorkspaceHeight(): void {
      const top = workspaceRef.current?.getBoundingClientRect().top ?? 0;

      setWorkspaceHeight(
        Math.max(420, window.innerHeight - Math.max(0, top) - 12),
      );
    }

    updateWorkspaceHeight();

    const frame = window.requestAnimationFrame(updateWorkspaceHeight);

    window.addEventListener("resize", updateWorkspaceHeight);

    return () => {
      window.cancelAnimationFrame(frame);

      window.removeEventListener("resize", updateWorkspaceHeight);
    };
  }, []);

  /**
   * Tenant-wide operational Control Room permission.
   *
   * This is deliberately separate from ordinary vehicle-record
   * read access.
   */
  const canUseControlRoom = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.CONTROL_ROOM_READ,
  );

  /**
   * Guardian access remains relationship-scoped.
   *
   * Backend Guardian authorization still determines which
   * Student and active trip the user may actually access.
   */
  const canUseGuardianTracking = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_READ_OWN_ACTIVE_TRIP,
  );

  const canReadFleet = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.VEHICLES_READ,
  );

  const canReadTrips = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.TRIPS_READ,
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

  /**
   * Follow Bus belongs to the premium Live Fleet Map experience.
   * Release active camera-follow state if the entitlement disappears.
   */
  useEffect(() => {
    if (!liveFleetMapEnabled) {
      setFollowVehicleId(null);
    }
  }, [liveFleetMapEnabled]);

  /**
   * Select a vehicle for the operational detail/map view.
   *
   * If Follow Bus is already enabled, selecting another bus
   * transfers follow mode to the new selection instead of
   * leaving the camera attached to the previous vehicle.
   */
  function selectTrackedVehicle(vehicleId: string): void {
    setSelectedVehicleId(vehicleId);

    setFollowVehicleId((current) => (current === null ? null : vehicleId));
  }

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", tenantId, "tracking-labels"],

    enabled: Boolean(tenantId && canUseControlRoom && canReadFleet),

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

  /**
   * Trip state is intentionally low-frequency operational data.
   *
   * GPS remains WebSocket-driven. This poll only discovers when
   * dated trips enter or leave in_progress while the Control Room
   * is already open.
   */
  const activeTripsQuery = useQuery({
    queryKey: ["trips", tenantId, "tracking-active"],

    enabled: Boolean(tenantId && canUseControlRoom && canReadTrips),

    refetchInterval: 5_000,

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listTripsPage(tenantId, {
        page: 1,
        limit: 100,
        view: "current",
      });
    },
  });

  const activeTrips = (activeTripsQuery.data?.items ?? []).filter(
    (trip) => trip.status === "in_progress",
  );

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
    if (!tenantId || !canUseControlRoom) {
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

      if (liveFleetMapEnabled) {
        void hydrateLatestLocations();
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
  }, [tenantId, canUseControlRoom, liveFleetMapEnabled]);

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
   * Prefer a currently in-progress dated trip as the default
   * operational context.
   *
   * This allows the route, stops and assigned vehicle to become
   * visible before the first GPS packet for that trip arrives.
   */
  const defaultOperationalTrip =
    activeTrips.find((trip) => trip.vehicleId !== null) ??
    activeTrips[0] ??
    null;

  const effectiveSelectedVehicleId =
    selectedVehicleId ??
    defaultOperationalTrip?.vehicleId ??
    trackedVehicles[0]?.location.vehicleId ??
    null;

  const selectedOperationalTripByVehicle = effectiveSelectedVehicleId
    ? activeTrips.find((trip) => trip.vehicleId === effectiveSelectedVehicleId)
    : undefined;

  const selectedOperationalTrip =
    selectedOperationalTripByVehicle ??
    (!selectedVehicleId ? defaultOperationalTrip : null);

  const selectedTrackedVehicleCandidate = effectiveSelectedVehicleId
    ? (trackedVehicles.find(
        (item) => item.location.vehicleId === effectiveSelectedVehicleId,
      ) ?? null)
    : null;

  /**
   * A historical latest-location snapshot for the same vehicle
   * must not pretend to be the first GPS signal for a new trip.
   *
   * When an operational trip exists, only GPS explicitly carrying
   * that dated trip id is considered live context for the trip.
   */
  const selectedTrackedVehicle =
    selectedOperationalTrip && selectedTrackedVehicleCandidate
      ? selectedTrackedVehicleCandidate.location.tripId ===
        selectedOperationalTrip.id
        ? selectedTrackedVehicleCandidate
        : null
      : selectedTrackedVehicleCandidate;

  const selectedVehicle = effectiveSelectedVehicleId
    ? (vehicleById.get(effectiveSelectedVehicleId) ?? null)
    : null;

  const selectedVehicleHealth = selectedTrackedVehicle
    ? trackingHealth(
        selectedTrackedVehicle.location.recordedAtEpochMs,

        nowEpochMs,
      )
    : null;

  /**
   * Keep historical fleet snapshots available for signal-health
   * reporting, but never plot an old trip position as though it
   * belongs to a newly active dated trip using the same vehicle.
   */
  const operationalTrackedVehicles = trackedVehicles.filter((item) => {
    const activeTripForVehicle = activeTrips.find(
      (trip) => trip.vehicleId === item.location.vehicleId,
    );

    if (!canReadTrips || activeTripsQuery.isError) {
      return true;
    }

    return (
      activeTripForVehicle !== undefined &&
      item.location.tripId === activeTripForVehicle.id
    );
  });

  /**
   * Operational mapping is Trip-scoped.
   *
   * Route templates are planning data. Once scheduled, the
   * frozen Trip road geometry and road-anchored stop positions
   * remain authoritative for the live journey.
   */
  const tripMapQuery = useQuery({
    queryKey: ["tracking-trip-map", tenantId, selectedOperationalTrip?.id],

    enabled: Boolean(
      tenantId &&
      selectedOperationalTrip?.id &&
      canUseControlRoom &&
      liveFleetMapEnabled,
    ),

    staleTime: 60_000,

    queryFn: async () => {
      if (!tenantId || !selectedOperationalTrip?.id) {
        throw new Error("No selected operational trip");
      }

      return getTrackingTripMap(tenantId, selectedOperationalTrip.id);
    },
  });

  const canonicalPlannedRoute = tripMapQuery.data?.geometry
    ? {
        key: tripMapQuery.data.tripId,

        coordinates: tripMapQuery.data.geometry.coordinates,
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

  const operationalTrails = operationalTrackedVehicles.map((item) => ({
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

  const operationalMapMarkers = operationalTrackedVehicles.flatMap((item) => {
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

  const selectedRouteStops = tripMapQuery.data?.stops ?? [];

  const selectedNextStopId =
    selectedTrackedVehicle?.location.nextStop?.stopId ?? null;

  const selectedRouteStopIds = new Set(
    selectedRouteStops.map((routeStop) => routeStop.stopId),
  );

  const selectedNextStopOrder =
    selectedNextStopId === null
      ? null
      : (selectedRouteStops.find(
          (routeStop) => routeStop.stopId === selectedNextStopId,
        )?.stopOrder ?? null);

  const selectedRouteStopMapMarkers = selectedRouteStops.map((routeStop) => {
    const isNextStop = routeStop.stopId === selectedNextStopId;

    const emphasis = isNextStop
      ? ("next-stop" as const)
      : selectedNextStopOrder !== null &&
          routeStop.stopOrder < selectedNextStopOrder
        ? ("completed-stop" as const)
        : ("upcoming-stop" as const);

    return {
      key: `selected-route-stop:${routeStop.id}`,

      kind: "stop" as const,

      emphasis,

      label: `${routeStop.stopOrder}. ${routeStop.stopName}`,

      subtitle: isNextStop
        ? "Next stop on selected route"
        : emphasis === "completed-stop"
          ? `Completed stop ${routeStop.stopOrder}`
          : `Upcoming stop ${routeStop.stopOrder}`,

      latitude: routeStop.latitude,

      longitude: routeStop.longitude,
    };
  });

  const operationalStopMapMarkers = operationalTrackedVehicles.flatMap(
    (item) => {
      const nextStop = item.location.nextStop;

      const vehicle = vehicleById.get(item.location.vehicleId);

      if (!nextStop || !vehicle) {
        return [];
      }

      if (
        item.location.vehicleId === effectiveSelectedVehicleId &&
        selectedRouteStopIds.has(nextStop.stopId)
      ) {
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
    },
  );

  const allOperationalMapMarkers = [
    ...operationalMapMarkers,
    ...selectedRouteStopMapMarkers,
    ...operationalStopMapMarkers,
  ];

  const activeTripSummaries = activeTrips.map((trip) => {
    const tracked =
      trip.vehicleId === null
        ? null
        : (operationalTrackedVehicles.find(
            (item) => item.location.vehicleId === trip.vehicleId,
          ) ?? null);

    const health = tracked
      ? trackingHealth(tracked.location.recordedAtEpochMs, nowEpochMs)
      : null;

    return {
      trip,
      tracked,
      health,
    };
  });

  const activeFleetSignal = activeTripSummaries.reduce(
    (summary, item) => {
      if (!item.health) {
        summary.awaiting += 1;

        return summary;
      }

      summary[item.health.status] += 1;

      return summary;
    },
    {
      live: 0,
      delayed: 0,
      stale: 0,
      awaiting: 0,
    },
  );

  const fleetSignalSummary =
    canReadTrips && !activeTripsQuery.isError
      ? activeFleetSignal
      : {
          ...fleetTrackingHealth,
          awaiting: 0,
        };

  const selectedNextStop = selectedTrackedVehicle?.location.nextStop ?? null;

  const selectedBusLabel =
    selectedOperationalTrip?.vehicleRegistrationNumber ??
    (selectedVehicle ? vehicleLabel(selectedVehicle) : "No bus selected");

  const selectedRouteLabel =
    selectedOperationalTrip?.routeName ?? "Fleet overview";

  const selectedSignalLabel = selectedVehicleHealth
    ? selectedVehicleHealth.label
    : selectedOperationalTrip
      ? "Awaiting GPS"
      : "No live trip";

  if (!tenantId) {
    return <Alert severity="error">No active tenant.</Alert>;
  }

  if (!canUseControlRoom) {
    if (canUseGuardianTracking) {
      return <GuardianTrackingPanel tenantId={tenantId} />;
    }

    return (
      <Alert severity="warning">
        You do not have permission to access Live Tracking.
      </Alert>
    );
  }

  return (
    <Box
      ref={workspaceRef}
      data-control-room-workspace
      sx={{
        height: `${workspaceHeight}px`,
        minHeight: 420,
        display: "grid",
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          lg: "258px minmax(0, 1fr)",
        },
        gridTemplateRows: {
          xs: "minmax(0, 1fr)",
          lg: "56px minmax(0, 1fr)",
        },
        overflow: "hidden",
        position: "relative",
        border: "1px solid",
        borderColor: "rgba(15, 23, 42, 0.08)",
        borderRadius: {
          xs: 0,
          lg: 1,
        },
        boxShadow: {
          xs: "none",
          lg: "0 18px 46px rgba(15, 23, 42, 0.13), 0 3px 10px rgba(15, 23, 42, 0.06)",
        },
        bgcolor: "background.paper",
      }}
    >
      {/* ======================================================
          DESKTOP FLEET SIDEBAR
          ====================================================== */}

      <Box
        data-control-room-sidebar
        sx={{
          gridColumn: 1,
          gridRow: "1 / span 2",
          minHeight: 0,
          display: {
            xs: "none",
            lg: "flex",
          },
          flexDirection: "column",
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: 1.75,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                Active trips
              </Typography>

              <Typography
                sx={{
                  mt: 0.15,
                  color: "text.secondary",
                  fontSize: 10.5,
                }}
              >
                {activeTrips.length} currently running
              </Typography>
            </Box>

            <Box
              aria-label={
                connectionStatus === "connected"
                  ? "Realtime connected"
                  : "Realtime disconnected"
              }
              sx={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                bgcolor:
                  connectionStatus === "connected"
                    ? "success.main"
                    : connectionStatus === "connecting"
                      ? "warning.main"
                      : "error.main",
                boxShadow:
                  connectionStatus === "connected"
                    ? "0 0 0 4px rgba(46,125,50,0.10)"
                    : "none",
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            p: 1,
          }}
        >
          {vehiclesQuery.isLoading || activeTripsQuery.isLoading ? (
            <Box
              sx={{
                py: 5,
                display: "grid",
                placeItems: "center",
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : null}

          {!activeTripsQuery.isLoading &&
          canReadTrips &&
          activeTripSummaries.length === 0 ? (
            <Box
              sx={{
                px: 1.5,
                py: 4,
                textAlign: "center",
              }}
            >
              <DirectionsBusRounded
                sx={{
                  color: "text.disabled",
                  fontSize: 30,
                }}
              />

              <Typography
                sx={{
                  mt: 1,
                  fontWeight: 800,
                  fontSize: 12,
                }}
              >
                No active trips
              </Typography>

              <Typography
                sx={{
                  mt: 0.35,
                  color: "text.secondary",
                  fontSize: 10.5,
                }}
              >
                Running trips appear here automatically.
              </Typography>
            </Box>
          ) : null}

          {activeTripSummaries.map(({ trip, tracked, health }) => {
            const selected =
              trip.vehicleId !== null &&
              trip.vehicleId === effectiveSelectedVehicleId;

            const nextStop = tracked?.location.nextStop ?? null;

            return (
              <Paper
                key={trip.id}
                elevation={0}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                onClick={() => {
                  if (trip.vehicleId) {
                    selectTrackedVehicle(trip.vehicleId);
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    trip.vehicleId &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();

                    selectTrackedVehicle(trip.vehicleId);
                  }
                }}
                sx={{
                  mb: 0.75,
                  px: 1.25,
                  py: 1.15,
                  cursor: trip.vehicleId ? "pointer" : "default",
                  border: "1px solid",
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "action.selected" : "transparent",
                  transition:
                    "background-color 120ms ease, border-color 120ms ease",
                  "&:hover": trip.vehicleId
                    ? {
                        bgcolor: selected ? "action.selected" : "action.hover",
                      }
                    : undefined,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: 12.5,
                        lineHeight: 1.25,
                      }}
                    >
                      {trip.vehicleRegistrationNumber ?? "Vehicle pending"}
                    </Typography>

                    <Typography
                      noWrap
                      sx={{
                        mt: 0.25,
                        color: "text.secondary",
                        fontSize: 10.5,
                      }}
                    >
                      {trip.routeCode
                        ? `${trip.routeCode} · ${trip.routeName}`
                        : trip.routeName}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    variant={health?.status === "live" ? "filled" : "outlined"}
                    color={
                      health?.status === "live"
                        ? "success"
                        : health?.status === "delayed"
                          ? "warning"
                          : health?.status === "stale"
                            ? "error"
                            : "default"
                    }
                    label={health?.label ?? "Awaiting GPS"}
                    sx={{
                      height: 22,
                      flexShrink: 0,
                      "& .MuiChip-label": {
                        px: 0.75,
                        fontSize: 9.5,
                        fontWeight: 800,
                      },
                    }}
                  />
                </Box>

                {trip.driverName ? (
                  <Typography
                    noWrap
                    sx={{
                      mt: 0.65,
                      color: "text.secondary",
                      fontSize: 10.5,
                    }}
                  >
                    {trip.driverName}
                  </Typography>
                ) : null}

                {nextStop ? (
                  <Box
                    sx={{
                      mt: 0.85,
                      pt: 0.75,
                      borderTop: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      noWrap
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 750,
                      }}
                    >
                      Next · {nextStop.stopName}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.2,
                        color: "text.secondary",
                        fontSize: 9.5,
                      }}
                    >
                      {formatCompactEta(nextStop.etaSeconds)}
                      {tracked?.location.speedKph !== null &&
                      tracked?.location.speedKph !== undefined
                        ? ` · ${Math.round(tracked.location.speedKph)} km/h`
                        : ""}
                    </Typography>
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      mt: 0.75,
                      color: "text.secondary",
                      fontSize: 9.5,
                    }}
                  >
                    {health
                      ? `Last seen ${formatTrackingAge(health.ageSeconds)}`
                      : "Awaiting first GPS signal"}
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Box>
      </Box>

      {/* ======================================================
          DESKTOP TOP OPERATIONS BAR
          ====================================================== */}

      <Box
        data-control-room-topbar
        sx={{
          gridColumn: 2,
          gridRow: 1,
          minWidth: 0,
          display: {
            xs: "none",
            lg: "flex",
          },
          alignItems: "center",
          gap: 1.25,
          px: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography
          sx={{
            flexShrink: 0,
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          Fleet signal
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.65,
            flexShrink: 0,
          }}
        >
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={`Live ${fleetSignalSummary.live}`}
          />

          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={`Delayed ${fleetSignalSummary.delayed}`}
          />

          <Chip
            size="small"
            color="error"
            variant="outlined"
            label={`Stale ${fleetSignalSummary.stale}`}
          />

          <Chip
            size="small"
            variant="outlined"
            label={`Awaiting ${fleetSignalSummary.awaiting}`}
          />
        </Box>

        <Box
          sx={{
            width: 1,
            alignSelf: "stretch",
            bgcolor: "divider",
            mx: 0.25,
          }}
        />

        <Box
          aria-label="Selected vehicle"
          sx={{
            minWidth: 0,
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <DirectionsBusRounded
            sx={{
              flexShrink: 0,
              color: "primary.main",
              fontSize: 20,
            }}
          />

          <Box
            sx={{
              minWidth: 0,
            }}
          >
            <Typography
              noWrap
              sx={{
                fontSize: 12.5,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              {selectedBusLabel}
            </Typography>

            <Typography
              noWrap
              sx={{
                mt: 0.1,
                color: "text.secondary",
                fontSize: 10,
              }}
            >
              {selectedRouteLabel}
              {selectedNextStop
                ? ` · Next ${selectedNextStop.stopName} · ${formatCompactEta(
                    selectedNextStop.etaSeconds,
                  )}`
                : ""}
            </Typography>
          </Box>
        </Box>

        {selectedTrackedVehicle?.location.speedKph !== null &&
        selectedTrackedVehicle?.location.speedKph !== undefined ? (
          <Typography
            sx={{
              flexShrink: 0,
              fontSize: 11.5,
              fontWeight: 850,
            }}
          >
            {Math.round(selectedTrackedVehicle.location.speedKph)} km/h
          </Typography>
        ) : null}

        <Chip
          size="small"
          color={
            selectedVehicleHealth?.status === "live"
              ? "success"
              : selectedVehicleHealth?.status === "delayed"
                ? "warning"
                : selectedVehicleHealth?.status === "stale"
                  ? "error"
                  : "default"
          }
          variant="outlined"
          label={selectedSignalLabel}
        />

        {liveFleetMapEnabled ? (
          <Button
            data-control-room-follow-bus
            size="small"
            variant={
              followVehicleId === effectiveSelectedVehicleId
                ? "contained"
                : "outlined"
            }
            startIcon={<CenterFocusStrongRounded />}
            disabled={
              !effectiveSelectedVehicleId || selectedTrackedVehicle === null
            }
            onClick={() => {
              setFollowVehicleId((current) =>
                current === effectiveSelectedVehicleId
                  ? null
                  : effectiveSelectedVehicleId,
              );
            }}
            sx={{
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {followVehicleId === effectiveSelectedVehicleId
              ? "Stop Following"
              : "Follow Bus"}
          </Button>
        ) : null}
      </Box>

      {/* ======================================================
          MAP — PRIMARY CONTROL ROOM SURFACE
          ====================================================== */}

      <Box
        data-control-room-map
        sx={{
          gridColumn: {
            xs: 1,
            lg: 2,
          },
          gridRow: {
            xs: 1,
            lg: 2,
          },
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
          bgcolor: "grey.100",
        }}
      >
        {liveFleetMapEnabled ? (
          <LiveTrackingMap
            height="100%"
            markers={allOperationalMapMarkers}
            plannedRoute={canonicalPlannedRoute}
            remainingRoute={remainingRouteHighlight}
            trails={operationalTrails}
            selectedMarkerKey={effectiveSelectedVehicleId}
            focusMarkerKey={selectedVehicleId}
            followMarkerKey={followVehicleId}
            onMarkerClick={(markerKey) => {
              if (vehicleById.has(markerKey)) {
                selectTrackedVehicle(markerKey);
              }
            }}
          />
        ) : (
          <Paper
            data-control-room-live-map-locked
            variant="outlined"
            sx={{
              height: "100%",
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: { xs: 2.5, sm: 4 },
              textAlign: "center",
            }}
          >
            <Box sx={{ maxWidth: 520 }}>
              <DirectionsBusRounded
                sx={{
                  fontSize: 44,
                  color: "primary.main",
                  mb: 1.5,
                }}
              />

              <Chip
                size="small"
                variant="outlined"
                label="Optional Live Map feature"
                sx={{
                  mb: 1.5,
                  fontWeight: 750,
                }}
              />

              <Typography
                variant="h5"
                component="h2"
                sx={{
                  fontWeight: 800,
                  mb: 1,
                }}
              >
                Smart operations remain active
              </Typography>

              <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                This organisation does not currently have the Live Fleet Map
                enabled.
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Live trips, GPS health, journey progress, next stops and ETA
                continue to operate in the Control Room.
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Mobile / tablet: map remains the permanent surface. */}

        <Paper
          data-control-room-mobile-overlay
          elevation={4}
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 62,
            zIndex: 5,
            display: {
              xs: "flex",
              lg: "none",
            },
            alignItems: "center",
            gap: 1,
            px: 1.25,
            py: 0.9,
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.94)",
            backdropFilter: "blur(10px)",
          }}
        >
          <DirectionsBusRounded
            sx={{
              fontSize: 20,
              color: "primary.main",
              flexShrink: 0,
            }}
          />

          <Box
            sx={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <Typography
              noWrap
              sx={{
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {selectedBusLabel}
            </Typography>

            <Typography
              noWrap
              sx={{
                color: "text.secondary",
                fontSize: 9.5,
              }}
            >
              {selectedRouteLabel}
              {selectedNextStop
                ? ` · ${selectedNextStop.stopName} · ${formatCompactEta(
                    selectedNextStop.etaSeconds,
                  )}`
                : ""}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor:
                selectedVehicleHealth?.status === "live"
                  ? "success.main"
                  : selectedVehicleHealth?.status === "delayed"
                    ? "warning.main"
                    : selectedVehicleHealth?.status === "stale"
                      ? "error.main"
                      : "grey.500",
            }}
          />
        </Paper>

        <Chip
          size="small"
          label={`${activeTrips.length} active`}
          sx={{
            position: "absolute",
            left: 12,
            bottom: 12,
            zIndex: 5,
            display: {
              xs: "flex",
              lg: "none",
            },
            bgcolor: "rgba(255,255,255,0.94)",
            backdropFilter: "blur(10px)",
            fontWeight: 800,
          }}
        />

        {liveFleetMapEnabled ? (
          <Button
            data-control-room-follow-bus
            size="small"
            variant={
              followVehicleId === effectiveSelectedVehicleId
                ? "contained"
                : "contained"
            }
            startIcon={<CenterFocusStrongRounded />}
            disabled={
              !effectiveSelectedVehicleId || selectedTrackedVehicle === null
            }
            onClick={() => {
              setFollowVehicleId((current) =>
                current === effectiveSelectedVehicleId
                  ? null
                  : effectiveSelectedVehicleId,
              );
            }}
            sx={{
              position: "absolute",
              right: 12,
              bottom: 12,
              zIndex: 5,
              display: {
                xs: "inline-flex",
                lg: "none",
              },
              minWidth: 0,
              borderRadius: 999,
              boxShadow: 4,
            }}
          >
            {followVehicleId === effectiveSelectedVehicleId
              ? "Stop Following"
              : "Follow Bus"}
          </Button>
        ) : null}

        {connectionError ||
        vehiclesQuery.isError ||
        activeTripsQuery.isError ? (
          <Alert
            severity="error"
            sx={{
              position: "absolute",
              zIndex: 6,
              left: "50%",
              bottom: {
                xs: 58,
                lg: 12,
              },
              transform: "translateX(-50%)",
              width: "min(620px, calc(100% - 32px))",
              boxShadow: 4,
            }}
          >
            {connectionError ??
              (vehiclesQuery.isError
                ? errorMessage(vehiclesQuery.error)
                : activeTripsQuery.isError
                  ? errorMessage(activeTripsQuery.error)
                  : "Live tracking is temporarily unavailable.")}
          </Alert>
        ) : null}
      </Box>
    </Box>
  );
}
