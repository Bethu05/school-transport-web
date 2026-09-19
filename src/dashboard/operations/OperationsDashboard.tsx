import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";

import {
  BadgeRounded,
  DirectionsBusRounded,
  MapRounded,
  NotificationsRounded,
  PersonRounded,
  RouteRounded,
  SchoolRounded,
  ScheduleRounded,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";

import { OperationalSafetyPanel } from "../../operational-safety/OperationalSafetyPanel";

import { tokens } from "../../theme/tokens";

import { useFleetSummary } from "../../vehicles/useFleetSummary";

import { MetricCard, type Metric } from "../components/MetricCard";

import { SectionHeader } from "../components/SectionHeader";

import { useOperationsDashboardData } from "./useOperationsDashboardData";

function metricValue(
  loading: boolean,
  error: boolean,
  value: number | undefined,
): string {
  if (loading) {
    return "—";
  }

  if (error) {
    return "!";
  }

  return String(value ?? 0).padStart(2, "0");
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

function tripStatusColor(status: string): string {
  switch (status) {
    case "in_progress":
      return tokens.colors.status.success;

    case "boarding":
      return tokens.colors.dashboard.vehiclesAccent;

    case "cancelled":
      return tokens.colors.status.danger;

    default:
      return tokens.colors.status.inactive;
  }
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

/**
 * Administrator / Owner / Transport Manager
 * operational command centre.
 *
 * Everything displayed here must either come from a live
 * backend API or clearly indicate that it is unavailable.
 */
export function OperationsDashboard({
  managerMode = false,
}: {
  managerMode?: boolean;
}) {
  const { user, tenant } = useAuth();

  const navigate = useNavigate();

  const fleetSummary = useFleetSummary(tenant?.tenantId);

  const operations = useOperationsDashboardData(tenant?.tenantId);

  const fleet = fleetSummary.data;

  const data = operations.data;

  const metrics: Metric[] = [
    {
      label: "Current Trips",

      value: metricValue(
        operations.isLoading,
        operations.isError,
        data?.currentTripsTotal,
      ),

      detail: operations.isError
        ? "Unable to load trip data"
        : "Trips currently in the operational lifecycle",

      accent: "#2563EB",

      icon: <RouteRounded />,

      source: operations.isError ? "preview" : "live",

      path: "/trips",
    },

    {
      label: "Active Vehicles",

      value: metricValue(
        fleetSummary.isLoading,
        fleetSummary.isError,
        fleet?.active,
      ),

      detail: fleetSummary.isError
        ? "Unable to load fleet data"
        : `${fleet?.active ?? 0} of ${fleet?.total ?? 0} fleet vehicles active`,

      accent: "#0F766E",

      icon: <DirectionsBusRounded />,

      source: fleetSummary.isError ? "preview" : "live",

      path: "/vehicles",
    },

    {
      label: "Active Drivers",

      value: metricValue(
        operations.isLoading,
        operations.isError,
        data?.activeDriversTotal,
      ),

      detail: operations.isError
        ? "Unable to load driver data"
        : "Drivers currently marked active",

      accent: "#7C3AED",

      icon: <BadgeRounded />,

      source: operations.isError ? "preview" : "live",

      path: "/drivers",
    },

    {
      label: "Active Students",

      value: metricValue(
        operations.isLoading,
        operations.isError,
        data?.activeStudentsTotal,
      ),

      detail: operations.isError
        ? "Unable to load student data"
        : "Students currently active in the tenant",

      accent: "#0891B2",

      icon: <SchoolRounded />,

      source: operations.isError ? "preview" : "live",

      path: "/students",
    },
  ];

  const availabilityPercent =
    fleetSummary.isLoading || fleetSummary.isError
      ? 0
      : (fleet?.availabilityPercent ?? 0);

  return (
    <Box>
      {/* ==================================================
          COMMAND CENTRE HEADER
          ================================================== */}

      <Paper
        elevation={0}
        sx={{
          px: {
            xs: 2.5,
            md: 3,
          },

          py: {
            xs: 2,
            md: 2.25,
          },

          mb: 2,

          border: "1px solid",
          borderColor: "divider",

          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            display: "flex",

            flexDirection: {
              xs: "column",
              md: "row",
            },

            alignItems: {
              xs: "flex-start",
              md: "center",
            },

            justifyContent: "space-between",

            gap: 2,
          }}
        >
          <Box>
            <Chip
              size="small"

              label={
                managerMode
                  ? "Transport Operations"
                  : "Operations Command Centre"
              }

              sx={{
                color: "#0F766E",
                bgcolor: "rgba(15,118,110,0.08)",
                fontWeight: 700,
              }}
            />

            <Typography
              component="h1"
              sx={{
                mt: 1,

                fontSize: {
                  xs: 25,
                  md: 30,
                },

                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
              }}
            >
              Operations overview
            </Typography>

            <Typography
              sx={{
                mt: 0.5,

                color: "text.secondary",
                fontSize: 12.5,
              }}
            >
              {user?.email}
              {" · "}
              Live transport activity, fleet readiness and safety alerts.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 1.25,
              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"

              onClick={() => {
                document.getElementById("operational-safety")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}

              startIcon={<NotificationsRounded />}
            >
              Alerts
            </Button>

            <Button
              variant="contained"

              onClick={() => navigate("/tracking")}

              startIcon={<MapRounded />}
            >
              Live tracking
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ==================================================
          LIVE KPI GRID
          ================================================== */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(4, minmax(0, 1fr))",
          },

          gap: 2,
          mb: 2.5,
        }}
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </Box>

      {/* ==================================================
          OPERATIONAL SAFETY
          ================================================== */}

      <Box sx={{ mb: 2.5 }}>
        <OperationalSafetyPanel />
      </Box>

      {/* ==================================================
          CURRENT TRIPS + FLEET READINESS
          ================================================== */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 1.6fr) minmax(320px, 0.8fr)",
          },

          gap: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,

            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <SectionHeader
            title="Current Trips"
            subtitle="Live trips in the active operational lifecycle"
            action={
              <Button size="small" onClick={() => navigate("/trips")}>
                View trips
              </Button>
            }
          />

          {operations.isLoading ? (
            <Box
              sx={{
                minHeight: 160,
                display: "grid",
                placeItems: "center",
              }}
            >
              <CircularProgress size={26} />
            </Box>
          ) : null}

          {operations.isError ? (
            <Typography
              sx={{
                py: 4,
                color: "error.main",
                fontSize: 13,
              }}
            >
              Current trips could not be loaded.
            </Typography>
          ) : null}

          {!operations.isLoading &&
          !operations.isError &&
          (data?.currentTrips.length ?? 0) === 0 ? (
            <Box
              sx={{
                py: 5,
                textAlign: "center",
              }}
            >
              <ScheduleRounded
                sx={{
                  fontSize: 34,
                  color: "text.disabled",
                }}
              />

              <Typography
                sx={{
                  mt: 1,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                No current trips
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  color: "text.secondary",
                  fontSize: 11.5,
                }}
              >
                Scheduled and active trips will appear here.
              </Typography>
            </Box>
          ) : null}

          {(data?.currentTrips ?? []).map((trip, index) => (
            <Box key={trip.id}>
              <Box
                sx={{
                  py: 1.75,

                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(180px,1.3fr) minmax(130px,0.8fr) minmax(120px,0.8fr) 80px 110px",
                  },

                  alignItems: "center",

                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {trip.routeName}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,
                      color: "text.secondary",
                      fontSize: 10.5,
                    }}
                  >
                    {trip.vehicleRegistrationNumber ?? "Vehicle unassigned"}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                  }}
                >
                  <PersonRounded
                    sx={{
                      fontSize: 16,
                      color: "text.secondary",
                    }}
                  />

                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 11.5,
                    }}
                  >
                    {trip.driverName ?? "Driver unassigned"}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 11.5,
                  }}
                >
                  {trip.stopCount} stops
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  {formatTime(trip.scheduledStartAt)}
                </Typography>

                <Chip
                  size="small"

                  label={tripStatusLabel(trip.status)}

                  sx={{
                    justifySelf: {
                      md: "end",
                    },

                    color: tripStatusColor(trip.status),

                    bgcolor: `${tripStatusColor(trip.status)}12`,

                    fontWeight: 700,
                  }}
                />
              </Box>

              {index < (data?.currentTrips.length ?? 0) - 1 ? (
                <Divider />
              ) : null}
            </Box>
          ))}
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,

            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <SectionHeader
            title="Fleet Readiness"
            subtitle="Current vehicle availability"
          />

          {fleetSummary.isLoading ? (
            <Box
              sx={{
                minHeight: 140,
                display: "grid",
                placeItems: "center",
              }}
            >
              <CircularProgress size={26} />
            </Box>
          ) : null}

          {fleetSummary.isError ? (
            <Typography
              sx={{
                py: 4,
                color: "error.main",
                fontSize: 13,
              }}
            >
              Fleet readiness could not be loaded.
            </Typography>
          ) : null}

          {!fleetSummary.isLoading && !fleetSummary.isError ? (
            <>
              <Box
                sx={{
                  display: "flex",

                  justifyContent: "space-between",
                  alignItems: "center",

                  mb: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  Vehicle availability
                </Typography>

                <Typography
                  sx={{
                    color: "#0F766E",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {availabilityPercent}%
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={availabilityPercent}

                sx={{
                  height: 7,
                  borderRadius: 10,

                  bgcolor: "action.hover",

                  "& .MuiLinearProgress-bar": {
                    borderRadius: 10,
                    bgcolor: "#0F766E",
                  },
                }}
              />

              <Box
                sx={{
                  display: "grid",
                  gap: 1.4,
                  mt: 3,
                }}
              >
                {[
                  ["Active", fleet?.active ?? 0, tokens.colors.status.success],
                  [
                    "Maintenance",
                    fleet?.maintenance ?? 0,
                    tokens.colors.status.warning,
                  ],
                  [
                    "Inactive",
                    fleet?.inactive ?? 0,
                    tokens.colors.status.inactive,
                  ],
                  ["Retired", fleet?.retired ?? 0, tokens.colors.status.muted],
                ].map(([label, value, color]) => (
                  <Box
                    key={String(label)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,

                          borderRadius: "50%",
                          bgcolor: String(color),
                        }}
                      />

                      <Typography
                        sx={{
                          color: "text.secondary",
                          fontSize: 12,
                        }}
                      >
                        {String(label)}
                      </Typography>
                    </Box>

                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {String(value)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 3 }} />

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate("/vehicles")}
              >
                Manage fleet
              </Button>
            </>
          ) : null}
        </Paper>
      </Box>
    </Box>
  );
}
