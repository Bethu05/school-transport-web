import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Typography,
} from "@mui/material";

import {
  AccessTimeRounded,
  CheckCircleRounded,
  DirectionsBusRounded,
  FlagRounded,
  LoginRounded,
  PersonRounded,
  PlayArrowRounded,
  RouteRounded,
  SignpostRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../../auth/frontend-permissions";

import { DriverSafetyReportCard } from "./DriverSafetyReportCard";

import { DriverJourneyProgressCard } from "./DriverJourneyProgressCard";

import {
  beginMyBoarding,
  completeMyTrip,
  getMyAssignedTrip,
  getMyStartAuthorization,
  requestMyStartAuthorization,
  startMyTrip,
  type DriverAssignedTrip,
  type DriverTripStatus,
} from "./driver-me.api";

function statusLabel(status: DriverTripStatus): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";

    case "boarding":
      return "Boarding";

    case "in_progress":
      return "In progress";

    case "completed":
      return "Completed";
  }
}

function actionLabel(status: DriverTripStatus): string | null {
  switch (status) {
    case "scheduled":
      return "Begin boarding";

    case "boarding":
      return null;

    case "in_progress":
      return "Complete trip";

    case "completed":
      return null;
  }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.2,
        alignItems: "flex-start",
      }}
    >
      <Box
        sx={{
          color: "primary.main",
          display: "flex",
          mt: 0.2,
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: 10.5,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 700,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            mt: 0.3,
            fontSize: 14,
            fontWeight: 800,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export function DriverDashboard() {
  const { permissions, tenant, user } = useAuth();

  const queryClient = useQueryClient();

  const tenantId = tenant?.tenantId;

  const canReportAssignedTripIncident = hasFrontendPermission(
    permissions,

    FRONTEND_PERMISSIONS.INCIDENTS_REPORT_ASSIGNED_TRIP,
  );

  const tripQuery = useQuery({
    queryKey: ["my-driver-trip", tenantId],

    enabled: Boolean(tenantId),

    refetchInterval: 5_000,

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return getMyAssignedTrip(tenantId);
    },
  });

  const trip = tripQuery.data;

  const startAuthorizationQuery = useQuery({
    queryKey: ["my-driver-start-authorization", tenantId, trip?.id],

    enabled: Boolean(tenantId && trip?.status === "boarding"),

    refetchInterval: 3_000,

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return getMyStartAuthorization(tenantId);
    },
  });

  const authorizationStatus = startAuthorizationQuery.data?.status ?? null;

  const requestStartMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return requestMyStartAuthorization(tenantId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["my-driver-start-authorization", tenantId],
      });
    },
  });

  const lifecycle = useMutation({
    mutationFn: async (trip: DriverAssignedTrip) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      if (trip.status === "scheduled") {
        return beginMyBoarding(tenantId);
      }

      if (trip.status === "boarding") {
        if (authorizationStatus !== "approved") {
          throw new Error("Trip start has not been approved yet");
        }

        return startMyTrip(tenantId);
      }

      if (trip.status === "in_progress") {
        return completeMyTrip(tenantId);
      }

      return trip;
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["my-driver-trip", tenantId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["my-driver-journey-progress", tenantId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["my-driver-start-authorization", tenantId],
      });
    },
  });

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: {
            xs: 3,
            md: 4,
          },

          mb: 2.5,

          border: "1px solid",
          borderColor: "divider",

          background:
            "linear-gradient(135deg, rgba(201,165,92,0.14), transparent 70%)",
        }}
      >
        <Chip
          size="small"
          label="Driver Portal"
          sx={{
            color: "primary.main",
            bgcolor: "rgba(201,165,92,0.10)",
          }}
        />

        <Typography
          sx={{
            mt: 2,
            fontSize: {
              xs: 28,
              md: 38,
            },

            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          My assigned journey
        </Typography>

        <Typography
          sx={{
            mt: 1,
            color: "text.secondary",
            fontSize: 13,
          }}
        >
          {user?.email}
        </Typography>
      </Paper>

      {tripQuery.isLoading ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center",
          }}
        >
          <CircularProgress />
        </Paper>
      ) : null}

      {tripQuery.isError ? (
        <Alert severity="error">Could not load your assigned journey.</Alert>
      ) : null}

      {!tripQuery.isLoading && !tripQuery.isError && trip === null ? (
        <Paper
          elevation={0}
          sx={{
            p: 5,
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center",
          }}
        >
          <CheckCircleRounded
            sx={{
              fontSize: 44,
              color: "success.main",
            }}
          />

          <Typography
            sx={{
              mt: 1.5,
              fontSize: 18,
              fontWeight: 850,
            }}
          >
            No active journey assigned
          </Typography>
        </Paper>
      ) : null}

      {trip ? (
        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              lg: "1.4fr 0.7fr",
            },

            gap: 2.5,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: {
                xs: 3,
                md: 4,
              },

              border: "1px solid",
              borderColor: "divider",
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
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Assigned Driver
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 28,
                    fontWeight: 900,
                  }}
                >
                  {trip.driverName}
                </Typography>
              </Box>

              <Chip
                label={statusLabel(trip.status)}
                color={trip.status === "in_progress" ? "success" : "primary"}
              />
            </Box>

            <Divider
              sx={{
                my: 3,
              }}
            />

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Assigned Route
            </Typography>

            <Typography
              sx={{
                mt: 0.6,
                fontSize: 28,
                fontWeight: 900,
              }}
            >
              {trip.routeName}
            </Typography>

            <Box
              sx={{
                mt: 3,

                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                },

                gap: 2.5,
              }}
            >
              <Detail
                label="Vehicle"
                value={trip.vehicleRegistrationNumber ?? "Not assigned"}
                icon={<DirectionsBusRounded />}
              />

              <Detail
                label="Stops"
                value={`${trip.stopCount} stops`}
                icon={<SignpostRounded />}
              />

              <Detail
                label="Scheduled start"
                value={formatDate(trip.scheduledStartAt)}
                icon={<AccessTimeRounded />}
              />

              <Detail
                label="Scheduled end"
                value={formatDate(trip.scheduledEndAt)}
                icon={<AccessTimeRounded />}
              />
            </Box>

            {trip.status === "boarding" ? (
              <Box
                sx={{
                  mt: 4,
                }}
              >
                {authorizationStatus === "pending" ? (
                  <Alert
                    severity="info"
                    sx={{
                      mb: 2,
                    }}
                  >
                    Start requested. Waiting for approval.
                  </Alert>
                ) : null}

                {authorizationStatus === "approved" ? (
                  <Alert
                    severity="success"
                    sx={{
                      mb: 2,
                    }}
                  >
                    Start approved. You may now start the trip.
                  </Alert>
                ) : null}

                {authorizationStatus === "rejected" ? (
                  <Alert
                    severity="warning"
                    sx={{
                      mb: 2,
                    }}
                  >
                    Start request was rejected. You may request approval again.
                  </Alert>
                ) : null}

                {startAuthorizationQuery.isError ? (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 2,
                    }}
                  >
                    Could not check start approval.
                  </Alert>
                ) : null}

                {requestStartMutation.isError ? (
                  <Alert
                    severity="error"
                    sx={{
                      mb: 2,
                    }}
                  >
                    Could not request trip start approval.
                  </Alert>
                ) : null}

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowRounded />}
                  disabled={
                    lifecycle.isPending ||
                    requestStartMutation.isPending ||
                    startAuthorizationQuery.isFetching ||
                    authorizationStatus === "pending"
                  }
                  onClick={() => {
                    if (authorizationStatus === "approved") {
                      lifecycle.mutate(trip);

                      return;
                    }

                    requestStartMutation.mutate();
                  }}
                >
                  {requestStartMutation.isPending
                    ? "Requesting..."
                    : startAuthorizationQuery.isFetching
                      ? "Checking approval..."
                      : authorizationStatus === "approved"
                        ? "Start trip"
                        : authorizationStatus === "pending"
                          ? "Awaiting approval"
                          : authorizationStatus === "rejected"
                            ? "Request start again"
                            : "Request start"}
                </Button>
              </Box>
            ) : null}

            {actionLabel(trip.status) ? (
              <Button
                variant="contained"
                size="large"

                disabled={lifecycle.isPending}

                startIcon={
                  trip.status === "scheduled" ? (
                    <LoginRounded />
                  ) : trip.status === "boarding" ? (
                    <PlayArrowRounded />
                  ) : (
                    <FlagRounded />
                  )
                }

                onClick={() => lifecycle.mutate(trip)}

                sx={{
                  mt: 4,
                }}
              >
                {lifecycle.isPending ? "Updating..." : actionLabel(trip.status)}
              </Button>
            ) : null}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <PersonRounded
              sx={{
                fontSize: 30,
                color: "primary.main",
              }}
            />

            <Typography
              sx={{
                mt: 1.5,
                fontSize: 18,
                fontWeight: 850,
              }}
            >
              Assignment summary
            </Typography>

            <Divider
              sx={{
                my: 2.5,
              }}
            />

            <Detail
              label="Driver"
              value={trip.driverName}
              icon={<PersonRounded />}
            />

            <Box sx={{ mt: 2.5 }}>
              <Detail
                label="Route"
                value={trip.routeName}
                icon={<RouteRounded />}
              />
            </Box>

            <Box sx={{ mt: 2.5 }}>
              <Detail
                label="Vehicle"
                value={trip.vehicleRegistrationNumber ?? "Not assigned"}
                icon={<DirectionsBusRounded />}
              />
            </Box>

            <Box sx={{ mt: 2.5 }}>
              <Detail
                label="Status"
                value={statusLabel(trip.status)}
                icon={<CheckCircleRounded />}
              />
            </Box>
          </Paper>
        </Box>
      ) : null}

      <DriverJourneyProgressCard
        tenantId={tenantId}

        enabled={Boolean(trip)}
      />

      <DriverSafetyReportCard
        tenantId={tenantId}

        enabled={Boolean(trip && canReportAssignedTripIncident)}
      />
    </Box>
  );
}
