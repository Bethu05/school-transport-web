import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Typography,
} from "@mui/material";

import {
  ArrowBackRounded,
  DirectionsBusRounded,
  LockClockRounded,
  LockResetRounded,
  LogoutRounded,
  ManageAccountsRounded,
  SupportAgentRounded,
} from "@mui/icons-material";

import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

import type { TenantCommercialAccessReason } from "../auth/auth.api";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

interface AccessCopy {
  eyebrow: string;

  title: string;

  description: string;
}

function accessCopy(reason: TenantCommercialAccessReason): AccessCopy {
  switch (reason) {
    case "trial_expired":
      return {
        eyebrow: "Trial complete",

        title: "Your trial has ended",

        description:
          "Your organisation's trial period has ended. Operational transport features are currently paused.",
      };

    case "subscription_required":
      return {
        eyebrow: "Subscription required",

        title: "Platform access is not active",

        description:
          "Your organisation does not currently have an active subscription or trial.",
      };

    case "subscription_expired":
      return {
        eyebrow: "Subscription expired",

        title: "Your subscription has ended",

        description:
          "Your organisation's subscription period has ended. Operational transport features are currently paused.",
      };

    case "subscription_not_started":
      return {
        eyebrow: "Access pending",

        title: "Your access is not active yet",

        description:
          "Your organisation has a subscription configured, but its access period has not started.",
      };

    case "plan_inactive":
    case "subscription_inactive":
      return {
        eyebrow: "Account status",

        title: "Account access paused",

        description:
          "Your organisation's operational access is currently inactive.",
      };

    default:
      return {
        eyebrow: "Account status",

        title: "Account access paused",

        description:
          "Your organisation does not currently have operational platform access.",
      };
  }
}

