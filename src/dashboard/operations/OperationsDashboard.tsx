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
  ArrowForwardRounded,
  BadgeRounded,
  CheckCircleRounded,
  DirectionsBusRounded,
  MapRounded,
  NotificationsRounded,
  PersonRounded,
  RadioButtonUncheckedRounded,
  RocketLaunchRounded,
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

import { roleLabel } from "../dashboard.utils";

import { useOperationsDashboardData } from "./useOperationsDashboardData";

function greetingLabel(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

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

  const setupSteps = [
    {
      label: "School configured",

      complete: (data?.schools.length ?? 0) > 0,
    },

    {
      label: "Add vehicles",

      complete: (fleet?.total ?? 0) > 0,
    },

    {
      label: "Add drivers",

      complete: (data?.activeDriversTotal ?? 0) > 0,
    },

    {
      label: "Add students",

      complete: (data?.activeStudentsTotal ?? 0) > 0,
    },

    {
      label: "Create routes",

      complete: (data?.activeRoutesTotal ?? 0) > 0,
    },
  ];

  const completedSetupSteps = setupSteps.filter((step) => step.complete).length;

  const setupProgress = Math.round(
    (completedSetupSteps / setupSteps.length) * 100,
  );

  const quickActions = [
    {
      label: "Vehicles",

      detail: "Manage fleet",

      path: "/vehicles",

      icon: <DirectionsBusRounded />,
    },

    {
      label: "Drivers",

      detail: "Manage drivers",

      path: "/drivers",

      icon: <BadgeRounded />,
    },

    {
      label: "Students",

      detail: "Manage students",

      path: "/students",

      icon: <SchoolRounded />,
    },

    {
      label: "Routes",

      detail: "Build routes",

      path: "/routes",

      icon: <RouteRounded />,
    },
  ];

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
          COMMAND CENTRE HERO
          ================================================== */}

      <Paper
        elevation={0}
        sx={{
          position: "relative",

          overflow: "hidden",

          px: {
            xs: 3,
            md: 4,
          },

          py: {
            xs: 3,
            md: 4,
          },

          mb: 2.5,

          color: "common.white",

          border: "1px solid",

          borderColor: "rgba(255,255,255,0.08)",

          background:
            "linear-gradient(125deg, #101828 0%, #163B43 58%, #0F766E 100%)",

          "&::before": {
            content: '""',

            position: "absolute",

            width: 280,

            height: 280,

            right: -90,

            top: -140,

            borderRadius: "50%",

            background: "rgba(255,255,255,0.07)",
          },

          "&::after": {
            content: '""',

            position: "absolute",

            width: 180,

            height: 180,

            right: 110,

            bottom: -140,

            borderRadius: "50%",

            background: "rgba(201,165,92,0.15)",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",

            zIndex: 1,

            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",

              lg: "minmax(0,1fr) auto",
            },

            gap: 3,

            alignItems: "center",
          }}
        >
          <Box>
            <Box
              sx={{
                display: "flex",

                flexWrap: "wrap",

                gap: 1,
              }}
            >
              <Chip
                size="small"

                label={
                  managerMode ? "Transport Operations" : roleLabel(tenant?.role)
                }

                sx={{
                  color: "common.white",

                  bgcolor: "rgba(255,255,255,0.12)",

                  fontWeight: 750,
                }}
              />

              <Chip
                size="small"

                label="Live operations"

                sx={{
                  color: "#A7F3D0",

                  bgcolor: "rgba(16,185,129,0.14)",

                  fontWeight: 750,
                }}
              />
            </Box>

            <Typography
              sx={{
                mt: 2.25,

                color: "rgba(255,255,255,0.78)",

                fontSize: 12,

                fontWeight: 700,

                letterSpacing: "0.02em",
              }}
            >
              {greetingLabel()}
            </Typography>

            <Typography
              component="h1"
              sx={{
                mt: 0.35,

                maxWidth: 720,

                fontSize: {
                  xs: 30,

                  md: 42,
                },

                fontWeight: 900,

                lineHeight: 1.04,

                letterSpacing: "-0.045em",
              }}
            >
              Keep every school journey visible, safe and on time.
            </Typography>

            <Typography
              sx={{
                mt: 1.5,

                maxWidth: 650,

                color: "rgba(255,255,255,0.68)",

                fontSize: 13,

                lineHeight: 1.7,
              }}
            >
              {user?.email}
              {" · "}
              Your live command centre for trips, fleet readiness, people and
              operational safety.
            </Typography>

            <Box
              sx={{
                mt: 3,

                display: "flex",

                flexWrap: "wrap",

                gap: 1.25,
              }}
            >
              <Button
                variant="contained"

                onClick={() => navigate("/tracking")}

                startIcon={<MapRounded />}

                sx={{
                  bgcolor: "common.white",

                  color: "#101828",

                  "&:hover": {
                    bgcolor: "#F2F4F7",
                  },
                }}
              >
                Open live tracking
              </Button>

              <Button
                variant="outlined"

                onClick={() => {
                  document
                    .getElementById("operational-safety")
                    ?.scrollIntoView({
                      behavior: "smooth",

                      block: "start",
                    });
                }}

                startIcon={<NotificationsRounded />}

                sx={{
                  color: "common.white",

                  borderColor: "rgba(255,255,255,0.28)",

                  "&:hover": {
                    borderColor: "rgba(255,255,255,0.6)",

                    bgcolor: "rgba(255,255,255,0.06)",
                  },
                }}
              >
                Safety alerts
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              display: {
                xs: "none",

                lg: "grid",
              },

              placeItems: "center",

              width: 150,

              height: 150,

              borderRadius: "32px",

              bgcolor: "rgba(255,255,255,0.08)",

              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <DirectionsBusRounded
              sx={{
                fontSize: 76,

                color: "rgba(255,255,255,0.92)",
              }}
            />
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
          GETTING STARTED + QUICK ACTIONS
          ================================================== */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            xl: "minmax(0, 1.05fr) minmax(360px, 0.95fr)",
          },

          gap: 2,

          mb: 2.5,
        }}
      >
        {/* ==================================================
            GETTING STARTED
            ================================================== */}

        <Paper
          elevation={0}
          sx={{
            p: 3,

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",

              alignItems: "flex-start",

              justifyContent: "space-between",

              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",

                gap: 1.5,

                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  width: 42,

                  height: 42,

                  display: "grid",

                  placeItems: "center",

                  borderRadius: 2,

                  bgcolor: "rgba(15,118,110,0.10)",

                  color: "#0F766E",
                }}
              >
                <RocketLaunchRounded />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 16,

                    fontWeight: 850,
                  }}
                >
                  Getting started
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,

                    color: "text.secondary",

                    fontSize: 11.5,
                  }}
                >
                  Build the essentials for your transport operation.
                </Typography>
              </Box>
            </Box>

            <Chip
              size="small"

              label={`${completedSetupSteps}/${setupSteps.length}`}

              sx={{
                fontWeight: 800,

                color: setupProgress === 100 ? "success.main" : "primary.main",
              }}
            />
          </Box>

          <Box
            sx={{
              mt: 3,
            }}
          >
            <Box
              sx={{
                display: "flex",

                alignItems: "center",

                justifyContent: "space-between",

                mb: 0.75,
              }}
            >
              <Typography
                sx={{
                  color: "text.secondary",

                  fontSize: 10.5,

                  fontWeight: 700,
                }}
              >
                SETUP PROGRESS
              </Typography>

              <Typography
                sx={{
                  fontSize: 11,

                  fontWeight: 850,
                }}
              >
                {setupProgress}%
              </Typography>
            </Box>

            <LinearProgress
              variant="determinate"

              value={
                operations.isLoading || fleetSummary.isLoading
                  ? 0
                  : setupProgress
              }

              sx={{
                height: 7,

                borderRadius: 20,

                bgcolor: "action.hover",

                "& .MuiLinearProgress-bar": {
                  borderRadius: 20,

                  bgcolor: "#0F766E",
                },
              }}
            />
          </Box>

          <Box
            sx={{
              mt: 2.5,

              display: "grid",

              gap: 1.25,
            }}
          >
            {setupSteps.map((step) => (
              <Box
                key={step.label}
                sx={{
                  display: "flex",

                  alignItems: "center",

                  gap: 1.25,

                  minHeight: 30,
                }}
              >
                {step.complete ? (
                  <CheckCircleRounded
                    sx={{
                      fontSize: 20,

                      color: "success.main",
                    }}
                  />
                ) : (
                  <RadioButtonUncheckedRounded
                    sx={{
                      fontSize: 20,

                      color: "text.disabled",
                    }}
                  />
                )}

                <Typography
                  sx={{
                    color: step.complete ? "text.primary" : "text.secondary",

                    fontSize: 12.5,

                    fontWeight: step.complete ? 750 : 600,
                  }}
                >
                  {step.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {setupProgress === 100 ? (
            <Box
              sx={{
                mt: 2.5,

                p: 1.5,

                borderRadius: 2,

                bgcolor: "rgba(16,185,129,0.08)",
              }}
            >
              <Typography
                sx={{
                  color: "success.main",

                  fontSize: 11.5,

                  fontWeight: 750,
                }}
              >
                Core transport setup is ready for operations.
              </Typography>
            </Box>
          ) : null}
        </Paper>

        {/* ==================================================
            QUICK ACTIONS + SCHOOLS
            ================================================== */}

        <Paper
          elevation={0}
          sx={{
            p: 3,

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <SectionHeader
            title="Quick actions"
            subtitle="Jump straight into the work that matters"
          />

          <Box
            sx={{
              mt: 2,

              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                sm: "repeat(2, minmax(0, 1fr))",
              },

              gap: 1.25,
            }}
          >
            {quickActions.map((action) => (
              <Button
                key={action.path}

                variant="outlined"

                onClick={() => navigate(action.path)}

                sx={{
                  minHeight: 68,

                  justifyContent: "space-between",

                  px: 1.75,

                  textAlign: "left",

                  borderColor: "divider",

                  color: "text.primary",
                }}
              >
                <Box
                  sx={{
                    display: "flex",

                    alignItems: "center",

                    gap: 1.25,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",

                      color: "primary.main",
                    }}
                  >
                    {action.icon}
                  </Box>

                  <Box>
                    <Typography
                      component="span"
                      sx={{
                        display: "block",

                        color: "text.primary",

                        fontSize: 12,

                        fontWeight: 800,

                        textTransform: "none",
                      }}
                    >
                      {action.label}
                    </Typography>

                    <Typography
                      component="span"
                      sx={{
                        display: "block",

                        mt: 0.15,

                        color: "text.secondary",

                        fontSize: 9.5,

                        textTransform: "none",
                      }}
                    >
                      {action.detail}
                    </Typography>
                  </Box>
                </Box>

                <ArrowForwardRounded
                  sx={{
                    fontSize: 17,

                    color: "text.disabled",
                  }}
                />
              </Button>
            ))}
          </Box>

          <Divider
            sx={{
              my: 2.5,
            }}
          />

          <Box
            sx={{
              display: "flex",

              justifyContent: "space-between",

              alignItems: "center",

              gap: 2,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 13,

                  fontWeight: 850,
                }}
              >
                Your schools
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,

                  color: "text.secondary",

                  fontSize: 10.5,
                }}
              >
                Active schools in this organisation
              </Typography>
            </Box>

            <Chip
              size="small"

              icon={<SchoolRounded />}

              label={`${data?.schools.length ?? 0} active`}

              variant="outlined"
            />
          </Box>

          <Box
            sx={{
              mt: 1.75,

              display: "grid",

              gap: 1,
            }}
          >
            {(data?.schools ?? []).slice(0, 3).map((school) => (
              <Box
                key={school.id}

                sx={{
                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  gap: 2,

                  p: 1.25,

                  borderRadius: 1.5,

                  bgcolor: "action.hover",
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 11.5,

                      fontWeight: 800,
                    }}
                  >
                    {school.name}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.1,

                      color: "text.secondary",

                      fontSize: 9.5,
                    }}
                  >
                    {school.code}
                    {school.address ? ` · ${school.address}` : ""}
                  </Typography>
                </Box>

                <Chip
                  size="small"

                  label="Active"

                  sx={{
                    height: 22,

                    color: "success.main",

                    bgcolor: "rgba(16,185,129,0.08)",

                    fontSize: 9,
                  }}
                />
              </Box>
            ))}

            {(data?.schools.length ?? 0) > 3 ? (
              <Typography
                sx={{
                  pt: 0.5,

                  color: "text.secondary",

                  fontSize: 10.5,

                  textAlign: "center",
                }}
              >
                +{(data?.schools.length ?? 0) - 3} more schools
              </Typography>
            ) : null}

            {!operations.isLoading &&
            !operations.isError &&
            (data?.schools.length ?? 0) === 0 ? (
              <Typography
                sx={{
                  py: 2,

                  color: "text.secondary",

                  fontSize: 11.5,

                  textAlign: "center",
                }}
              >
                No active schools are available.
              </Typography>
            ) : null}
          </Box>
        </Paper>
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
