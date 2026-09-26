import { useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";

import {
  CheckCircleRounded,
  ChecklistRounded,
  DirectionsBusRounded,
  PersonOffRounded,
  PersonRounded,
  PlaceRounded,
  ScheduleRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthProvider";

import {
  boardStaffPassenger,
  getMyStaffTripManifest,
  markStaffPassengerNoShow,
  type StaffPassengerStatus,
  type StaffTripPassenger,
} from "./staff-passengers.api";

import {
  approveMyStaffStartAuthorization,
  getMyStaffStartAuthorization,
  rejectMyStaffStartAuthorization,
} from "./staff-start-authorization.api";

type PassengerAction = "board" | "no-show";

interface PassengerActionInput {
  riderId: string;

  tripStopId: string;

  action: PassengerAction;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The passenger register could not be updated.";
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",

    timeStyle: "short",
  }).format(date);
}

function statusLabel(status: StaffPassengerStatus): string {
  switch (status) {
    case "waiting":
      return "Expected";

    case "boarded":
      return "On board";

    case "no_show":
      return "Missed";

    case "dropped_off":
      return "Alighted";
  }
}

function statusColor(
  status: StaffPassengerStatus,
): "default" | "success" | "warning" | "info" {
  switch (status) {
    case "waiting":
      return "default";

    case "boarded":
      return "success";

    case "no_show":
      return "warning";

    case "dropped_off":
      return "info";
  }
}

function idempotencyKey(action: PassengerAction, riderId: string): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `staff-${action}-${riderId}-${suffix}`;
}

interface StopGroup {
  stopId: string;

  stopName: string;

  stopOrder: number;

  passengers: StaffTripPassenger[];
}

