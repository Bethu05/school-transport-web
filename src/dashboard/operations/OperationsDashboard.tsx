import {
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";

import {
  AccessTimeRounded,
  ArrowForwardRounded,
  BadgeRounded,
  DirectionsBusRounded,
  LocationOnRounded,
  MapRounded,
  NavigationRounded,
  NotificationsRounded,
  PersonRounded,
  RouteRounded,
  SchoolRounded,
  WarningAmberRounded,
} from "@mui/icons-material";

import { useAuth } from "../../auth/AuthProvider";

import { useFleetSummary } from "../../vehicles/useFleetSummary";

import { MetricCard, type Metric } from "../components/MetricCard";

import { SectionHeader } from "../components/SectionHeader";

import { tokens } from "../../theme/tokens";

interface TripRow {
  route: string;

  vehicle: string;

  driver: string;

  time: string;

  status: "Active" | "Scheduled" | "Delayed";
}

interface IncidentRow {
  title: string;

  time: string;

  severity: "Low" | "Medium" | "High";
}

/**
 * Translate backend membership role names into
 * human-readable labels.
 */
function roleLabel(role?: string): string {
  switch (role) {
    case "owner":
      return "Owner";

    case "admin":
      return "Administrator";

    case "transport_manager":
      return "Transport Manager";

    case "driver":
      return "Driver";

    case "guardian":
      return "Parent";

    default:
      return "User";
  }
}

function statusColor(status: TripRow["status"]): string {
  switch (status) {
    case "Active":
      return tokens.colors.trip.active;

    case "Delayed":
      return tokens.colors.trip.delayed;

    default:
      return tokens.colors.brand.champagneGold;
  }
}

function severityColor(severity: IncidentRow["severity"]): string {
  switch (severity) {
    case "High":
      return tokens.colors.status.danger;

    case "Medium":
      return tokens.colors.status.warning;

    default:
      return tokens.colors.trip.lowPriority;
  }
}

/**
 * Administrator / Owner / Transport Manager
 * operational command centre.
 */
export function OperationsDashboard({
  managerMode = false,
}: {
  managerMode?: boolean;
}) {
  const { user, tenant } = useAuth();

  const theme = useTheme();

  const dark = theme.palette.mode === "dark";

  /**
   * First live dashboard domain.
   *
   * This data now comes from PostgreSQL through:
   *
   * Vehicles API
   * -> PermissionGuard
   * -> TenantDatabaseService
   * -> PostgreSQL RLS
   * -> React Query.
   */
  const fleetSummary = useFleetSummary(tenant?.tenantId);

  const fleet = fleetSummary.data;

  const fleetLoading = fleetSummary.isLoading;

  const fleetError = fleetSummary.isError;

  const vehicleValue = fleetLoading
    ? "—"
    : fleetError
      ? "!"
      : String(fleet?.active ?? 0).padStart(2, "0");

  const vehicleDetail = fleetLoading
    ? "Loading live fleet data..."
    : fleetError
      ? "Unable to load fleet data"
      : `${fleet?.active ?? 0} of ${fleet?.total ?? 0} fleet vehicles active`;

  const metrics: Metric[] = [
    {
      label: "Active Trips",

      value: "08",

      detail: "6 on time · 2 approaching pickup",

      accent: tokens.colors.dashboard.tripsAccent,

      icon: <RouteRounded />,

      source: "preview",
    },

    {
      label: "Vehicles Active",

      value: vehicleValue,

      detail: vehicleDetail,

      accent: tokens.colors.dashboard.vehiclesAccent,

      icon: <DirectionsBusRounded />,

      source: "live",
    },

    {
      label: "Drivers",

      value: "31",

      detail: "27 assigned · 4 available",

      accent: tokens.colors.dashboard.driversAccent,

      icon: <BadgeRounded />,

      source: "preview",
    },

    {
      label: "Students Today",

      value: "684",

      detail: "97.8% transport attendance",

      accent: tokens.colors.dashboard.studentsAccent,

      icon: <SchoolRounded />,

      source: "preview",
    },
  ];

  /**
   * Trips remain preview data until the Trips API
   * is connected in its own checkpoint.
   */
  const trips: TripRow[] = [
    {
      route: "North Route A",

      vehicle: "BUS-012",

      driver: "Daniel M.",

      time: "06:30",

      status: "Active",
    },

    {
      route: "Westlands B",

      vehicle: "BUS-008",

      driver: "Peter K.",

      time: "06:45",

      status: "Active",
    },

    {
      route: "South Route C",

      vehicle: "BUS-021",

      driver: "Grace N.",

      time: "07:00",

      status: "Delayed",
    },

    {
      route: "East Route D",

      vehicle: "BUS-004",

      driver: "James O.",

      time: "14:45",

      status: "Scheduled",
    },
  ];

  const incidents: IncidentRow[] = [
    {
      title: "Route deviation detected",

      time: "08:14",

      severity: "Medium",
    },

    {
      title: "Student boarding exception",

      time: "07:42",

      severity: "Low",
    },

    {
      title: "Late departure — BUS-021",

      time: "07:06",

      severity: "Medium",
    },
  ];

  const availabilityPercent =
    fleetError || fleetLoading ? 0 : (fleet?.availabilityPercent ?? 0);

  const availabilityLabel = fleetLoading
    ? "Loading"
    : fleetError
      ? "Unavailable"
      : `${availabilityPercent}%`;

  return (
    <Box>
      {/* ================================================
          COMMAND CENTRE HERO
          ================================================ */}

      <Paper
        elevation={0}
        sx={{
          position: "relative",

          overflow: "hidden",

          p: {
            xs: 3,
            md: 4,
          },

          mb: 2.5,

          border: "1px solid",

          borderColor: dark
            ? tokens.alpha.heroGold18
            : tokens.alpha.heroBronze17,

          background: dark
            ? tokens.gradients.dashboardHeroDark
            : tokens.gradients.dashboardHeroLight,
        }}
      >
        <Box
          sx={{
            position: "absolute",

            width: 300,
            height: 300,

            borderRadius: "50%",

            top: -180,
            right: -80,

            background: `
                radial-gradient(
                  circle,
                  ${tokens.alpha.heroGlow24},
                  ${tokens.alpha.heroGlow0} 70%
                )
              `,
          }}
        />

        <Box
          sx={{
            position: "relative",

            zIndex: 1,

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

            gap: 3,
          }}
        >
          <Box>
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

                label={
                  managerMode
                    ? "Transport Operations"
                    : `${roleLabel(tenant?.role)} Command Centre`
                }

                sx={{
                  color: dark
                    ? tokens.colors.dashboard.heroTextDark
                    : tokens.colors.dashboard.heroTextLight,

                  bgcolor: dark ? tokens.alpha.gold11 : tokens.alpha.gold15,

                  border: "1px solid",

                  borderColor: dark
                    ? tokens.alpha.lightGold25
                    : tokens.alpha.bronze20,
                }}
              />

              <Chip
                size="small"

                label="Vehicles live"

                sx={{
                  color: tokens.colors.status.success,

                  bgcolor: tokens.alpha.success10,

                  border: "1px solid",

                  borderColor: tokens.alpha.success20,
                }}
              />

              <Chip
                size="small"

                label="Trips / drivers / students preview"

                variant="outlined"

                sx={{
                  color: "text.secondary",

                  borderColor: "divider",
                }}
              />
            </Box>

            <Typography
              component="h1"
              sx={{
                mt: 2,

                fontSize: {
                  xs: 30,
                  md: 40,
                },

                fontWeight: 900,

                lineHeight: 1.08,

                letterSpacing: "-0.045em",
              }}
            >
              Good morning.
            </Typography>

            <Typography
              sx={{
                mt: 1,

                color: "text.secondary",

                fontSize: 14.5,
              }}
            >
              {user?.email}
              {" · "}
              Here's how transport operations are looking today.
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

              startIcon={<NotificationsRounded />}
            >
              Alerts
            </Button>

            <Button
              variant="contained"

              startIcon={<MapRounded />}
            >
              Live fleet
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ================================================
          KPI GRID
          ================================================ */}

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
          <MetricCard
            key={metric.label}

            metric={metric}
          />
        ))}
      </Box>

      {/* ================================================
          LIVE FLEET + SYSTEM STATUS
          ================================================ */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            lg: "minmax(0, 1.7fr) minmax(300px, 0.8fr)",
          },

          gap: 2,

          mb: 2.5,
        }}
      >
        {/* LIVE MAP */}

        <Paper
          elevation={0}
          sx={{
            minHeight: 430,

            overflow: "hidden",

            position: "relative",

            border: "1px solid",

            borderColor: "divider",

            background: dark
              ? tokens.colors.neutral.graphite850
              : tokens.colors.neutral.warmCanvas,
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2.5,

              position: "relative",

              zIndex: 2,
            }}
          >
            <SectionHeader
              title="Live Fleet"

              subtitle="Realtime GPS vehicle positioning will render here."

              action={
                <Chip
                  size="small"

                  icon={<NavigationRounded />}

                  label={
                    fleetLoading
                      ? "Loading"
                      : fleetError
                        ? "Unavailable"
                        : `${fleet?.active ?? 0} active`
                  }

                  sx={{
                    color: fleetError
                      ? tokens.colors.status.danger
                      : tokens.colors.dashboard.liveMapLabel,

                    bgcolor: fleetError
                      ? tokens.alpha.danger10
                      : tokens.alpha.gold10,
                  }}
                />
              }
            />
          </Box>

          <Box
            sx={{
              position: "absolute",

              inset: "92px 0 0",

              overflow: "hidden",

              background: dark
                ? tokens.gradients.liveMapDark
                : tokens.gradients.liveMapLight,
            }}
          >
            <Box
              sx={{
                position: "absolute",

                width: "120%",

                height: 2,

                left: "-10%",

                top: "42%",

                bgcolor: dark ? tokens.alpha.white08 : tokens.alpha.warmLine10,

                transform: "rotate(-8deg)",
              }}
            />

            <Box
              sx={{
                position: "absolute",

                width: 2,

                height: "130%",

                left: "56%",

                top: "-15%",

                bgcolor: dark ? tokens.alpha.white065 : tokens.alpha.warmLine09,

                transform: "rotate(18deg)",
              }}
            />

            <Box
              sx={{
                position: "absolute",

                left: "26%",

                top: "36%",

                width: 38,
                height: 38,

                display: "grid",

                placeItems: "center",

                borderRadius: "50%",

                bgcolor: tokens.colors.brand.champagneGold,

                color: tokens.colors.neutral.graphite900,

                boxShadow: `0 0 0 8px ${tokens.alpha.gold15}`,
              }}
            >
              <DirectionsBusRounded fontSize="small" />
            </Box>

            <Box
              sx={{
                position: "absolute",

                right: "25%",

                top: "55%",

                width: 34,
                height: 34,

                display: "grid",

                placeItems: "center",

                borderRadius: "50%",

                bgcolor: tokens.colors.dashboard.mapMarkerSecondary,

                color: tokens.colors.neutral.graphite900,

                boxShadow: `0 0 0 7px ${tokens.alpha.mapMarker15}`,
              }}
            >
              <DirectionsBusRounded
                sx={{
                  fontSize: 18,
                }}
              />
            </Box>

            <Box
              sx={{
                position: "absolute",

                left: "48%",

                bottom: "22%",

                width: 32,
                height: 32,

                display: "grid",

                placeItems: "center",

                borderRadius: "50%",

                bgcolor: tokens.colors.dashboard.mapMarkerMuted,

                color: tokens.colors.neutral.white,
              }}
            >
              <DirectionsBusRounded
                sx={{
                  fontSize: 17,
                }}
              />
            </Box>

            <Box
              sx={{
                position: "absolute",

                left: "50%",

                top: "50%",

                transform: "translate(-50%, -50%)",

                textAlign: "center",

                pointerEvents: "none",
              }}
            >
              <MapRounded
                sx={{
                  fontSize: 48,

                  color: dark
                    ? tokens.alpha.lightGold18
                    : tokens.alpha.mapWarm20,
                }}
              />

              <Typography
                sx={{
                  mt: 1,

                  fontSize: 12,

                  fontWeight: 700,

                  color: "text.secondary",
                }}
              >
                GPS map integration next
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* FLEET READINESS */}

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

            subtitle="Operational status"
          />

          <Box
            sx={{
              display: "grid",

              gap: 3,
            }}
          >
            {/* LIVE VEHICLE AVAILABILITY */}

            <Box>
              <Box
                sx={{
                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  gap: 2,

                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",

                    alignItems: "center",

                    gap: 0.8,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12.5,

                      fontWeight: 700,
                    }}
                  >
                    Vehicles active
                  </Typography>

                  <Chip
                    size="small"

                    label="Live"

                    sx={{
                      height: 18,

                      fontSize: 8,

                      color: tokens.colors.status.success,

                      bgcolor: tokens.alpha.success10,
                    }}
                  />
                </Box>

                <Typography
                  sx={{
                    color: fleetError ? "error.main" : "primary.main",

                    fontSize: 12,

                    fontWeight: 800,
                  }}
                >
                  {availabilityLabel}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"

                value={availabilityPercent}

                sx={{
                  height: 6,

                  borderRadius: 10,

                  bgcolor: "action.hover",

                  "& .MuiLinearProgress-bar": {
                    borderRadius: 10,

                    bgcolor: fleetError
                      ? tokens.colors.status.danger
                      : tokens.colors.brand.champagneGold,
                  },
                }}
              />

              {!fleetLoading && !fleetError ? (
                <Typography
                  sx={{
                    mt: 0.8,

                    color: "text.secondary",

                    fontSize: 10.5,
                  }}
                >
                  {fleet?.active ?? 0} active · {fleet?.maintenance ?? 0}{" "}
                  maintenance · {fleet?.inactive ?? 0} inactive ·{" "}
                  {fleet?.retired ?? 0} retired
                </Typography>
              ) : null}
            </Box>

            {/* DRIVER PREVIEW */}

            <Box>
              <Box
                sx={{
                  display: "flex",

                  justifyContent: "space-between",

                  mb: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12.5,

                    fontWeight: 700,
                  }}
                >
                  Drivers assigned
                </Typography>

                <Typography
                  sx={{
                    color: tokens.colors.dashboard.readinessMuted,

                    fontSize: 12,

                    fontWeight: 800,
                  }}
                >
                  87%
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"

                value={87}

                sx={{
                  height: 6,

                  borderRadius: 10,

                  bgcolor: "action.hover",

                  "& .MuiLinearProgress-bar": {
                    borderRadius: 10,

                    bgcolor: tokens.colors.dashboard.readinessMuted,
                  },
                }}
              />

              <Typography
                sx={{
                  mt: 0.8,

                  color: "text.secondary",

                  fontSize: 10,

                  fontStyle: "italic",
                }}
              >
                Preview until Drivers API is connected
              </Typography>
            </Box>

            {/* ROUTE PREVIEW */}

            <Box>
              <Box
                sx={{
                  display: "flex",

                  justifyContent: "space-between",

                  mb: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 12.5,

                    fontWeight: 700,
                  }}
                >
                  Routes on time
                </Typography>

                <Typography
                  sx={{
                    color: tokens.colors.status.success,

                    fontSize: 12,

                    fontWeight: 800,
                  }}
                >
                  94%
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"

                value={94}

                sx={{
                  height: 6,

                  borderRadius: 10,

                  bgcolor: "action.hover",

                  "& .MuiLinearProgress-bar": {
                    borderRadius: 10,

                    bgcolor: tokens.colors.status.success,
                  },
                }}
              />

              <Typography
                sx={{
                  mt: 0.8,

                  color: "text.secondary",

                  fontSize: 10,

                  fontStyle: "italic",
                }}
              >
                Preview until Trips API is connected
              </Typography>
            </Box>
          </Box>

          <Divider
            sx={{
              my: 3,
            }}
          />

          <Box
            sx={{
              display: "grid",

              gap: 1.5,
            }}
          >
            {[
              {
                label: "Vehicles API",

                value: fleetLoading
                  ? "Checking"
                  : fleetError
                    ? "Error"
                    : "Connected",

                color: fleetLoading
                  ? tokens.colors.brand.champagneGold
                  : fleetError
                    ? tokens.colors.status.danger
                    : tokens.colors.status.success,
              },

              {
                label: "Realtime gateway",

                value: "Connected",

                color: tokens.colors.status.success,
              },

              {
                label: "GPS ingest",

                value: "Healthy",

                color: tokens.colors.status.success,
              },

              {
                label: "Odoo sync",

                value: "Pending setup",

                color: tokens.colors.status.warning,
              },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  gap: 2,
                }}
              >
                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 12,
                  }}
                >
                  {item.label}
                </Typography>

                <Box
                  sx={{
                    display: "flex",

                    alignItems: "center",

                    gap: 0.7,
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,

                      borderRadius: "50%",

                      bgcolor: item.color,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 11.5,

                      fontWeight: 700,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      {/* ================================================
          TRIPS + INCIDENTS
          ================================================ */}

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
        {/* TRIPS - PREVIEW */}

        <Paper
          elevation={0}
          sx={{
            p: 3,

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <SectionHeader
            title="Today's Trips"

            subtitle="Preview until the Trips API is connected"

            action={
              <Chip
                size="small"

                label="Preview"

                sx={{
                  color: tokens.colors.dashboard.previewText,

                  bgcolor: tokens.alpha.gold09,
                }}
              />
            }
          />

          <Box
            sx={{
              display: "grid",
            }}
          >
            {trips.map((trip, index) => (
              <Box key={trip.route}>
                <Box
                  sx={{
                    py: 1.7,

                    display: "grid",

                    gridTemplateColumns: {
                      xs: "1fr",

                      sm: "minmax(180px, 1.3fr) minmax(100px, 0.7fr) minmax(110px, 0.8fr) 70px 95px",
                    },

                    alignItems: "center",

                    gap: {
                      xs: 1,
                      sm: 2,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",

                      alignItems: "center",

                      gap: 1.2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 34,
                        height: 34,

                        display: "grid",

                        placeItems: "center",

                        borderRadius: 1.5,

                        bgcolor: "action.hover",

                        color: "primary.main",
                      }}
                    >
                      <RouteRounded
                        sx={{
                          fontSize: 18,
                        }}
                      />
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 12.5,

                          fontWeight: 750,
                        }}
                      >
                        {trip.route}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.25,

                          color: "text.secondary",

                          fontSize: 10.5,
                        }}
                      >
                        {trip.vehicle}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",

                      alignItems: "center",

                      gap: 0.7,
                    }}
                  >
                    <PersonRounded
                      sx={{
                        fontSize: 15,

                        color: "text.secondary",
                      }}
                    />

                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 11.5,
                      }}
                    >
                      {trip.driver}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",

                      alignItems: "center",

                      gap: 0.7,
                    }}
                  >
                    <LocationOnRounded
                      sx={{
                        fontSize: 15,

                        color: "text.secondary",
                      }}
                    />

                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 11.5,
                      }}
                    >
                      School Campus
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",

                      alignItems: "center",

                      gap: 0.5,
                    }}
                  >
                    <AccessTimeRounded
                      sx={{
                        fontSize: 14,

                        color: "text.secondary",
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 11.5,

                        fontWeight: 700,
                      }}
                    >
                      {trip.time}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"

                    label={trip.status}

                    sx={{
                      justifySelf: {
                        sm: "end",
                      },

                      color: statusColor(trip.status),

                      bgcolor: `${statusColor(trip.status)}15`,

                      border: "1px solid",

                      borderColor: `${statusColor(trip.status)}30`,
                    }}
                  />
                </Box>

                {index < trips.length - 1 ? <Divider /> : null}
              </Box>
            ))}
          </Box>
        </Paper>

        {/* INCIDENTS - PREVIEW */}

        <Paper
          elevation={0}
          sx={{
            p: 3,

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <SectionHeader
            title="Attention Required"

            subtitle="Preview until Incidents API is connected"

            action={
              <Box
                sx={{
                  width: 30,
                  height: 30,

                  display: "grid",

                  placeItems: "center",

                  borderRadius: "50%",

                  bgcolor: tokens.alpha.warning10,

                  color: tokens.colors.status.warning,
                }}
              >
                <WarningAmberRounded
                  sx={{
                    fontSize: 17,
                  }}
                />
              </Box>
            }
          />

          <Box
            sx={{
              display: "grid",

              gap: 1,
            }}
          >
            {incidents.map((incident) => (
              <Box
                key={incident.title}
                sx={{
                  p: 1.8,

                  border: "1px solid",

                  borderColor: "divider",

                  borderRadius: 2,

                  bgcolor: "action.hover",
                }}
              >
                <Box
                  sx={{
                    display: "flex",

                    alignItems: "flex-start",

                    gap: 1.2,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,

                      mt: 0.7,

                      flexShrink: 0,

                      borderRadius: "50%",

                      bgcolor: severityColor(incident.severity),
                    }}
                  />

                  <Box
                    sx={{
                      flex: 1,

                      minWidth: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,

                        fontWeight: 700,
                      }}
                    >
                      {incident.title}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,

                        color: "text.secondary",

                        fontSize: 10.5,
                      }}
                    >
                      {incident.time}
                      {" · "}
                      {incident.severity} priority
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          <Button
            fullWidth

            variant="outlined"

            sx={{
              mt: 2,
            }}

            endIcon={<ArrowForwardRounded />}
          >
            Incident centre
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

/**
 * Driver-specific dashboard.
 *
 * Driver data remains separate because Drivers do not
 * receive general fleet-management permissions.
 */
