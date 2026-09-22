import { useState } from "react";

import { keyframes } from "@emotion/react";

import {
  AdminPanelSettingsRounded,
  BusinessRounded,
  DashboardRounded,
  FactCheckRounded,
  LogoutRounded,
  PaymentsRounded,
  SettingsRounded,
} from "@mui/icons-material";

import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

import { OnboardingWorkspace } from "./OnboardingWorkspace";

import { SuperAdminThemeProvider } from "./SuperAdminThemeProvider";

import { PlanEditor } from "./PlanEditor";

import { SchoolsWorkspace } from "./SchoolsWorkspace";

import { SuperAdminOverview } from "./SuperAdminOverview";

import { TenantManagementPage } from "./TenantManagementPage";

import type { PlatformTenantListItem } from "./platform.api";

interface NavigationItem {
  label: string;
  icon: React.ReactNode;
}

const adminFloatA = keyframes`
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }

  50% {
    transform: translate3d(70px, 34px, 0) scale(1.08);
  }

  100% {
    transform: translate3d(18px, 92px, 0) scale(0.96);
  }
`;

const adminFloatB = keyframes`
  0% {
    transform: translate3d(0, 0, 0) scale(1.05);
  }

  50% {
    transform: translate3d(-70px, 52px, 0) scale(0.94);
  }

  100% {
    transform: translate3d(-20px, -48px, 0) scale(1.08);
  }
`;

const adminFloatC = keyframes`
  0% {
    transform: translate3d(0, 0, 0) scale(0.95);
  }

  50% {
    transform: translate3d(42px, -60px, 0) scale(1.07);
  }

  100% {
    transform: translate3d(-35px, 18px, 0) scale(1);
  }
`;

const navigationItems: NavigationItem[] = [
  {
    label: "Overview",
    icon: <DashboardRounded fontSize="small" />,
  },
  {
    label: "Onboarding",
    icon: <FactCheckRounded fontSize="small" />,
  },
  {
    label: "Schools",
    icon: <BusinessRounded fontSize="small" />,
  },
  {
    label: "Plans",
    icon: <PaymentsRounded fontSize="small" />,
  },
  {
    label: "Settings",
    icon: <SettingsRounded fontSize="small" />,
  },
];

