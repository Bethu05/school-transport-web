import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";

import {
  CheckCircleRounded,
  CircleRounded,
  WarningAmberRounded,
} from "@mui/icons-material";

import { alpha as muiAlpha } from "@mui/material/styles";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { SectionHeader } from "../dashboard/components/SectionHeader";

import { tokens } from "../theme/tokens";

import { getTrip, type Trip } from "../trips/trips.api";

import {
  createTrackingSocket,
  type RouteDeviationConfirmedOperationalEvent,
  type RouteDeviationResolvedOperationalEvent,
} from "../tracking/tracking.realtime";

import {
  listOperationalSafetyEvents,
  type OperationalSafetyEvent,
  type OperationalSafetyEventPage,
} from "./operational-safety.api";

type RealtimeStatus = "connecting" | "live" | "disconnected" | "error";

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function tripStatusLabel(status: string): string {
  switch (status) {
    case "in_progress":
      return "In progress";

    case "boarding":
      return "Boarding";

    case "scheduled":
      return "Scheduled";

    case "draft":
      return "Draft";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    default:
      return status;
  }
}

/**
 * Active safety events must always appear before historical
 * resolved events.
 */
function sortEvents(items: OperationalSafetyEvent[]): OperationalSafetyEvent[] {
  return [...items].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "open" ? -1 : 1;
    }

    return (
      new Date(right.confirmedAt).getTime() -
      new Date(left.confirmedAt).getTime()
    );
  });
}

/**
 * Operational safety feed for authorised transport staff.
 *
 * Durable bootstrap:
 *   API -> PostgreSQL/RLS
 *
 * Live updates:
 *   realtime gateway -> confirmed/resolved events
 */
