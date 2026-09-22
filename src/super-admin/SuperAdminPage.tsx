import { useState } from "react";

import {
  AdminPanelSettingsRounded,
  BusinessRounded,
  DashboardRounded,
  LogoutRounded,
  PaymentsRounded,
  SettingsRounded,
} from "@mui/icons-material";

import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

import { PlanEditor } from "./PlanEditor";

import { TenantManagementPage } from "./TenantManagementPage";

import { TenantsPanel } from "./TenantsPanel";

import type { PlatformTenantListItem } from "./platform.api";

interface NavigationItem {
  label: string;
  icon: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    label: "Overview",
    icon: <DashboardRounded fontSize="small" />,
  },
  {
    label: "Tenants",
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
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F8FAFC",
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          lg: "240px minmax(0, 1fr) 300px",
        },
      }}
    >
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

          minHeight: "100vh",

          borderRight: "1px solid",
          borderColor: "divider",

          bgcolor: "#101828",
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
              width: 38,
              height: 38,

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
                fontSize: 14,
                fontWeight: 800,
              }}
            >
              Platform
            </Typography>

            <Typography
              sx={{
                color: "#98A2B3",
                fontSize: 10,
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

        <Stack spacing={0.75}>
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

                minHeight: 42,

                px: 1.5,

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
          minWidth: 0,

          px: {
            xs: 2,
            md: 4,
          },

          py: {
            xs: 3,
            md: 4,
          },
        }}
      >
        <Typography
          sx={{
            color: "primary.main",

            fontSize: 11,
            fontWeight: 800,

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
              xs: 28,
              md: 36,
            },

            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          {activeSection === "Tenants" && managingTenant
            ? `Manage ${managingTenant.name}`
            : activeSection}
        </Typography>

        <Typography
          sx={{
            mt: 1,

            maxWidth: 650,

            color: "text.secondary",

            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          {activeSection === "Tenants" && managingTenant
            ? "Manage this tenant's subscription, operating capacity, feature access and administrator account."
            : "Manage tenants, subscriptions, plans and platform operations."}
        </Typography>

        <Paper
          elevation={0}
          sx={{
            mt: 4,

            minHeight: 420,

            border: "1px solid",
            borderColor: "divider",

            p: 3,
          }}
        >
          {activeSection === "Tenants" ? (
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
              <TenantsPanel
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
                {activeSection} workspace
              </Typography>

              <Typography
                sx={{
                  mt: 1,

                  color: "text.secondary",

                  fontSize: 13,
                }}
              >
                {activeSection === "Overview"
                  ? "Select Tenants to manage school organisations."
                  : `${activeSection} management will be added next.`}
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

          minHeight: "100vh",

          borderLeft: "1px solid",
          borderColor: "divider",

          bgcolor: "background.paper",

          p: 3,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          {activeSection === "Tenants" ? "Tenant overview" : "Platform status"}
        </Typography>

        <Typography
          sx={{
            mt: 0.5,

            color: "text.secondary",

            fontSize: 11,
          }}
        >
          {activeSection === "Tenants"
            ? selectedTenant
              ? selectedTenant.name
              : "Select a tenant from the list"
            : "Administration control panel"}
        </Typography>

        <Divider
          sx={{
            my: 3,
          }}
        />

        {activeSection === "Tenants" ? (
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
              Click a tenant row to view its commercial and platform
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
  );
}
