import { useState } from "react";

import { keyframes } from "@emotion/react";

import {
  BusinessRounded,
  DashboardRounded,
  FactCheckRounded,
  ManageAccountsRounded,
  PaymentsRounded,
  SettingsRounded,
} from "@mui/icons-material";

import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

import { OnboardingWorkspace } from "./OnboardingWorkspace";

import { PlatformAccessPanel } from "./PlatformAccessPanel";

import { ScreenTransition } from "./ScreenTransition";

import { SuperAdminThemeProvider } from "./SuperAdminThemeProvider";

import { PlanEditor } from "./PlanEditor";

import { SchoolsWorkspace } from "./SchoolsWorkspace";

import { SuperAdminOverview } from "./SuperAdminOverview";

import { PlatformLimitedRolePage } from "./PlatformLimitedRolePage";

import { PlatformMobileNavigation } from "./PlatformMobileNavigation";

import { PlatformSidebar, type PlatformSidebarItem } from "./PlatformSidebar";

import { TenantManagementPage } from "./TenantManagementPage";

import type { PlatformTenantListItem } from "./platform.api";

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

const navigationItems: PlatformSidebarItem[] = [
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
    label: "Platform Access",
    icon: <ManageAccountsRounded fontSize="small" />,
  },
  {
    label: "Settings",
    icon: <SettingsRounded fontSize="small" />,
  },
];

export function SuperAdminPage() {
  const { user, logout, isSuperAdmin } = useAuth();

  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("Overview");

  const [selectedTenant, setSelectedTenant] =
    useState<PlatformTenantListItem | null>(null);

  const [managingTenant, setManagingTenant] =
    useState<PlatformTenantListItem | null>(null);

  if (!isSuperAdmin) {
    return <PlatformLimitedRolePage />;
  }

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
            "linear-gradient(145deg, #292F36 0%, #242A31 42%, #1E2329 100%)",

          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "204px minmax(0, 1fr) 258px",
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
              "radial-gradient(circle, rgba(255, 255, 255, 0.065) 0%, rgba(255, 255, 255, 0.02) 34%, rgba(255, 255, 255, 0) 72%)",

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
              "radial-gradient(circle, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.014) 36%, rgba(255, 255, 255, 0) 72%)",

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
              "radial-gradient(circle, rgba(148, 163, 184, 0.08) 0%, rgba(148, 163, 184, 0.025) 36%, rgba(148, 163, 184, 0) 72%)",

            filter: "blur(24px)",
            opacity: 0.64,

            pointerEvents: "none",

            animation: `${adminFloatC} 24s ease-in-out infinite alternate`,

            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        />

        <PlatformSidebar
          items={navigationItems}
          activeLabel={activeSection}
          userEmail={user?.email}
          onSelect={(item) => {
            if (item.path) {
              navigate(item.path);
              return;
            }

            setActiveSection(item.label);
            setManagingTenant(null);
          }}
          onLogout={handleLogout}
        />

        <PlatformMobileNavigation
          items={navigationItems}
          activeLabel={activeSection}
          userEmail={user?.email}
          onSelect={(item) => {
            if (item.path) {
              navigate(item.path);
              return;
            }

            setActiveSection(item.label);
            setManagingTenant(null);
          }}
          onLogout={handleLogout}
        />

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
          <Box
            sx={{
              display: activeSection === "Platform Access" ? "none" : "block",
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
                    ? "Review applications and move verified schools through the controlled five-phase launch workflow."
                    : activeSection === "Schools"
                      ? "Manage live schools, trials, paused subscriptions and deactivated accounts."
                      : activeSection === "Platform Access"
                        ? "Review platform users, inherited role permissions and additional user-level access."
                        : "Manage plans and platform administration."}
            </Typography>
          </Box>

          {activeSection !== "Platform Access" ? (
            <Stack
              data-super-admin-quick-actions
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{
                mt: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Button
                size="small"
                variant={
                  activeSection === "Onboarding" ? "contained" : "outlined"
                }
                onClick={() => {
                  setActiveSection("Onboarding");
                  setManagingTenant(null);
                }}
                sx={{
                  minHeight: 34,
                  px: 1.5,
                  textTransform: "none",
                  fontWeight: 800,
                  bgcolor:
                    activeSection === "Onboarding"
                      ? undefined
                      : "rgba(255, 255, 255, 0.045)",
                }}
              >
                School applications
              </Button>

              <Button
                size="small"
                variant={activeSection === "Schools" ? "contained" : "outlined"}
                onClick={() => {
                  setActiveSection("Schools");
                  setManagingTenant(null);
                }}
                sx={{
                  minHeight: 34,
                  px: 1.5,
                  textTransform: "none",
                  fontWeight: 800,
                  bgcolor:
                    activeSection === "Schools"
                      ? undefined
                      : "rgba(255, 255, 255, 0.045)",
                }}
              >
                Manage schools
              </Button>

              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setActiveSection("Platform Access");
                  setManagingTenant(null);
                }}
                sx={{
                  minHeight: 34,
                  px: 1.5,
                  textTransform: "none",
                  fontWeight: 800,
                  bgcolor: "rgba(255, 255, 255, 0.045)",
                }}
              >
                Platform users
              </Button>
            </Stack>
          ) : null}

          <Paper
            elevation={0}
            sx={{
              mt: activeSection === "Platform Access" ? 0 : 2.25,

              flex: 1,
              minHeight: 0,

              display: "flex",
              flexDirection: "column",

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
              borderColor: "rgba(255, 255, 255, 0.085)",

              borderRadius: 1.25,

              bgcolor: "rgba(42, 48, 55, 0.66)",

              backdropFilter: "blur(20px) saturate(120%)",
              WebkitBackdropFilter: "blur(20px) saturate(120%)",

              boxShadow:
                "0 22px 52px rgba(0, 0, 0, 0.22), 0 1px 0 rgba(255, 255, 255, 0.035) inset",

              p:
                activeSection === "Platform Access"
                  ? {
                      xs: 1,
                      md: 1.25,
                    }
                  : {
                      xs: 1.5,
                      md: 2,
                    },
            }}
          >
            <ScreenTransition
              transitionKey={`${activeSection}:${managingTenant?.id ?? "root"}`}
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
              ) : activeSection === "Platform Access" ? (
                <PlatformAccessPanel />
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
            </ScreenTransition>
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
            borderColor: "rgba(255, 255, 255, 0.075)",

            bgcolor: "rgba(30, 35, 41, 0.72)",

            backdropFilter: "blur(20px) saturate(120%)",
            WebkitBackdropFilter: "blur(20px) saturate(120%)",

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
