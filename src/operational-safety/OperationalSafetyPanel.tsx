import { useEffect, useMemo, useState } from "react";

import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Typography,
} from "@mui/material";

import {
  CheckCircleRounded,
  WarningAmberRounded,
} from "@mui/icons-material";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { SectionHeader } from "../dashboard/components/SectionHeader";

import { tokens } from "../theme/tokens";

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

type RealtimeStatus =
  | "connecting"
  | "live"
  | "disconnected"
  | "error";

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

function sortEvents(
  items: OperationalSafetyEvent[],
): OperationalSafetyEvent[] {
  return [...items].sort(
    (left, right) =>
      new Date(right.confirmedAt).getTime() -
      new Date(left.confirmedAt).getTime(),
  );
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

    enabled: Boolean(
      tenantId &&
        canReadSafetyEvents,
    ),
  });

  useEffect(() => {
    if (
      !tenantId ||
      !canReadSafetyEvents
    ) {
      return;
    }

    const socket =
      createTrackingSocket(tenantId);

    const mergeConfirmed = (
      event:
        RouteDeviationConfirmedOperationalEvent,
    ): void => {
      if (
        event.tenantId !== tenantId
      ) {
        return;
      }

      queryClient.setQueryData<
        OperationalSafetyEventPage
      >(
        queryKey,
        (current) => {
          const previous =
            current?.items ?? [];

          const existing =
            previous.find(
              (item) =>
                item.routeDeviationId ===
                event.routeDeviationId,
            );

          const nextEvent:
            OperationalSafetyEvent = {
            id:
              existing?.id ??
              `realtime:${event.routeDeviationId}`,

            tenantId:
              event.tenantId,

            schoolId:
              event.schoolId,

            tripId:
              event.tripId,

            routeId:
              event.routeId,

            vehicleId:
              event.vehicleId,

            routeDeviationId:
              event.routeDeviationId,

            eventType:
              "route_deviation",

            severity:
              event.severity,

            status:
              "open",

            firstObservedAt:
              event.firstObservedAt,

            confirmedAt:
              event.confirmedAt,

            lastObservedAt:
              event.occurredAt,

            resolvedAt:
              null,

            initialDistanceMeters:
              event.initialDistanceMeters,

            maxDistanceMeters:
              event.maxDistanceMeters,

            lastDistanceMeters:
              event.distanceMeters,
          };

          const remaining =
            previous.filter(
              (item) =>
                item.routeDeviationId !==
                event.routeDeviationId,
            );

          return {
            items: sortEvents([
              nextEvent,
              ...remaining,
            ]).slice(0, 20),

            nextCursor:
              current?.nextCursor ??
              null,
          };
        },
      );
    };

    const mergeResolved = (
      event:
        RouteDeviationResolvedOperationalEvent,
    ): void => {
      if (
        event.tenantId !== tenantId
      ) {
        return;
      }

      queryClient.setQueryData<
        OperationalSafetyEventPage
      >(
        queryKey,
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,

            items:
              current.items.map(
                (item) =>
                  item.routeDeviationId ===
                  event.routeDeviationId
                    ? {
                        ...item,

                        status:
                          "resolved",

                        resolvedAt:
                          event.resolvedAt,

                        lastObservedAt:
                          event.occurredAt,

                        lastDistanceMeters:
                          event.distanceMeters,
                      }
                    : item,
              ),
          };
        },
      );
    };

    socket.on(
      "connect",
      () => {
        setRealtimeStatus(
          "live",
        );
      },
    );

    socket.on(
      "disconnect",
      () => {
        setRealtimeStatus(
          "disconnected",
        );
      },
    );

    socket.on(
      "connect_error",
      () => {
        setRealtimeStatus(
          "error",
        );
      },
    );

    socket.on(
      "operational.route_deviation.confirmed",
      mergeConfirmed,
    );

    socket.on(
      "operational.route_deviation.resolved",
      mergeResolved,
    );

    socket.connect();

    return () => {
      socket.off(
        "operational.route_deviation.confirmed",
        mergeConfirmed,
      );

      socket.off(
        "operational.route_deviation.resolved",
        mergeResolved,
      );

      socket.disconnect();
    };
  }, [
    canReadSafetyEvents,
    queryClient,
    queryKey,
    tenantId,
  ]);

  if (
    !canReadSafetyEvents ||
    !tenantId
  ) {
    return null;
  }

  const events =
    safetyQuery.data?.items ?? [];

  const openCount =
    events.filter(
      (event) =>
        event.status === "open",
    ).length;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,

        border: "1px solid",

        borderColor: "divider",
      }}
    >
      <SectionHeader
        title="Operational Safety"
        subtitle="Confirmed route deviations and recovery events"
        action={
          <Box
            sx={{
              display: "flex",

              alignItems:
                "center",

              gap: 1,
            }}
          >
            <Chip
              size="small"

              label={`${openCount} open`}

              sx={{
                color:
                  openCount > 0
                    ? tokens
                        .colors
                        .status
                        .danger
                    : tokens
                        .colors
                        .status
                        .success,

                bgcolor:
                  openCount > 0
                    ? tokens
                        .alpha
                        .danger10
                    : tokens
                        .alpha
                        .success10,
              }}
            />

            <Chip
              size="small"

              label={
                realtimeStatus ===
                "live"
                  ? "Live"
                  : realtimeStatus
              }

              variant="outlined"
            />
          </Box>
        }
      />

      {safetyQuery.isLoading ? (
        <Box
          sx={{
            minHeight: 130,

            display: "grid",

            placeItems:
              "center",
          }}
        >
          <CircularProgress
            size={24}
          />
        </Box>
      ) : null}

      {safetyQuery.isError ? (
        <Typography
          sx={{
            py: 3,

            color:
              "error.main",

            fontSize: 12,
          }}
        >
          Operational safety
          events could not be
          loaded.
        </Typography>
      ) : null}

      {!safetyQuery.isLoading &&
      !safetyQuery.isError &&
      events.length === 0 ? (
        <Box
          sx={{
            py: 4,

            textAlign:
              "center",
          }}
        >
          <CheckCircleRounded
            sx={{
              fontSize: 30,

              color:
                tokens
                  .colors
                  .status
                  .success,
            }}
          />

          <Typography
            sx={{
              mt: 1,

              fontSize: 12.5,

              fontWeight: 700,
            }}
          >
            No operational
            safety alerts
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color:
                "text.secondary",

              fontSize: 11,
            }}
          >
            Confirmed route
            deviations will
            appear here.
          </Typography>
        </Box>
      ) : null}

      <Box
        sx={{
          display: "grid",
        }}
      >
        {events.map(
          (event, index) => {
            const open =
              event.status ===
              "open";

            return (
              <Box
                key={
                  event.routeDeviationId
                }
              >
                <Box
                  sx={{
                    py: 1.7,

                    display:
                      "grid",

                    gridTemplateColumns:
                      "auto minmax(0, 1fr) auto",

                    alignItems:
                      "start",

                    gap: 1.2,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,

                      display:
                        "grid",

                      placeItems:
                        "center",

                      borderRadius:
                        "50%",

                      color: open
                        ? tokens
                            .colors
                            .status
                            .danger
                        : tokens
                            .colors
                            .status
                            .success,

                      bgcolor: open
                        ? tokens
                            .alpha
                            .danger10
                        : tokens
                            .alpha
                            .success10,
                    }}
                  >
                    {open ? (
                      <WarningAmberRounded
                        sx={{
                          fontSize:
                            17,
                        }}
                      />
                    ) : (
                      <CheckCircleRounded
                        sx={{
                          fontSize:
                            17,
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
                        fontSize:
                          12.5,

                        fontWeight:
                          800,
                      }}
                    >
                      Route
                      deviation{" "}
                      {open
                        ? "confirmed"
                        : "resolved"}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.35,

                        color:
                          "text.secondary",

                        fontSize:
                          10.5,
                      }}
                    >
                      Trip{" "}
                      {shortId(
                        event.tripId,
                      )}
                      {" · "}
                      Vehicle{" "}
                      {shortId(
                        event.vehicleId,
                      )}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.35,

                        color:
                          "text.secondary",

                        fontSize:
                          10.5,
                      }}
                    >
                      {Math.round(
                        event.lastDistanceMeters,
                      )}{" "}
                      m from route
                      {" · "}
                      confirmed{" "}
                      {formatDateTime(
                        event.confirmedAt,
                      )}
                    </Typography>

                    {event.resolvedAt ? (
                      <Typography
                        sx={{
                          mt: 0.35,

                          color:
                            tokens
                              .colors
                              .status
                              .success,

                          fontSize:
                            10.5,

                          fontWeight:
                            700,
                        }}
                      >
                        Recovered{" "}
                        {formatDateTime(
                          event.resolvedAt,
                        )}
                      </Typography>
                    ) : null}
                  </Box>

                  <Chip
                    size="small"

                    label={
                      open
                        ? "Open"
                        : "Resolved"
                    }

                    sx={{
                      color: open
                        ? tokens
                            .colors
                            .status
                            .danger
                        : tokens
                            .colors
                            .status
                            .success,

                      bgcolor: open
                        ? tokens
                            .alpha
                            .danger10
                        : tokens
                            .alpha
                            .success10,
                    }}
                  />
                </Box>

                {index <
                events.length -
                  1 ? (
                  <Divider />
                ) : null}
              </Box>
            );
          },
        )}
      </Box>
    </Paper>
  );
}