export function StaffDashboard() {
  const { tenant, user } = useAuth();

  const queryClient = useQueryClient();

  const tenantId = tenant?.tenantId;

  const [mutationError, setMutationError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const manifestQuery = useQuery({
    queryKey: ["staff-trip-manifest", tenantId],

    enabled: Boolean(tenantId),

    refetchInterval: 5_000,

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return getMyStaffTripManifest(tenantId);
    },
  });

  const eventMutation = useMutation({
    mutationFn: async ({
      riderId,
      tripStopId,
      action,
    }: PassengerActionInput) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      const key = idempotencyKey(action, riderId);

      if (action === "board") {
        return boardStaffPassenger(tenantId, riderId, tripStopId, key);
      }

      return markStaffPassengerNoShow(tenantId, riderId, tripStopId, key);
    },

    onSuccess: async (event) => {
      setMutationError(null);

      setSuccessMessage(
        event.eventType === "boarded"
          ? "Student marked as boarded."
          : "Student marked as missed.",
      );

      await queryClient.invalidateQueries({
        queryKey: ["staff-trip-manifest", tenantId],
      });
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  const manifest = manifestQuery.data;

  const canAuthorizeStart =
    manifest?.staffRole === "chaperone" && manifest.tripStatus === "boarding";

  const startAuthorizationQuery = useQuery({
    queryKey: ["staff-start-authorization", tenantId, manifest?.tripId],

    enabled: Boolean(tenantId && canAuthorizeStart),

    refetchInterval: 3_000,

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return getMyStaffStartAuthorization(tenantId);
    },
  });

  const startAuthorizationMutation = useMutation({
    mutationFn: async (action: "approve" | "reject") => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      if (action === "approve") {
        return approveMyStaffStartAuthorization(tenantId);
      }

      return rejectMyStaffStartAuthorization(tenantId);
    },

    onSuccess: async (_authorization, action) => {
      setMutationError(null);

      setSuccessMessage(
        action === "approve"
          ? "Trip start approved."
          : "Trip start request rejected.",
      );

      await queryClient.invalidateQueries({
        queryKey: ["staff-start-authorization", tenantId],
      });
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  const startAuthorization = startAuthorizationQuery.data;

  const groups = useMemo<StopGroup[]>(() => {
    if (!manifest) {
      return [];
    }

    const grouped = new Map<string, StopGroup>();

    for (const passenger of manifest.passengers) {
      const existing = grouped.get(passenger.assignedTripStopId);

      if (existing) {
        existing.passengers.push(passenger);

        continue;
      }

      grouped.set(passenger.assignedTripStopId, {
        stopId: passenger.assignedTripStopId,

        stopName: passenger.assignedStopName,

        stopOrder: passenger.assignedStopOrder,

        passengers: [passenger],
      });
    }

    return [...grouped.values()].sort(
      (first, second) => first.stopOrder - second.stopOrder,
    );
  }, [manifest]);

  const summary = useMemo(() => {
    const passengers = manifest?.passengers ?? [];

    return {
      expected: passengers.length,

      waiting: passengers.filter((passenger) => passenger.status === "waiting")
        .length,

      boarded: passengers.filter((passenger) => passenger.status === "boarded")
        .length,

      missed: passengers.filter((passenger) => passenger.status === "no_show")
        .length,

      alighted: passengers.filter(
        (passenger) => passenger.status === "dropped_off",
      ).length,
    };
  }, [manifest]);

  if (!tenantId) {
    return <Alert severity="info">No active tenant is available.</Alert>;
  }

  if (manifestQuery.isLoading) {
    return (
      <Box
        sx={{
          py: 8,

          display: "grid",

          placeItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (manifestQuery.isError) {
    return <Alert severity="error">{errorMessage(manifestQuery.error)}</Alert>;
  }

  if (!manifest) {
    return (
      <Box>
        <Typography
          component="h1"
          sx={{
            fontSize: 26,

            fontWeight: 850,

            letterSpacing: "-0.03em",
          }}
        >
          Onboard Register
        </Typography>

        <Alert
          severity="info"
          sx={{
            mt: 2,
          }}
        >
          You do not currently have an active trip assignment.
        </Alert>
      </Box>
    );
  }

  const staffTitle = manifest.staffRole === "teacher" ? "Teacher" : "Chaperone";

  return (
    <Box>
      <Box
        sx={{
          mb: 3,

          display: "flex",

          alignItems: {
            xs: "stretch",

            md: "center",
          },

          justifyContent: "space-between",

          flexDirection: {
            xs: "column",

            md: "row",
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
            Onboard Register
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",

              fontSize: 13,
            }}
          >
            {staffTitle} register for the assigned journey.
          </Typography>
        </Box>

        <Chip
          icon={<ChecklistRounded />}
          label={`${summary.boarded} / ${summary.expected} boarded`}
          color={
            summary.expected > 0 && summary.boarded === summary.expected
              ? "success"
              : "default"
          }
        />
      </Box>

      {mutationError ? (
        <Alert
          severity="error"
          sx={{
            mb: 2,
          }}
          onClose={() => setMutationError(null)}
        >
          {mutationError}
        </Alert>
      ) : null}

      {manifest.staffRole === "chaperone" &&
      manifest.tripStatus === "boarding" ? (
        <Paper
          elevation={0}
          sx={{
            mb: 2,
            p: 2.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 850,
            }}
          >
            Trip start approval
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color: "text.secondary",
              fontSize: 12.5,
            }}
          >
            The assigned onboard Chaperone may approve or reject the Driver
            start request for this trip.
          </Typography>

          {startAuthorizationQuery.isLoading ? (
            <Box
              sx={{
                mt: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <CircularProgress size={18} />

              <Typography
                sx={{
                  fontSize: 12.5,
                  color: "text.secondary",
                }}
              >
                Checking for a Driver start request...
              </Typography>
            </Box>
          ) : null}

          {!startAuthorizationQuery.isLoading && !startAuthorization ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Waiting for the Driver to request trip start approval.
            </Alert>
          ) : null}

          {startAuthorization?.status === "pending" ? (
            <Box sx={{ mt: 2 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                The Driver is requesting approval to start this trip.
              </Alert>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleRounded />}
                  disabled={startAuthorizationMutation.isPending}
                  onClick={() => startAuthorizationMutation.mutate("approve")}
                >
                  {startAuthorizationMutation.isPending
                    ? "Updating..."
                    : "Approve start"}
                </Button>

                <Button
                  variant="outlined"
                  color="error"
                  disabled={startAuthorizationMutation.isPending}
                  onClick={() => startAuthorizationMutation.mutate("reject")}
                >
                  Reject
                </Button>
              </Box>
            </Box>
          ) : null}

          {startAuthorization?.status === "approved" ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Trip start approved. Waiting for the Driver to start the trip.
            </Alert>
          ) : null}

          {startAuthorization?.status === "rejected" ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              The previous request was rejected. Waiting for a new Driver
              request.
            </Alert>
          ) : null}

          {startAuthorizationQuery.isError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              Could not load the current trip start request.
            </Alert>
          ) : null}
        </Paper>
      ) : null}

      <Paper
        elevation={0}
        sx={{
          mb: 2,

          p: 2.5,

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",

              sm: "repeat(2, minmax(0, 1fr))",

              lg: "repeat(4, minmax(0, 1fr))",
            },

            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 11,
              }}
            >
              Route
            </Typography>

            <Typography
              sx={{
                mt: 0.25,

                fontWeight: 750,

                fontSize: 14,
              }}
            >
              {manifest.routeName}
            </Typography>
          </Box>

          <Box>
            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 11,
              }}
            >
              Vehicle
            </Typography>

            <Typography
              sx={{
                mt: 0.25,

                fontWeight: 750,

                fontSize: 14,
              }}
            >
              {manifest.vehicleRegistrationNumber ?? "Not assigned"}
            </Typography>
          </Box>

          <Box>
            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 11,
              }}
            >
              Driver
            </Typography>

            <Typography
              sx={{
                mt: 0.25,

                fontWeight: 750,

                fontSize: 14,
              }}
            >
              {manifest.driverName ?? "Not assigned"}
            </Typography>
          </Box>

          <Box>
            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 11,
              }}
            >
              Start
            </Typography>

            <Typography
              sx={{
                mt: 0.25,

                fontWeight: 750,

                fontSize: 14,
              }}
            >
              {formatDateTime(manifest.scheduledStartAt)}
            </Typography>
          </Box>
        </Box>

        <Divider
          sx={{
            my: 2,
          }}
        />

        <Box
          sx={{
            display: "flex",

            flexWrap: "wrap",

            gap: 1,
          }}
        >
          <Chip
            size="small"
            icon={<PersonRounded />}
            label={`Expected ${summary.expected}`}
          />

          <Chip
            size="small"
            icon={<ScheduleRounded />}
            label={`Waiting ${summary.waiting}`}
          />

          <Chip
            size="small"
            color="success"
            icon={<CheckCircleRounded />}
            label={`Boarded ${summary.boarded}`}
          />

          <Chip
            size="small"
            color="warning"
            icon={<PersonOffRounded />}
            label={`Missed ${summary.missed}`}
          />

          {summary.alighted > 0 ? (
            <Chip
              size="small"
              color="info"
              label={`Alighted ${summary.alighted}`}
            />
          ) : null}
        </Box>
      </Paper>

      <Alert
        severity="info"
        sx={{
          mb: 2,
        }}
      >
        The Driver controls the journey. The onboard {staffTitle.toLowerCase()}{" "}
        controls the passenger register.
      </Alert>

      {groups.length === 0 ? (
        <Alert severity="warning">
          No students are currently assigned to this trip.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",

            gap: 2,
          }}
        >
          {groups.map((group) => (
            <Paper
              key={group.stopId}
              elevation={0}
              sx={{
                border: "1px solid",

                borderColor: "divider",

                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  p: 2,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  gap: 2,

                  bgcolor: "action.hover",
                }}
              >
                <Box
                  sx={{
                    display: "flex",

                    alignItems: "center",

                    gap: 1,
                  }}
                >
                  <PlaceRounded fontSize="small" color="primary" />

                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 800,

                        fontSize: 14,
                      }}
                    >
                      {group.stopName}
                    </Typography>

                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 10.5,
                      }}
                    >
                      Stop {group.stopOrder}
                    </Typography>
                  </Box>
                </Box>

                <Chip
                  size="small"
                  label={`${group.passengers.length} expected`}
                />
              </Box>

              {group.passengers.map((passenger, index) => {
                const pending =
                  eventMutation.isPending &&
                  eventMutation.variables?.riderId === passenger.riderId;

                const canRecordPickup =
                  passenger.assignmentType === "pickup" &&
                  passenger.status === "waiting";

                return (
                  <Box
                    key={passenger.riderId}
                    sx={{
                      p: 2,

                      display: "flex",

                      alignItems: {
                        xs: "stretch",

                        sm: "center",
                      },

                      justifyContent: "space-between",

                      flexDirection: {
                        xs: "column",

                        sm: "row",
                      },

                      gap: 1.5,

                      borderBottom:
                        index === group.passengers.length - 1
                          ? "none"
                          : "1px solid",

                      borderColor: "divider",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",

                        alignItems: "center",

                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 38,

                          height: 38,

                          display: "grid",

                          placeItems: "center",

                          borderRadius: "50%",

                          bgcolor: "action.hover",
                        }}
                      >
                        <PersonRounded fontSize="small" />
                      </Box>

                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 750,

                            fontSize: 13.5,
                          }}
                        >
                          {passenger.studentFirstName}{" "}
                          {passenger.studentLastName}
                        </Typography>

                        <Box
                          sx={{
                            mt: 0.5,

                            display: "flex",

                            alignItems: "center",

                            flexWrap: "wrap",

                            gap: 0.75,
                          }}
                        >
                          <Chip
                            size="small"
                            color={statusColor(passenger.status)}
                            label={statusLabel(passenger.status)}
                          />

                          {passenger.studentExternalRef ? (
                            <Typography
                              sx={{
                                color: "text.secondary",

                                fontSize: 10.5,
                              }}
                            >
                              {passenger.studentExternalRef}
                            </Typography>
                          ) : null}
                        </Box>
                      </Box>
                    </Box>

                    {canRecordPickup ? (
                      <Box
                        sx={{
                          display: "flex",

                          gap: 1,

                          flexShrink: 0,
                        }}
                      >
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={pending}
                          startIcon={
                            pending ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <CheckCircleRounded />
                            )
                          }
                          onClick={() =>
                            eventMutation.mutate({
                              riderId: passenger.riderId,

                              tripStopId: passenger.assignedTripStopId,

                              action: "board",
                            })
                          }
                        >
                          Boarded
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          disabled={pending}
                          startIcon={<PersonOffRounded />}
                          onClick={() =>
                            eventMutation.mutate({
                              riderId: passenger.riderId,

                              tripStopId: passenger.assignedTripStopId,

                              action: "no-show",
                            })
                          }
                        >
                          Missed
                        </Button>
                      </Box>
                    ) : passenger.assignmentType === "dropoff" &&
                      passenger.status === "waiting" ? (
                      <Typography
                        sx={{
                          color: "text.secondary",

                          fontSize: 11,
                        }}
                      >
                        Afternoon boarding workflow follows after the pickup
                        demo gate.
                      </Typography>
                    ) : null}
                  </Box>
                );
              })}
            </Paper>
          ))}
        </Box>
      )}

      <Paper
        elevation={0}
        sx={{
          mt: 2,

          p: 2,

          border: "1px solid",

          borderColor: "divider",
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
              fontWeight: 750,

              fontSize: 12.5,
            }}
          >
            Logged in as {user?.email ?? staffTitle}
          </Typography>
        </Box>

        <Typography
          sx={{
            mt: 0.5,

            color: "text.secondary",

            fontSize: 11,
          }}
        >
          Passenger actions are restricted by your active onboard trip
          assignment.
        </Typography>
      </Paper>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  );
}