export function AccountStatusPage() {
  const {
    authenticated,
    loading,
    isSuperAdmin,
    user,
    tenant,
    permissions,
    access,
    passwordChangeRequired,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (passwordChangeRequired) {
    return <Navigate to="/change-password" replace />;
  }

  if (isSuperAdmin) {
    return <Navigate to="/platform" replace />;
  }

  /**
   * Active customers have no reason to remain on this page.
   */
  if (!access || access.operational) {
    return <Navigate to="/dashboard" replace />;
  }

  const copy = accessCopy(access.reason);

  /**
   * This role check only changes support wording.
   *
   * It is NOT an authorization decision. Backend permissions
   * remain authoritative for functionality.
   */
  const organisationAdministrator =
    tenant?.role === "owner" || tenant?.role === "admin";

  const supportMessage = organisationAdministrator
    ? "Please contact sirb-Technologies to reactivate your organisation's access."
    : "Please contact your school administrator if you believe access should be active.";

  const canReadUsers = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_READ,
  );

  function handleLogout(): void {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",

        display: "flex",

        flexDirection: "column",

        background:
          "linear-gradient(145deg, #FFFDF8 0%, #F7F1E5 50%, #ECE2CF 100%)",
      }}
    >
      {/* ====================================================
          MINIMAL ACCOUNT HEADER
          ==================================================== */}

      <Box
        component="header"

        sx={{
          borderBottom: "1px solid",

          borderColor: "rgba(24,32,44,0.08)",

          bgcolor: "rgba(255,255,255,0.76)",

          backdropFilter: "blur(14px)",
        }}
      >
        <Container
          maxWidth="lg"

          sx={{
            minHeight: 74,

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",

              alignItems: "center",

              gap: 1.3,
            }}
          >
            <Box
              sx={{
                width: 42,

                height: 42,

                display: "grid",

                placeItems: "center",

                borderRadius: 2,

                bgcolor: "primary.main",

                color: "primary.contrastText",
              }}
            >
              <DirectionsBusRounded />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 14,

                  fontWeight: 900,

                  lineHeight: 1.15,
                }}
              >
                School Transport
              </Typography>

              <Typography
                sx={{
                  mt: 0.15,

                  color: "text.secondary",

                  fontSize: 9.5,
                }}
              >
                by sirb-Technologies
              </Typography>
            </Box>
          </Box>

          <Button
            startIcon={<LogoutRounded />}

            onClick={handleLogout}

            color="inherit"
          >
            Sign out
          </Button>
        </Container>
      </Box>

      {/* ====================================================
          STATUS CONTENT
          ==================================================== */}

      <Container
        maxWidth="md"

        sx={{
          flex: 1,

          py: {
            xs: 6,

            md: 10,
          },

          display: "grid",

          alignItems: "center",
        }}
      >
        <Paper
          elevation={0}

          sx={{
            overflow: "hidden",

            border: "1px solid",

            borderColor: "rgba(24,32,44,0.08)",

            borderRadius: 4,

            boxShadow: "0 30px 80px rgba(18,20,23,0.10)",
          }}
        >
          <Box
            sx={{
              px: {
                xs: 3,

                md: 6,
              },

              pt: {
                xs: 4,

                md: 6,
              },

              pb: 4,
            }}
          >
            <Box
              sx={{
                width: 64,

                height: 64,

                display: "grid",

                placeItems: "center",

                borderRadius: 3,

                bgcolor: "rgba(201,165,92,0.12)",

                color: "primary.main",
              }}
            >
              <LockClockRounded
                sx={{
                  fontSize: 33,
                }}
              />
            </Box>

            <Chip
              label={copy.eyebrow}

              size="small"

              sx={{
                mt: 3,

                fontWeight: 800,

                color: "primary.dark",

                bgcolor: "rgba(201,165,92,0.10)",
              }}
            />

            <Typography
              component="h1"

              sx={{
                mt: 2,

                maxWidth: 650,

                fontSize: {
                  xs: 34,

                  md: 48,
                },

                lineHeight: 1.05,

                fontWeight: 950,

                letterSpacing: "-0.045em",
              }}
            >
              {copy.title}
            </Typography>

            <Typography
              sx={{
                mt: 2,

                maxWidth: 660,

                color: "text.secondary",

                fontSize: {
                  xs: 14,

                  md: 16,
                },

                lineHeight: 1.75,
              }}
            >
              {copy.description}
            </Typography>

            <Paper
              elevation={0}

              sx={{
                mt: 4,

                p: 2.5,

                display: "flex",

                gap: 1.5,

                alignItems: "flex-start",

                border: "1px solid",

                borderColor: "divider",

                bgcolor: "action.hover",
              }}
            >
              <SupportAgentRounded
                sx={{
                  mt: 0.1,

                  color: "primary.main",
                }}
              />

              <Box>
                <Typography
                  sx={{
                    fontSize: 12.5,

                    fontWeight: 850,
                  }}
                >
                  Need access restored?
                </Typography>

                <Typography
                  sx={{
                    mt: 0.55,

                    color: "text.secondary",

                    fontSize: 11.5,

                    lineHeight: 1.65,
                  }}
                >
                  {supportMessage}
                </Typography>
              </Box>
            </Paper>

            <Divider
              sx={{
                my: 4,
              }}
            />

            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  sm: "1fr 1fr",
                },

                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: "text.disabled",

                    fontSize: 9.5,

                    fontWeight: 800,

                    letterSpacing: "0.08em",

                    textTransform: "uppercase",
                  }}
                >
                  Signed in as
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,

                    fontSize: 12,

                    fontWeight: 700,
                  }}
                >
                  {user?.email}
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: "text.disabled",

                    fontSize: 9.5,

                    fontWeight: 800,

                    letterSpacing: "0.08em",

                    textTransform: "uppercase",
                  }}
                >
                  Access
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,

                    fontSize: 12,

                    fontWeight: 700,
                  }}
                >
                  Operational features paused
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 4,

                display: "flex",

                flexWrap: "wrap",

                gap: 1,
              }}
            >
              <Button
                variant="contained"

                startIcon={<LockResetRounded />}

                onClick={() => navigate("/change-password")}
              >
                Change password
              </Button>

              {canReadUsers ? (
                <Button
                  variant="outlined"

                  startIcon={<ManageAccountsRounded />}

                  onClick={() => navigate("/users-access")}
                >
                  Users &amp; access
                </Button>
              ) : null}

              <Button
                variant="text"

                startIcon={<LogoutRounded />}

                onClick={handleLogout}
              >
                Sign out
              </Button>

              <Button
                variant="text"

                startIcon={<ArrowBackRounded />}

                onClick={() => navigate("/")}
              >
                Company website
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              px: 3,

              py: 2,

              bgcolor: "#101828",

              color: "rgba(255,255,255,0.48)",

              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 9.5,
              }}
            >
              © sirb-Technologies 2026
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