export function SuperAdminPage() {
  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("Overview");

  const [selectedTenant, setSelectedTenant] =
    useState<PlatformTenantListItem | null>(null);

  const [managingTenant, setManagingTenant] =
    useState<PlatformTenantListItem | null>(null);

  function handleLogout(): void {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <SuperAdminThemeProvider>
      <Box
        sx={{
          height: "100dvh",
          minHeight: 0,

          position: "relative",
          isolation: "isolate",
          overflow: "hidden",

          color: "text.primary",

          background:
            "radial-gradient(circle at 18% 14%, rgba(37, 99, 235, 0.12), transparent 30%), radial-gradient(circle at 82% 20%, rgba(124, 58, 237, 0.10), transparent 32%), linear-gradient(145deg, #050812 0%, #080D1A 45%, #070B14 100%)",

          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "216px minmax(0, 1fr) 268px",
          },
        }}
      >
        {/* ======================================================
          SUPER ADMIN ATMOSPHERE

          Decorative only. Pointer events are disabled and animation
          is removed for reduced-motion users.
          ====================================================== */}

        <Box
          aria-hidden
          sx={{
            position: "fixed",
            zIndex: 0,

            top: "-160px",
            left: "18%",

            width: 520,
            height: 520,

            borderRadius: "50%",

            background:
              "radial-gradient(circle, rgba(37, 99, 235, 0.30) 0%, rgba(37, 99, 235, 0.12) 32%, rgba(37, 99, 235, 0) 70%)",

            filter: "blur(18px)",
            opacity: 0.75,

            pointerEvents: "none",

            animation: `${adminFloatA} 22s ease-in-out infinite alternate`,

            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        />

        <Box
          aria-hidden
          sx={{
            position: "fixed",
            zIndex: 0,

            top: "18%",
            right: "-190px",

            width: 560,
            height: 560,

            borderRadius: "50%",

            background:
              "radial-gradient(circle, rgba(124, 58, 237, 0.28) 0%, rgba(124, 58, 237, 0.10) 34%, rgba(124, 58, 237, 0) 72%)",

            filter: "blur(22px)",
            opacity: 0.72,

            pointerEvents: "none",

            animation: `${adminFloatB} 26s ease-in-out infinite alternate`,

            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        />

        <Box
          aria-hidden
          sx={{
            position: "fixed",
            zIndex: 0,

            bottom: "-220px",
            left: "42%",

            width: 600,
            height: 600,

            borderRadius: "50%",

            background:
              "radial-gradient(circle, rgba(6, 182, 212, 0.21) 0%, rgba(6, 182, 212, 0.08) 36%, rgba(6, 182, 212, 0) 72%)",

            filter: "blur(24px)",
            opacity: 0.64,

            pointerEvents: "none",

            animation: `${adminFloatC} 24s ease-in-out infinite alternate`,

            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        />

        {/* ======================================================
          LEFT SIDEBAR
          ====================================================== */}

        <Box
          component="aside"
          sx={{
            display: {
              xs: "none",
              lg: "flex",
            },

            flexDirection: "column",

            height: "100dvh",
            minHeight: 0,

            overflowY: "auto",
            overflowX: "hidden",

            position: "relative",
            zIndex: 1,

            borderRight: "1px solid",
            borderColor: "rgba(148, 163, 184, 0.14)",

            bgcolor: "rgba(5, 9, 20, 0.70)",

            backdropFilter: "blur(24px) saturate(130%)",
            WebkitBackdropFilter: "blur(24px) saturate(130%)",

            color: "common.white",

            p: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,

              px: 1,
              py: 1.5,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,

                display: "grid",
                placeItems: "center",

                borderRadius: 2,

                bgcolor: "primary.main",
              }}
            >
              <AdminPanelSettingsRounded />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 850,
                }}
              >
                Platform
              </Typography>

              <Typography
                sx={{
                  color: "#98A2B3",
                  fontSize: 9,
                }}
              >
                Administration
              </Typography>
            </Box>
          </Box>

          <Divider
            sx={{
              my: 2,
              borderColor: "rgba(255,255,255,0.08)",
            }}
          />

          <Stack spacing={0.35}>
            {navigationItems.map((item) => (
              <Button
                key={item.label}
                startIcon={item.icon}
                onClick={() => {
                  setActiveSection(item.label);

                  setManagingTenant(null);
                }}
                fullWidth
                sx={{
                  justifyContent: "flex-start",

                  minHeight: 34,

                  px: 1.25,
                  py: 0.35,

                  borderRadius: 1.5,

                  fontSize: 10.75,
                  fontWeight: 700,

                  "& .MuiButton-startIcon": {
                    mr: 1,
                  },

                  "& .MuiSvgIcon-root": {
                    fontSize: 17,
                  },

                  color:
                    activeSection === item.label ? "common.white" : "#98A2B3",

                  bgcolor:
                    activeSection === item.label
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",

                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.08)",
                    color: "common.white",
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>

          <Box
            sx={{
              mt: "auto",
              pt: 3,
            }}
          >
            <Divider
              sx={{
                mb: 2,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            />

            <Typography
              sx={{
                px: 1,

                color: "#98A2B3",

                fontSize: 10,
                wordBreak: "break-word",
              }}
            >
              {user?.email}
            </Typography>

            <Button
              onClick={handleLogout}
              startIcon={<LogoutRounded />}
              fullWidth
              sx={{
                mt: 1,

                justifyContent: "flex-start",

                color: "#D0D5DD",

                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.08)",
                },
              }}
            >
              Sign out
            </Button>
          </Box>
        </Box>

        {/* ======================================================
          MAIN WORKSPACE
          ====================================================== */}

        <Box
          component="main"
          sx={{
            position: "relative",
            zIndex: 1,

            minWidth: 0,
            minHeight: 0,
            height: "100dvh",

            display: "flex",
            flexDirection: "column",

            overflow: "hidden",

            px: {
              xs: 1.75,
              md: 3,
            },

            py: {
              xs: 2,
              md: 2.5,
            },
          }}
        >
          <Typography
            sx={{
              color: "primary.main",

              fontSize: 9.5,
              fontWeight: 850,

              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Platform Administration
          </Typography>

          <Typography
            component="h1"
            sx={{
              mt: 1,

              fontSize: {
                xs: 23,
                md: 29,
              },

              lineHeight: 1.15,

              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            {activeSection === "Schools" && managingTenant
              ? `Manage ${managingTenant.name}`
              : activeSection}
          </Typography>

          <Typography
            sx={{
              mt: 1,

              maxWidth: 650,

              color: "text.secondary",

              fontSize: 11,
              lineHeight: 1.55,
            }}
          >
            {activeSection === "Schools" && managingTenant
              ? "Manage this school's subscription, operating capacity, feature access, administrator account and onboarding history."
              : activeSection === "Overview"
                ? "Monitor school applications, onboarding readiness, live customers, trials and inactive accounts."
                : activeSection === "Onboarding"
                  ? "Review applications and move verified schools through the controlled 15-step launch workflow."
                  : activeSection === "Schools"
                    ? "Manage live schools, trials, paused subscriptions and deactivated accounts."
                    : "Manage plans and platform administration."}
          </Typography>

          <Paper
            elevation={0}
            sx={{
              mt: 2.25,

              flex: 1,
              minHeight: 0,

              overflowY: "auto",
              overflowX: "hidden",

              scrollbarWidth: "thin",
              scrollbarColor: "rgba(148, 163, 184, 0.30) transparent",

              "&::-webkit-scrollbar": {
                width: 6,
              },

              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },

              "&::-webkit-scrollbar-thumb": {
                background: "rgba(148, 163, 184, 0.28)",

                borderRadius: 999,
              },

              border: "1px solid",
              borderColor: "rgba(148, 163, 184, 0.16)",

              bgcolor: "rgba(9, 15, 30, 0.48)",

              backdropFilter: "blur(22px) saturate(135%)",
              WebkitBackdropFilter: "blur(22px) saturate(135%)",

              boxShadow: "0 24px 70px rgba(0, 0, 0, 0.18)",

              p: {
                xs: 1.5,
                md: 2,
              },
            }}
          >
            {activeSection === "Overview" ? (
              <SuperAdminOverview
                onOpenOnboarding={() => {
                  setActiveSection("Onboarding");

                  setManagingTenant(null);
                }}
                onOpenSchools={() => {
                  setActiveSection("Schools");

                  setManagingTenant(null);
                }}
              />
            ) : activeSection === "Onboarding" ? (
              <OnboardingWorkspace />
            ) : activeSection === "Schools" ? (
              managingTenant ? (
                <TenantManagementPage
                  tenant={managingTenant}
                  onBack={() => setManagingTenant(null)}
                  onTenantUpdated={(tenant) => {
                    setManagingTenant(tenant);

                    setSelectedTenant(tenant);
                  }}
                />
              ) : (
                <SchoolsWorkspace
                  selectedTenantId={selectedTenant?.id ?? null}
                  onSelectTenant={setSelectedTenant}
                  onManageTenant={setManagingTenant}
                />
              )
            ) : activeSection === "Plans" ? (
              <PlanEditor />
            ) : (
              <>
                <Typography
                  sx={{
                    fontSize: 16,

                    fontWeight: 800,
                  }}
                >
                  Platform settings
                </Typography>

                <Typography
                  sx={{
                    mt: 1,

                    color: "text.secondary",

                    fontSize: 13,
                  }}
                >
                  Global platform configuration will be managed here as those
                  controls are introduced.
                </Typography>
              </>
            )}
          </Paper>
        </Box>

        {/* ======================================================
          RIGHT SIDEBAR
          ====================================================== */}

        <Box
          component="aside"
          sx={{
            display: {
              xs: "none",
              lg: "block",
            },

            height: "100dvh",
            minHeight: 0,

            overflowY: "auto",
            overflowX: "hidden",

            position: "relative",
            zIndex: 1,

            borderLeft: "1px solid",
            borderColor: "rgba(148, 163, 184, 0.14)",

            bgcolor: "rgba(5, 9, 20, 0.62)",

            backdropFilter: "blur(24px) saturate(130%)",
            WebkitBackdropFilter: "blur(24px) saturate(130%)",

            p: 2.25,
          }}
        >
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {activeSection === "Schools"
              ? "School overview"
              : "Platform status"}
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",

              fontSize: 11,
            }}
          >
            {activeSection === "Schools"
              ? selectedTenant
                ? selectedTenant.name
                : "Select a school from the list"
              : "Administration control panel"}
          </Typography>

          <Divider
            sx={{
              my: 3,
            }}
          />

          {activeSection === "Schools" ? (
            selectedTenant ? (
              <Stack spacing={2.5}>
                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Status
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {selectedTenant.status}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Plan
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {selectedTenant.planName ?? "No plan"}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Subscription
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {selectedTenant.subscriptionStatus ?? "None"}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Subscription ends
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {selectedTenant.subscriptionEndsAt
                      ? new Intl.DateTimeFormat("en-KE", {
                          dateStyle: "medium",
                          timeZone: "Africa/Nairobi",
                        }).format(new Date(selectedTenant.subscriptionEndsAt))
                      : "No end date"}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Timezone
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {selectedTenant.timezone}
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Tenant ID
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      color: "text.secondary",
                      fontSize: 10,
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedTenant.id}
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                Click a school row to view its commercial and platform
                information.
              </Typography>
            )
          ) : (
            <Stack spacing={2}>
              <Box>
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Signed in as
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 12,
                    fontWeight: 700,
                    wordBreak: "break-word",
                  }}
                >
                  {user?.email}
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
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
                  Platform Administration
                </Typography>
              </Box>
            </Stack>
          )}
        </Box>
      </Box>
    </SuperAdminThemeProvider>
  );
}