export function OperationalSafetyPanel() {
  const { tenant, permissions } = useAuth();

  const theme = useTheme();

  const queryClient = useQueryClient();

  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connecting");

  const tenantId = tenant?.tenantId ?? null;

  const canReadSafetyEvents = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.OPERATIONAL_SAFETY_EVENTS_READ,
  );

  const queryKey = useMemo(
    () => ["operational-safety-events", tenantId] as const,
    [tenantId],
  );

  const safetyQuery = useQuery({
    queryKey,

    queryFn: () => {
      if (!tenantId) {
        throw new Error("Tenant context is missing");
      }

      return listOperationalSafetyEvents(tenantId);
    },

    enabled: Boolean(tenantId && canReadSafetyEvents),
  });

  /**
   * Operational safety events intentionally store stable domain IDs.
   *
   * The existing Trip API already resolves those IDs into useful
   * operational information:
   *
   * - vehicle registration number
   * - driver name
   * - route name / code
   * - current trip status
   *
   * We therefore enrich the dashboard in the frontend without
   * duplicating that data in the safety-event contract.
   */
  const eventTripIds = [
    ...new Set((safetyQuery.data?.items ?? []).map((event) => event.tripId)),
  ].sort();

  const eventTripIdsKey = eventTripIds.join("|");

  const tripDetailsQuery = useQuery({
    queryKey: ["operational-safety-trip-details", tenantId, eventTripIdsKey],

    enabled: Boolean(
      tenantId && canReadSafetyEvents && eventTripIds.length > 0,
    ),

    queryFn: async (): Promise<Record<string, Trip>> => {
      if (!tenantId) {
        throw new Error("Tenant context is missing");
      }

      /**
       * One historical trip failing to load must not prevent
       * every other safety event from receiving useful labels.
       */
      const results = await Promise.allSettled(
        eventTripIds.map(async (tripId) => {
          const trip = await getTrip(tenantId, tripId);

          return [tripId, trip] as const;
        }),
      );

      const tripsById: Record<string, Trip> = {};

      for (const result of results) {
        if (result.status === "fulfilled") {
          const [tripId, trip] = result.value;

          tripsById[tripId] = trip;
        }
      }

      return tripsById;
    },
  });

  useEffect(() => {
    if (!tenantId || !canReadSafetyEvents) {
      return;
    }

    const socket = createTrackingSocket(tenantId);

    const mergeConfirmed = (
      event: RouteDeviationConfirmedOperationalEvent,
    ): void => {
      if (event.tenantId !== tenantId) {
        return;
      }

      queryClient.setQueryData<OperationalSafetyEventPage>(
        queryKey,
        (current) => {
          const previous = current?.items ?? [];

          const existing = previous.find(
            (item) => item.routeDeviationId === event.routeDeviationId,
          );

          const nextEvent: OperationalSafetyEvent = {
            id: existing?.id ?? `realtime:${event.routeDeviationId}`,

            tenantId: event.tenantId,
            schoolId: event.schoolId,
            tripId: event.tripId,
            routeId: event.routeId,
            vehicleId: event.vehicleId,
            routeDeviationId: event.routeDeviationId,

            eventType: "route_deviation",

            severity: event.severity,
            status: "open",

            firstObservedAt: event.firstObservedAt,
            confirmedAt: event.confirmedAt,
            lastObservedAt: event.occurredAt,
            resolvedAt: null,

            initialDistanceMeters: event.initialDistanceMeters,
            maxDistanceMeters: event.maxDistanceMeters,
            lastDistanceMeters: event.distanceMeters,
          };

          const remaining = previous.filter(
            (item) => item.routeDeviationId !== event.routeDeviationId,
          );

          return {
            items: sortEvents([nextEvent, ...remaining]).slice(0, 20),
            nextCursor: current?.nextCursor ?? null,
          };
        },
      );
    };

    const mergeResolved = (
      event: RouteDeviationResolvedOperationalEvent,
    ): void => {
      if (event.tenantId !== tenantId) {
        return;
      }

      queryClient.setQueryData<OperationalSafetyEventPage>(
        queryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,

            items: sortEvents(
              current.items.map((item) =>
                item.routeDeviationId === event.routeDeviationId
                  ? {
                      ...item,

                      status: "resolved",
                      resolvedAt: event.resolvedAt,
                      lastObservedAt: event.occurredAt,
                      lastDistanceMeters: event.distanceMeters,
                    }
                  : item,
              ),
            ),
          };
        },
      );
    };

    socket.on("connect", () => {
      setRealtimeStatus("live");
    });

    socket.on("disconnect", () => {
      setRealtimeStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setRealtimeStatus("error");
    });

    socket.on("operational.route_deviation.confirmed", mergeConfirmed);

    socket.on("operational.route_deviation.resolved", mergeResolved);

    socket.connect();

    return () => {
      socket.off("operational.route_deviation.confirmed", mergeConfirmed);

      socket.off("operational.route_deviation.resolved", mergeResolved);

      socket.disconnect();
    };
  }, [canReadSafetyEvents, queryClient, queryKey, tenantId]);

  if (!canReadSafetyEvents || !tenantId) {
    return null;
  }

  const events = sortEvents(safetyQuery.data?.items ?? []);

  const openCount = events.filter((event) => event.status === "open").length;

  const activeAlert = openCount > 0;

  return (
    <Paper
      id="operational-safety"

      elevation={0}

      sx={{
        p: {
          xs: 2.5,
          md: 3,
        },

        scrollMarginTop: "96px",

        border: "1px solid",

        borderColor: activeAlert ? "error.main" : "divider",

        bgcolor: activeAlert
          ? muiAlpha(theme.palette.error.main, 0.025)
          : "background.paper",

        boxShadow: activeAlert
          ? `0 0 0 1px ${muiAlpha(theme.palette.error.main, 0.08)}`
          : "none",

        transition:
          "border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease",
      }}
    >
      <SectionHeader
        title="Operational Safety"

        subtitle="Live safety events requiring transport operations visibility"

        action={
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

              icon={
                <CircleRounded
                  sx={{
                    fontSize: "8px !important",

                    color:
                      realtimeStatus === "live"
                        ? `${tokens.colors.status.success} !important`
                        : `${tokens.colors.status.inactive} !important`,
                  }}
                />
              }

              label={
                realtimeStatus === "live"
                  ? "Live"
                  : realtimeStatus === "connecting"
                    ? "Connecting"
                    : realtimeStatus
              }

              variant="outlined"

              sx={{
                fontWeight: 700,
              }}
            />

            <Chip
              size="small"

              label={`${openCount} open`}

              sx={{
                fontWeight: 800,

                color: activeAlert
                  ? tokens.colors.status.danger
                  : tokens.colors.status.success,

                bgcolor: activeAlert
                  ? tokens.alpha.danger10
                  : tokens.alpha.success10,
              }}
            />
          </Box>
        }
      />

      {activeAlert ? (
        <Alert
          severity="error"

          icon={<WarningAmberRounded />}

          sx={{
            mb: 2.5,

            border: "1px solid",
            borderColor: muiAlpha(theme.palette.error.main, 0.25),

            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Immediate attention required
          </Typography>

          <Typography
            sx={{
              mt: 0.25,
              fontSize: 11.5,
            }}
          >
            {openCount === 1
              ? "1 active transport safety event requires monitoring."
              : `${openCount} active transport safety events require monitoring.`}
          </Typography>
        </Alert>
      ) : null}

      {safetyQuery.isLoading ? (
        <Box
          sx={{
            minHeight: 130,

            display: "grid",
            placeItems: "center",
          }}
        >
          <CircularProgress size={24} />
        </Box>
      ) : null}

      {safetyQuery.isError ? (
        <Alert severity="error">
          Operational safety events could not be loaded.
        </Alert>
      ) : null}

      {!safetyQuery.isLoading && !safetyQuery.isError && events.length === 0 ? (
        <Box
          sx={{
            py: 4,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,

              mx: "auto",

              display: "grid",
              placeItems: "center",

              borderRadius: "50%",

              color: tokens.colors.status.success,
              bgcolor: tokens.alpha.success10,
            }}
          >
            <CheckCircleRounded />
          </Box>

          <Typography
            sx={{
              mt: 1.5,
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            All clear
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color: "text.secondary",
              fontSize: 11.5,
            }}
          >
            No confirmed operational safety alerts.
          </Typography>
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gap: 1,
        }}
      >
        {events.map((event, index) => {
          const open = event.status === "open";

          const trip = tripDetailsQuery.data?.[event.tripId];

          const vehicleLabel =
            trip?.vehicleRegistrationNumber ??
            `Vehicle ${shortId(event.vehicleId)}`;

          const driverLabel =
            trip?.driverName ??
            (tripDetailsQuery.isFetching
              ? "Loading driver..."
              : "Driver unavailable");

          const routeLabel = trip
            ? `${trip.routeName}${trip.routeCode ? ` (${trip.routeCode})` : ""}`
            : `Route ${shortId(event.routeId)}`;

          return (
            <Box key={event.routeDeviationId}>
              <Box
                sx={{
                  p: 1.75,

                  display: "grid",

                  gridTemplateColumns: {
                    xs: "auto minmax(0,1fr)",
                    sm: "auto minmax(0,1fr) auto",
                  },

                  alignItems: "start",

                  gap: 1.3,

                  borderRadius: 2,

                  borderLeft: "4px solid",

                  borderLeftColor: open
                    ? tokens.colors.status.danger
                    : tokens.colors.status.success,

                  bgcolor: open
                    ? muiAlpha(theme.palette.error.main, 0.055)
                    : muiAlpha(theme.palette.success.main, 0.035),
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,

                    display: "grid",
                    placeItems: "center",

                    borderRadius: "50%",

                    color: open
                      ? tokens.colors.status.danger
                      : tokens.colors.status.success,

                    bgcolor: open
                      ? tokens.alpha.danger10
                      : tokens.alpha.success10,
                  }}
                >
                  {open ? (
                    <WarningAmberRounded
                      sx={{
                        fontSize: 19,
                      }}
                    />
                  ) : (
                    <CheckCircleRounded
                      sx={{
                        fontSize: 19,
                      }}
                    />
                  )}
                </Box>

                <Box
                  sx={{
                    minWidth: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 850,
                    }}
                  >
                    Route deviation {open ? "confirmed" : "resolved"}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.45,

                      fontSize: 15,

                      lineHeight: 1.2,

                      fontWeight: 900,

                      letterSpacing: "0.02em",
                    }}
                  >
                    {vehicleLabel}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.55,

                      color: "text.secondary",

                      fontSize: 11.5,

                      fontWeight: 650,
                    }}
                  >
                    {driverLabel}
                    {" · "}
                    {routeLabel}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.4,

                      color: "text.secondary",

                      fontSize: 11,
                    }}
                  >
                    {trip ? `${tripStatusLabel(trip.status)} · ` : ""}
                    {Math.round(event.lastDistanceMeters)} m from route
                    {" · "}
                    confirmed {formatDateTime(event.confirmedAt)}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.35,

                      color: "text.disabled",

                      fontSize: 9.5,
                    }}
                  >
                    Trip {shortId(event.tripId)}
                  </Typography>

                  {event.resolvedAt ? (
                    <Typography
                      sx={{
                        mt: 0.5,

                        color: tokens.colors.status.success,

                        fontSize: 11,
                        fontWeight: 750,
                      }}
                    >
                      Recovered {formatDateTime(event.resolvedAt)}
                    </Typography>
                  ) : null}
                </Box>

                <Chip
                  size="small"

                  label={open ? "Open" : "Resolved"}

                  sx={{
                    gridColumn: {
                      xs: "2",
                      sm: "auto",
                    },

                    fontWeight: 800,

                    color: open
                      ? tokens.colors.status.danger
                      : tokens.colors.status.success,

                    bgcolor: open
                      ? tokens.alpha.danger10
                      : tokens.alpha.success10,
                  }}
                />
              </Box>

              {index < events.length - 1 ? (
                <Divider
                  sx={{
                    my: 0.5,
                    opacity: 0.45,
                  }}
                />
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
