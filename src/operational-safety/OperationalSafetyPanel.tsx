import { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";

import {
  CheckCircleRounded,
  CircleRounded,
  CloseRounded,
  WarningAmberRounded,
} from "@mui/icons-material";

import { alpha as muiAlpha } from "@mui/material/styles";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { tokens } from "../theme/tokens";

import { getTrip, type Trip } from "../trips/trips.api";

import {
  createTrackingSocket,
  type OperationalSafetyWorkflowRealtimeEvent,
  type RouteDeviationConfirmedOperationalEvent,
  type RouteDeviationResolvedOperationalEvent,
} from "../tracking/tracking.realtime";

import {
  listOperationalSafetyEvents,
  listOperationalSafetyEventsPage,
  type OperationalSafetyEvent,
  type OperationalSafetyEventPage,
  type OperationalSafetyEventStatus,
} from "./operational-safety.api";

type RealtimeStatus = "connecting" | "live" | "disconnected" | "error";

type DrawerFilter = "all" | OperationalSafetyEventStatus;

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

function sortEvents(items: OperationalSafetyEvent[]): OperationalSafetyEvent[] {
  return [...items].sort((left, right) => {
    const leftNeedsFollowUp = left.handlingStatus !== "closed";
    const rightNeedsFollowUp = right.handlingStatus !== "closed";

    if (leftNeedsFollowUp !== rightNeedsFollowUp) {
      return leftNeedsFollowUp ? -1 : 1;
    }

    if (left.status !== right.status) {
      return left.status === "open" ? -1 : 1;
    }

    return (
      new Date(right.confirmedAt).getTime() -
      new Date(left.confirmedAt).getTime()
    );
  });
}

function handlingStatusLabel(
  status: OperationalSafetyEvent["handlingStatus"],
): string {
  switch (status) {
    case "unacknowledged":
      return "Awaiting staff";

    case "acknowledged":
      return "Acknowledged";

    case "closed":
      return "Closed";
  }
}

function driverReasonLabel(
  reason: NonNullable<OperationalSafetyEvent["driverReason"]>,
): string {
  switch (reason) {
    case "road_diversion":
      return "Road diversion";

    case "traffic_obstruction":
      return "Traffic obstruction";

    case "emergency":
      return "Emergency";

    case "wrong_turn":
      return "Wrong turn";

    case "other":
      return "Other";
  }
}

function studentSafetyLabel(
  status: NonNullable<OperationalSafetyEvent["studentSafetyStatus"]>,
): string {
  switch (status) {
    case "all_safe":
      return "Students safe";

    case "assistance_required":
      return "Assistance required";

    case "emergency":
      return "Emergency";
  }
}

interface SafetyEventCardProps {
  event: OperationalSafetyEvent;

  trip?: Trip;

  compact?: boolean;
}

function SafetyEventCard({
  event,
  trip,
  compact = false,
}: SafetyEventCardProps) {
  const theme = useTheme();

  const open = event.status === "open";

  const vehicle = trip?.vehicleRegistrationNumber ?? "Vehicle unavailable";

  const driver = trip?.driverName ?? "Driver unavailable";

  const route = trip
    ? `${trip.routeName}${trip.routeCode ? ` · ${trip.routeCode}` : ""}`
    : "Route unavailable";

  return (
    <Paper
      elevation={0}
      sx={{
        p: compact ? 1.5 : 2,

        minWidth: 0,

        height: "100%",

        border: "1px solid",

        borderColor: open
          ? muiAlpha(theme.palette.error.main, 0.35)
          : "divider",

        borderTop: "3px solid",

        borderTopColor: open
          ? tokens.colors.status.danger
          : tokens.colors.status.success,

        borderRadius: 2,

        bgcolor: open
          ? muiAlpha(theme.palette.error.main, 0.035)
          : "background.paper",

        boxShadow: open
          ? `0 8px 22px ${muiAlpha(theme.palette.error.main, 0.07)}`
          : "none",
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
            display: "flex",

            alignItems: "center",

            gap: 0.8,

            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 27,
              height: 27,

              flexShrink: 0,

              display: "grid",
              placeItems: "center",

              borderRadius: "50%",

              color: open
                ? tokens.colors.status.danger
                : tokens.colors.status.success,

              bgcolor: open ? tokens.alpha.danger10 : tokens.alpha.success10,
            }}
          >
            {open ? (
              <WarningAmberRounded sx={{ fontSize: 15 }} />
            ) : (
              <CheckCircleRounded sx={{ fontSize: 15 }} />
            )}
          </Box>

          <Typography
            sx={{
              fontSize: 11.5,
              fontWeight: 800,

              minWidth: 0,
            }}
          >
            Route deviation
          </Typography>
        </Box>

        <Chip
          size="small"

          label={open ? "OPEN" : "Resolved"}

          sx={{
            height: 21,

            fontSize: 9,

            fontWeight: 850,

            color: open
              ? tokens.colors.status.danger
              : tokens.colors.status.success,

            bgcolor: open ? tokens.alpha.danger10 : tokens.alpha.success10,
          }}
        />
      </Box>

      <Typography
        sx={{
          mt: 1,

          fontSize: compact ? 16 : 18,

          lineHeight: 1.05,

          fontWeight: 900,

          letterSpacing: "0.015em",
        }}
      >
        {vehicle}
      </Typography>

      <Typography
        noWrap
        sx={{
          mt: 0.65,

          color: "text.secondary",

          fontSize: 10.5,

          fontWeight: 700,
        }}
      >
        {driver}
      </Typography>

      <Typography
        noWrap
        title={route}
        sx={{
          mt: 0.2,

          color: "text.secondary",

          fontSize: 10.5,
        }}
      >
        {route}
      </Typography>

      <Box
        sx={{
          mt: 0.8,

          display: "flex",

          alignItems: "center",

          gap: 0.7,

          flexWrap: "wrap",
        }}
      >
        <Chip
          size="small"
          variant="outlined"
          label={handlingStatusLabel(event.handlingStatus)}
          sx={{
            height: 20,

            fontSize: 9,

            fontWeight: 750,
          }}
        />

        {event.driverReason ? (
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 9.5,

              fontWeight: 650,
            }}
          >
            Driver: {driverReasonLabel(event.driverReason)}
          </Typography>
        ) : null}
      </Box>

      {event.studentSafetyStatus ? (
        <Typography
          sx={{
            mt: 0.45,

            color:
              event.studentSafetyStatus === "all_safe"
                ? tokens.colors.status.success
                : tokens.colors.status.danger,

            fontSize: 9.5,

            fontWeight: 750,
          }}
        >
          {studentSafetyLabel(event.studentSafetyStatus)}
        </Typography>
      ) : null}

      {!compact && event.teacherNote ? (
        <Typography
          sx={{
            mt: 0.45,

            color: "text.secondary",

            fontSize: 9.5,

            lineHeight: 1.35,

            overflowWrap: "anywhere",
          }}
        >
          Staff note: {event.teacherNote}
        </Typography>
      ) : null}

      <Box
        sx={{
          display: "flex",

          alignItems: "center",

          justifyContent: "space-between",

          gap: 1,

          mt: 1.1,
        }}
      >
        <Typography
          sx={{
            color: open ? "error.main" : "text.secondary",

            fontSize: 10.5,

            fontWeight: open ? 800 : 600,
          }}
        >
          {Math.round(event.lastDistanceMeters)} m from route
        </Typography>

        {trip ? (
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 9.5,

              fontWeight: 650,
            }}
          >
            {tripStatusLabel(trip.status)}
          </Typography>
        ) : null}
      </Box>

      <Box
        sx={{
          mt: 1,

          pt: 0.85,

          borderTop: "1px solid",

          borderColor: "divider",
        }}
      >
        <Typography
          sx={{
            color: "text.secondary",

            fontSize: 9.5,
          }}
        >
          Confirmed {formatDateTime(event.confirmedAt)}
        </Typography>

        {event.resolvedAt ? (
          <Typography
            sx={{
              mt: 0.2,

              color: tokens.colors.status.success,

              fontSize: 9.5,

              fontWeight: 750,
            }}
          >
            Recovered {formatDateTime(event.resolvedAt)}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}

export function OperationalSafetyPanel() {
  const { tenant, permissions } = useAuth();

  const queryClient = useQueryClient();

  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connecting");

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [drawerFilter, setDrawerFilter] = useState<DrawerFilter>("all");

  const [drawerCursor, setDrawerCursor] = useState<string | null>(null);

  const [drawerCursorHistory, setDrawerCursorHistory] = useState<
    (string | null)[]
  >([]);

  const [drawerPage, setDrawerPage] = useState(1);

  const tenantId = tenant?.tenantId ?? null;

  const canReadSafetyEvents = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.OPERATIONAL_SAFETY_EVENTS_READ,
  );

  const queryKey = useMemo(
    () => ["operational-safety-events", tenantId] as const,
    [tenantId],
  );

  /**
   * Dashboard bootstrap.
   *
   * We keep enough events for a useful open count but only render
   * four cards on the dashboard itself.
   */
  const safetyQuery = useQuery({
    queryKey,

    queryFn: () => {
      if (!tenantId) {
        throw new Error("Tenant context is missing");
      }

      return listOperationalSafetyEvents(tenantId, 20);
    },

    enabled: Boolean(tenantId && canReadSafetyEvents),
  });

  /**
   * Full history drawer uses the backend's cursor pagination.
   */
  const drawerQuery = useQuery({
    queryKey: [
      "operational-safety-drawer",
      tenantId,
      drawerFilter,
      drawerCursor,
    ],

    enabled: Boolean(drawerOpen && tenantId && canReadSafetyEvents),

    queryFn: () => {
      if (!tenantId) {
        throw new Error("Tenant context is missing");
      }

      return listOperationalSafetyEventsPage(tenantId, {
        limit: 12,

        status: drawerFilter === "all" ? undefined : drawerFilter,

        cursor: drawerCursor ?? undefined,
      });
    },
  });

  /**
   * Resolve the human-readable trip information for both
   * dashboard cards and drawer cards.
   */
  const detailEvents = [
    ...(safetyQuery.data?.items ?? []),
    ...(drawerQuery.data?.items ?? []),
  ];

  const eventTripIds = [
    ...new Set(detailEvents.map((event) => event.tripId)),
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

            driverReason: null,

            driverReasonRecordedAt: null,

            driverReasonRecordedByUserId: null,

            handlingStatus: "unacknowledged",

            acknowledgedAt: null,

            acknowledgedByUserId: null,

            studentSafetyStatus: null,

            teacherNote: null,

            closedAt: null,

            closedByUserId: null,

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

      void queryClient.invalidateQueries({
        queryKey: ["operational-safety-drawer", tenantId],
      });
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

      void queryClient.invalidateQueries({
        queryKey: ["operational-safety-drawer", tenantId],
      });
    };

    const refreshHumanWorkflow = (
      event: OperationalSafetyWorkflowRealtimeEvent,
    ): void => {
      if (event.tenantId !== tenantId) {
        return;
      }

      /**
       * Human workflow realtime payloads intentionally omit
       * free-text notes and other unnecessary durable fields.
       *
       * Refetch the authorised API record so PostgreSQL remains
       * the canonical source of truth.
       */
      void queryClient.invalidateQueries({
        queryKey,
      });

      void queryClient.invalidateQueries({
        queryKey: ["operational-safety-drawer", tenantId],
      });
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

    socket.on(
      "operational.safety.driver_reason_recorded",
      refreshHumanWorkflow,
    );

    socket.on("operational.safety.acknowledged", refreshHumanWorkflow);

    socket.on("operational.safety.assessment_updated", refreshHumanWorkflow);

    socket.on("operational.safety.closed", refreshHumanWorkflow);

    socket.connect();

    return () => {
      socket.off("operational.route_deviation.confirmed", mergeConfirmed);

      socket.off("operational.route_deviation.resolved", mergeResolved);

      socket.off(
        "operational.safety.driver_reason_recorded",
        refreshHumanWorkflow,
      );

      socket.off("operational.safety.acknowledged", refreshHumanWorkflow);

      socket.off("operational.safety.assessment_updated", refreshHumanWorkflow);

      socket.off("operational.safety.closed", refreshHumanWorkflow);

      socket.disconnect();
    };
  }, [canReadSafetyEvents, queryClient, queryKey, tenantId]);

  if (!canReadSafetyEvents || !tenantId) {
    return null;
  }

  const events = sortEvents(safetyQuery.data?.items ?? []);

  const dashboardEvents = events.slice(0, 4);

  const followUpCount = events.filter(
    (event) => event.handlingStatus !== "closed",
  ).length;

  const activeAlert = followUpCount > 0;

  function selectDrawerFilter(filter: DrawerFilter): void {
    setDrawerFilter(filter);

    setDrawerCursor(null);

    setDrawerCursorHistory([]);

    setDrawerPage(1);
  }

  function nextDrawerPage(): void {
    const nextCursor = drawerQuery.data?.nextCursor;

    if (!nextCursor) {
      return;
    }

    setDrawerCursorHistory((current) => [...current, drawerCursor]);

    setDrawerCursor(nextCursor);

    setDrawerPage((current) => current + 1);
  }

  function previousDrawerPage(): void {
    if (drawerPage <= 1) {
      return;
    }

    const previousCursor =
      drawerCursorHistory[drawerCursorHistory.length - 1] ?? null;

    setDrawerCursor(previousCursor);

    setDrawerCursorHistory((current) => current.slice(0, -1));

    setDrawerPage((current) => Math.max(1, current - 1));
  }

  return (
    <>
      <Box
        id="operational-safety"

        sx={{
          scrollMarginTop: "96px",
        }}
      >
        {/* Compact section header */}
        <Box
          sx={{
            mb: 1.4,

            display: "flex",

            alignItems: {
              xs: "flex-start",
              sm: "center",
            },

            justifyContent: "space-between",

            flexDirection: {
              xs: "column",
              sm: "row",
            },

            gap: 1.2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 15,

                fontWeight: 850,

                letterSpacing: "-0.015em",
              }}
            >
              Operational Safety
            </Typography>

            <Typography
              sx={{
                mt: 0.2,

                color: "text.secondary",

                fontSize: 10.5,
              }}
            >
              Live route-deviation monitoring
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",

              alignItems: "center",

              gap: 0.75,

              flexWrap: "wrap",
            }}
          >
            <Chip
              size="small"

              icon={
                <CircleRounded
                  sx={{
                    fontSize: "7px !important",

                    color:
                      realtimeStatus === "live"
                        ? `${tokens.colors.status.success} !important`
                        : `${tokens.colors.status.inactive} !important`,
                  }}
                />
              }

              label={realtimeStatus === "live" ? "Live" : realtimeStatus}

              variant="outlined"

              sx={{
                height: 22,

                fontSize: 9,

                fontWeight: 700,
              }}
            />

            <Chip
              size="small"

              label={`${followUpCount} follow-up`}

              sx={{
                height: 22,

                fontSize: 9,

                fontWeight: 800,

                color: activeAlert
                  ? tokens.colors.status.danger
                  : tokens.colors.status.success,

                bgcolor: activeAlert
                  ? tokens.alpha.danger10
                  : tokens.alpha.success10,
              }}
            />

            <Button
              size="small"

              onClick={() => setDrawerOpen(true)}

              sx={{
                minHeight: 26,

                px: 1,

                fontSize: 10,

                fontWeight: 750,
              }}
            >
              View all
            </Button>
          </Box>
        </Box>

        {activeAlert ? (
          <Alert
            severity="error"

            sx={{
              mb: 1.5,

              py: 0,

              fontSize: 11.5,

              "& .MuiAlert-icon": {
                py: 0.7,
              },

              "& .MuiAlert-message": {
                py: 0.7,
              },
            }}
          >
            {followUpCount === 1
              ? "1 operational safety event requires follow-up."
              : `${followUpCount} operational safety events require follow-up.`}
          </Alert>
        ) : null}

        {safetyQuery.isLoading ? (
          <Box
            sx={{
              minHeight: 100,

              display: "grid",

              placeItems: "center",
            }}
          >
            <CircularProgress size={22} />
          </Box>
        ) : null}

        {safetyQuery.isError ? (
          <Alert severity="error">
            Operational safety events could not be loaded.
          </Alert>
        ) : null}

        {!safetyQuery.isLoading &&
        !safetyQuery.isError &&
        events.length === 0 ? (
          <Paper
            elevation={0}

            sx={{
              px: 2,
              py: 1.5,

              display: "flex",

              alignItems: "center",

              gap: 1,

              border: "1px solid",

              borderColor: "divider",
            }}
          >
            <CheckCircleRounded
              sx={{
                color: tokens.colors.status.success,

                fontSize: 19,
              }}
            />

            <Typography
              sx={{
                fontSize: 11.5,

                fontWeight: 700,
              }}
            >
              All clear — no confirmed operational safety alerts.
            </Typography>
          </Paper>
        ) : null}

        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",

              sm: "repeat(2, minmax(0, 1fr))",

              lg: "repeat(3, minmax(0, 1fr))",

              xl: "repeat(4, minmax(0, 1fr))",
            },

            gap: 1.25,
          }}
        >
          {dashboardEvents.map((event) => (
            <SafetyEventCard
              key={event.routeDeviationId}

              event={event}

              trip={tripDetailsQuery.data?.[event.tripId]}

              compact
            />
          ))}
        </Box>
      </Box>

      {/* ==================================================
          FULL OPERATIONAL SAFETY HISTORY
          ================================================== */}

      <Drawer
        anchor="right"

        open={drawerOpen}

        onClose={() => setDrawerOpen(false)}

        sx={{
          "& .MuiDrawer-paper": {
            width: {
              xs: "100%",
              sm: 520,
            },

            maxWidth: "100vw",
          },
        }}
      >
        <Box
          sx={{
            height: "100%",

            display: "flex",

            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 2,

              display: "flex",

              alignItems: "center",

              justifyContent: "space-between",

              gap: 2,

              borderBottom: "1px solid",

              borderColor: "divider",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 17,

                  fontWeight: 900,
                }}
              >
                Operational Safety
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,

                  color: "text.secondary",

                  fontSize: 10.5,
                }}
              >
                Route-deviation event history
              </Typography>
            </Box>

            <IconButton
              aria-label="Close operational safety history"

              onClick={() => setDrawerOpen(false)}
            >
              <CloseRounded />
            </IconButton>
          </Box>

          <Box
            sx={{
              px: 2.5,
              py: 1.5,

              display: "flex",

              gap: 0.75,

              borderBottom: "1px solid",

              borderColor: "divider",
            }}
          >
            {(["all", "open", "resolved"] as const).map((filter) => (
              <Button
                key={filter}

                size="small"

                variant={drawerFilter === filter ? "contained" : "outlined"}

                onClick={() => selectDrawerFilter(filter)}

                sx={{
                  textTransform: "capitalize",
                }}
              >
                {filter}
              </Button>
            ))}
          </Box>

          {/* The history itself scrolls independently. */}
          <Box
            sx={{
              flex: 1,

              minHeight: 0,

              overflowY: "auto",

              p: 2,
            }}
          >
            {drawerQuery.isLoading ? (
              <Box
                sx={{
                  minHeight: 180,

                  display: "grid",

                  placeItems: "center",
                }}
              >
                <CircularProgress size={24} />
              </Box>
            ) : null}

            {drawerQuery.isError ? (
              <Alert severity="error">
                Safety history could not be loaded.
              </Alert>
            ) : null}

            {!drawerQuery.isLoading &&
            !drawerQuery.isError &&
            (drawerQuery.data?.items.length ?? 0) === 0 ? (
              <Typography
                sx={{
                  py: 5,

                  textAlign: "center",

                  color: "text.secondary",

                  fontSize: 12,
                }}
              >
                No events in this view.
              </Typography>
            ) : null}

            <Box
              sx={{
                display: "grid",

                gap: 1.25,
              }}
            >
              {(drawerQuery.data?.items ?? []).map((event) => (
                <SafetyEventCard
                  key={event.routeDeviationId}

                  event={event}

                  trip={tripDetailsQuery.data?.[event.tripId]}
                />
              ))}
            </Box>
          </Box>

          {/* Cursor pagination stays fixed while history scrolls. */}
          <Box
            sx={{
              px: 2.5,
              py: 1.5,

              display: "flex",

              alignItems: "center",

              justifyContent: "space-between",

              gap: 2,

              borderTop: "1px solid",

              borderColor: "divider",

              bgcolor: "background.paper",
            }}
          >
            <Button
              size="small"

              disabled={drawerPage === 1 || drawerQuery.isFetching}

              onClick={previousDrawerPage}
            >
              Previous
            </Button>

            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 11,

                fontWeight: 700,
              }}
            >
              Page {drawerPage}
            </Typography>

            <Button
              size="small"

              disabled={!drawerQuery.data?.nextCursor || drawerQuery.isFetching}

              onClick={nextDrawerPage}
            >
              Next
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
