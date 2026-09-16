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
  CheckCircleRounded,
  DirectionsBusRounded,
  FamilyRestroomRounded,
  MapRounded,
  NotificationsRounded,
  SchoolRounded,
} from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";

import { listMyTrackableChildren } from "../../tracking/guardian-tracking.api";

import {
  listMyNotifications,
  type ParentNotification,
} from "../../notifications/notifications.api";

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

function notificationLabel(notification: ParentNotification): string {
  switch (notification.notificationType) {
    case "student.boarded":
      return "Boarded bus";

    case "student.dropped_off":
      return "Dropped off";
  }
}

export function GuardianDashboard() {
  const { tenant, user } = useAuth();

  const navigate = useNavigate();

  const tenantId = tenant?.tenantId;

  const childrenQuery = useQuery({
    queryKey: ["guardian-dashboard-children", tenantId],

    enabled: Boolean(tenantId),

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listMyTrackableChildren(tenantId);
    },
  });

  const notificationsQuery = useQuery({
    queryKey: ["guardian-dashboard-notifications", tenantId],

    enabled: Boolean(tenantId),

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listMyNotifications(tenantId, {
        limit: 5,
      });
    },
  });

  const children = childrenQuery.data ?? [];

  const notifications = notificationsQuery.data?.items ?? [];

  const activeJourneyCount = children.filter((entry) =>
    Boolean(entry.activeTrip),
  ).length;

  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  return (
    <Box>
      {/* ====================================================
          HEADER
          ==================================================== */}

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

          background: `
              linear-gradient(
                135deg,
                rgba(201,165,92,0.13),
                transparent 70%
              )
            `,
        }}
      >
        <Chip
          size="small"
          label="Parent Portal"
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
          Your children's journeys
        </Typography>

        <Typography
          sx={{
            mt: 1,

            color: "text.secondary",

            fontSize: 14,
          }}
        >
          {user?.email}
        </Typography>

        <Box
          sx={{
            mt: 3,

            display: "flex",

            gap: 1,

            flexWrap: "wrap",
          }}
        >
          <Chip
            icon={<FamilyRestroomRounded />}
            label={`${children.length} linked ${
              children.length === 1 ? "child" : "children"
            }`}
            variant="outlined"
          />

          <Chip
            icon={<DirectionsBusRounded />}
            label={`${activeJourneyCount} active ${
              activeJourneyCount === 1 ? "journey" : "journeys"
            }`}
            variant="outlined"
          />

          <Chip
            icon={<NotificationsRounded />}
            label={`${unreadCount} unread`}
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* ====================================================
          MAIN GRID
          ==================================================== */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            lg: "minmax(0, 1.45fr) minmax(300px, 0.75fr)",
          },

          gap: 2.5,

          alignItems: "start",
        }}
      >
        {/* ==================================================
            CHILDREN / ACTIVE JOURNEYS
            ================================================== */}

        <Box>
          <Typography
            sx={{
              mb: 1.25,

              fontWeight: 850,

              fontSize: 16,
            }}
          >
            Children & journeys
          </Typography>

          {childrenQuery.isLoading ? (
            <Paper
              elevation={0}
              sx={{
                py: 6,

                display: "grid",

                placeItems: "center",

                border: "1px solid",

                borderColor: "divider",
              }}
            >
              <CircularProgress size={28} />
            </Paper>
          ) : null}

          {childrenQuery.isError ? (
            <Alert severity="error">
              We could not load your linked children.
            </Alert>
          ) : null}

          {!childrenQuery.isLoading &&
          !childrenQuery.isError &&
          children.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,

                textAlign: "center",

                border: "1px solid",

                borderColor: "divider",
              }}
            >
              <FamilyRestroomRounded
                sx={{
                  fontSize: 42,

                  color: "text.secondary",
                }}
              />

              <Typography
                sx={{
                  mt: 1.5,

                  fontWeight: 800,
                }}
              >
                No linked children
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,

                  color: "text.secondary",

                  fontSize: 12.5,
                }}
              >
                A school administrator must link your guardian profile to a
                student before journey information appears here.
              </Typography>
            </Paper>
          ) : null}

          <Box
            sx={{
              display: "grid",

              gap: 1.5,
            }}
          >
            {children.map((entry) => {
              const { child, activeTrip } = entry;

              const childName = `${child.firstName} ${child.lastName}`;

              return (
                <Paper
                  key={child.studentId}
                  elevation={0}
                  sx={{
                    p: 2.5,

                    border: "1px solid",

                    borderColor: "divider",
                  }}
                >
                  <Box
                    sx={{
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
                    <Box
                      sx={{
                        display: "flex",

                        alignItems: "center",

                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 46,

                          height: 46,

                          display: "grid",

                          placeItems: "center",

                          borderRadius: "50%",

                          bgcolor: "rgba(201,165,92,0.12)",

                          color: "primary.main",
                        }}
                      >
                        <SchoolRounded />
                      </Box>

                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 850,

                            fontSize: 16,
                          }}
                        >
                          {childName}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.25,

                            color: "text.secondary",

                            fontSize: 12,
                          }}
                        >
                          {child.schoolName}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.25,

                            color: "text.secondary",

                            fontSize: 11,
                          }}
                        >
                          {child.relationshipType}
                          {child.isPrimary ? " · Primary guardian" : ""}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",

                        alignItems: "center",

                        gap: 1,

                        flexWrap: "wrap",
                      }}
                    >
                      {activeTrip ? (
                        <>
                          <Chip
                            icon={<CheckCircleRounded />}
                            color="success"
                            label="Journey active"
                            size="small"
                          />

                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<MapRounded />}
                            onClick={() => navigate("/tracking")}
                          >
                            Track bus
                          </Button>
                        </>
                      ) : (
                        <Chip
                          variant="outlined"
                          label="No active journey"
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>

        {/* ==================================================
            RECENT JOURNEY ALERTS
            ================================================== */}

        <Paper
          elevation={0}
          sx={{
            p: 2.5,

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "flex",

              justifyContent: "space-between",

              alignItems: "center",

              gap: 1,
            }}
          >
            <Box
              sx={{
                display: "flex",

                alignItems: "center",

                gap: 1,
              }}
            >
              <NotificationsRounded color="primary" />

              <Typography
                sx={{
                  fontWeight: 850,

                  fontSize: 16,
                }}
              >
                Journey alerts
              </Typography>
            </Box>

            {unreadCount > 0 ? (
              <Chip size="small" color="primary" label={`${unreadCount} new`} />
            ) : null}
          </Box>

          {notificationsQuery.isLoading ? (
            <Box
              sx={{
                py: 4,

                display: "grid",

                placeItems: "center",
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : null}

          {notificationsQuery.isError ? (
            <Alert
              severity="info"
              sx={{
                mt: 2,
              }}
            >
              Journey alerts are unavailable for this guardian profile.
            </Alert>
          ) : null}

          {!notificationsQuery.isLoading &&
          !notificationsQuery.isError &&
          notifications.length === 0 ? (
            <Typography
              sx={{
                mt: 2,

                color: "text.secondary",

                fontSize: 12.5,

                lineHeight: 1.7,
              }}
            >
              Boarding and drop-off alerts will appear here as your child's
              journeys progress.
            </Typography>
          ) : null}

          <Box
            sx={{
              mt: 2,

              display: "grid",

              gap: 1.25,
            }}
          >
            {notifications.map((notification) => (
              <Box
                key={notification.id}
                sx={{
                  p: 1.5,

                  borderRadius: 1.5,

                  bgcolor: notification.readAt ? "transparent" : "action.hover",

                  border: "1px solid",

                  borderColor: "divider",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: notification.readAt ? 700 : 850,

                    fontSize: 12.5,
                  }}
                >
                  {notificationLabel(notification)}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.35,

                    color: "text.secondary",

                    fontSize: 11.5,

                    lineHeight: 1.5,
                  }}
                >
                  {notification.body}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,

                    color: "text.secondary",

                    fontSize: 10.5,
                  }}
                >
                  {formatDateTime(notification.createdAt)}
                </Typography>
              </Box>
            ))}
          </Box>

          <Button
            fullWidth
            sx={{
              mt: 2,
            }}
            onClick={() => navigate("/notifications")}
          >
            View all notifications
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
