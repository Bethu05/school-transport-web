import {
  ArrowBackRounded,
  BusinessRounded,
  DomainRounded,
  FactCheckRounded,
  GroupsRounded,
  LockRounded,
  PaymentsRounded,
  TuneRounded,
} from "@mui/icons-material";

import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { useQuery } from "@tanstack/react-query";

import { useState } from "react";

import { TenantAdminRecoveryActions } from "./TenantAdminRecoveryActions";

import { TenantCapacityActions } from "./TenantCapacityActions";

import { TenantCommercialActions } from "./TenantCommercialActions";

import { TenantFeatureLimits } from "./TenantFeatureLimits";

import { TenantInitialAdminActions } from "./TenantInitialAdminActions";

import { TenantOnboardingPanel } from "./TenantOnboardingPanel";

import { TenantProfileActions } from "./TenantProfileActions";

import {
  getPlatformTenantCapacity,
  getPlatformTenantOnboardingStatus,
  type PlatformTenantListItem,
} from "./platform.api";

type ManagementPanel =
  | "details"
  | "onboarding"
  | "subscription"
  | "capacity"
  | "features"
  | "administrator"
  | null;

interface TenantManagementPageProps {
  tenant: PlatformTenantListItem;

  onBack: () => void;

  onTenantUpdated: (tenant: PlatformTenantListItem) => void;
}

interface ControlCardProps {
  title: string;

  description: string;

  icon: React.ReactNode;

  children: React.ReactNode;

  onClick: () => void;
}

function subscriptionLabel(tenant: PlatformTenantListItem): string {
  switch (tenant.subscriptionStatus) {
    case "active":
      return "Active";

    case "trialing":
      return "Trial";

    case "cancelled":
      return "Paused";

    case "expired":
      return "Expired";

    default:
      return "No subscription";
  }
}

function ControlCard({
  title,
  description,
  icon,
  children,
  onClick,
}: ControlCardProps) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: "block",

        width: "100%",

        height: "100%",

        textAlign: "left",

        borderRadius: 2,
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          height: "100%",

          minHeight: 175,

          p: 2.25,

          borderRadius: 2,

          transition:
            "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",

          "&:hover": {
            borderColor: "primary.main",

            boxShadow: 2,

            transform: "translateY(-1px)",
          },
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
          <Box>
            <Typography
              sx={{
                fontSize: 14,

                fontWeight: 850,
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 0.35,

                color: "text.secondary",

                fontSize: 10,

                lineHeight: 1.5,
              }}
            >
              {description}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 36,

              height: 36,

              flexShrink: 0,

              display: "grid",

              placeItems: "center",

              borderRadius: 2,

              bgcolor: "action.hover",

              color: "primary.main",
            }}
          >
            {icon}
          </Box>
        </Box>

        <Box
          sx={{
            mt: 2,
          }}
        >
          {children}
        </Box>

        <Typography
          sx={{
            mt: 2,

            color: "primary.main",

            fontSize: 10,

            fontWeight: 800,
          }}
        >
          Click to manage →
        </Typography>
      </Paper>
    </ButtonBase>
  );
}

export function TenantManagementPage({
  tenant,
  onBack,
  onTenantUpdated,
}: TenantManagementPageProps) {
  const [activePanel, setActivePanel] = useState<ManagementPanel>(null);

  const capacityQuery = useQuery({
    queryKey: ["platform", "tenant-capacity", tenant.id],

    queryFn: () => getPlatformTenantCapacity(tenant.id),
  });

  const onboardingQuery = useQuery({
    queryKey: ["platform", "tenant", tenant.id, "onboarding"],

    queryFn: () => getPlatformTenantOnboardingStatus(tenant.id),
  });

  const capacity = capacityQuery.data;

  const administrator = onboardingQuery.data?.initialAdmin ?? null;

  function dialogTitle(): string {
    switch (activePanel) {
      case "details":
        return "Tenant details";

      case "onboarding":
        return "Onboarding control centre";

      case "subscription":
        return "Subscription & access";

      case "capacity":
        return "Operating capacity";

      case "features":
        return "Feature configuration";

      case "administrator":
        return "Administrator access";

      default:
        return "";
    }
  }

  return (
    <Box>
      {/* ======================================================
          HEADER
          ====================================================== */}

      <Box
        sx={{
          display: "flex",

          alignItems: {
            xs: "flex-start",

            md: "center",
          },

          justifyContent: "space-between",

          gap: 2,

          flexDirection: {
            xs: "column",

            md: "row",
          },
        }}
      >
        <Box>
          <Button
            size="small"
            startIcon={<ArrowBackRounded />}
            onClick={onBack}
            sx={{
              mb: 1,

              px: 0,

              textTransform: "none",
            }}
          >
            Back to schools
          </Button>

          <Box
            sx={{
              display: "flex",

              alignItems: "center",

              gap: 1.25,
            }}
          >
            <Box
              sx={{
                width: 40,

                height: 40,

                display: "grid",

                placeItems: "center",

                borderRadius: 2,

                bgcolor: "primary.main",

                color: "primary.contrastText",
              }}
            >
              <BusinessRounded />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 19,

                  fontWeight: 900,

                  letterSpacing: "-0.02em",
                }}
              >
                {tenant.name}
              </Typography>

              <Typography
                sx={{
                  color: "text.secondary",

                  fontSize: 10,
                }}
              >
                {tenant.slug}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: "wrap",
          }}
        >
          <Chip
            size="small"
            label={tenant.planName ?? "No plan"}
            variant="outlined"
          />

          <Chip
            size="small"
            label={subscriptionLabel(tenant)}
            color={tenant.subscriptionEffective ? "success" : "default"}
          />
        </Stack>
      </Box>

      {/* ======================================================
          COMPACT CONTROL CENTRE
          ====================================================== */}

      <Box
        sx={{
          mt: 2.5,

          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            md: "repeat(2, minmax(0, 1fr))",
          },

          gap: 1.5,
        }}
      >
        {/* ----------------------------------------------------
            TENANT DETAILS
            ---------------------------------------------------- */}

        <ControlCard
          title="Tenant details"
          description="Organisation identity, location, contacts and profile."
          icon={<DomainRounded fontSize="small" />}
          onClick={() => setActivePanel("details")}
        >
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {tenant.name}
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color: "text.secondary",
              fontSize: 10,
            }}
          >
            {tenant.timezone}
          </Typography>

          <Typography
            sx={{
              mt: 1.25,
              color: "text.secondary",
              fontSize: 10,
              lineHeight: 1.5,
            }}
          >
            Edit non-financial organisation and onboarding details.
          </Typography>
        </ControlCard>

        {/* ----------------------------------------------------
            ONBOARDING
            ---------------------------------------------------- */}

        <ControlCard
          title="Onboarding"
          description="15-step approval, setup, readiness and activation workflow."
          icon={<FactCheckRounded fontSize="small" />}
          onClick={() => setActivePanel("onboarding")}
        >
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
            }}
          >
            <Chip
              size="small"
              label="15 canonical steps"
              color="primary"
              variant="outlined"
            />

            <Chip size="small" label="Activation gated" variant="outlined" />
          </Stack>

          <Typography
            sx={{
              mt: 1.25,

              color: "text.secondary",

              fontSize: 10,

              lineHeight: 1.5,
            }}
          >
            Review approval, evidence, migration and launch readiness. Demo
            legacy reserved workflow records are excluded from the active
            onboarding experience.
          </Typography>
        </ControlCard>

        {/* ----------------------------------------------------
            SUBSCRIPTION
            ---------------------------------------------------- */}

        <ControlCard
          title="Subscription"
          description="Plan, trial and platform access."
          icon={<PaymentsRounded fontSize="small" />}
          onClick={() => setActivePanel("subscription")}
        >
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
            }}
          >
            <Chip size="small" label={tenant.planName ?? "No plan"} />

            <Chip
              size="small"
              label={subscriptionLabel(tenant)}
              variant="outlined"
            />
          </Stack>

          <Typography
            sx={{
              mt: 1.25,

              color: "text.secondary",

              fontSize: 10,
            }}
          >
            {tenant.subscriptionEndsAt
              ? `Ends ${new Intl.DateTimeFormat("en-KE", {
                  dateStyle: "medium",

                  timeZone: "Africa/Nairobi",
                }).format(new Date(tenant.subscriptionEndsAt))}`
              : "No subscription end date"}
          </Typography>
        </ControlCard>

        {/* ----------------------------------------------------
            CAPACITY
            ---------------------------------------------------- */}

        <ControlCard
          title="Capacity"
          description="Tenant-wide operating allowances."
          icon={<GroupsRounded fontSize="small" />}
          onClick={() => setActivePanel("capacity")}
        >
          {capacity ? (
            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",

                gap: 1,
              }}
            >
              {[
                {
                  label: "Schools",

                  value: `${capacity.schools.used} / ${capacity.schools.limit}`,
                },

                {
                  label: "Students",

                  value: `${capacity.students.used} / ${capacity.students.limit}`,
                },

                {
                  label: "Buses",

                  value: `${capacity.vehicles.used} / ${capacity.vehicles.limit}`,
                },

                {
                  label: "Drivers",

                  value: `${capacity.drivers.used} / ${capacity.drivers.limit}`,
                },
              ].map((item) => (
                <Box key={item.label}>
                  <Typography
                    sx={{
                      color: "text.secondary",

                      fontSize: 9,

                      textTransform: "uppercase",

                      letterSpacing: "0.05em",
                    }}
                  >
                    {item.label}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,

                      fontSize: 13,

                      fontWeight: 800,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 11,
              }}
            >
              {capacityQuery.isLoading
                ? "Loading capacity..."
                : "Capacity unavailable"}
            </Typography>
          )}
        </ControlCard>

        {/* ----------------------------------------------------
            FEATURES
            ---------------------------------------------------- */}

        <ControlCard
          title="Features"
          description="Customer-specific feature allowances and overrides."
          icon={<TuneRounded fontSize="small" />}
          onClick={() => setActivePanel("features")}
        >
          <Typography
            sx={{
              fontSize: 13,

              fontWeight: 750,
            }}
          >
            Package features
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",

              fontSize: 10,

              lineHeight: 1.5,
            }}
          >
            Configure numeric allowances and customer-specific entitlement
            overrides.
          </Typography>
        </ControlCard>

        {/* ----------------------------------------------------
            ADMINISTRATOR
            ---------------------------------------------------- */}

        <ControlCard
          title="Administrator"
          description="Initial account and emergency access recovery."
          icon={<LockRounded fontSize="small" />}
          onClick={() => setActivePanel("administrator")}
        >
          {onboardingQuery.isLoading ? (
            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 11,
              }}
            >
              Checking account...
            </Typography>
          ) : administrator ? (
            <>
              <Typography
                sx={{
                  fontSize: 13,

                  fontWeight: 800,
                }}
              >
                {administrator.firstName} {administrator.lastName}
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,

                  color: "text.secondary",

                  fontSize: 10,

                  wordBreak: "break-word",
                }}
              >
                {administrator.email}
              </Typography>

              <Chip
                sx={{
                  mt: 1,
                }}
                size="small"
                label="Configured"
                color="success"
                variant="outlined"
              />
            </>
          ) : (
            <Chip size="small" label="Not configured" variant="outlined" />
          )}
        </ControlCard>
      </Box>

      {/* ======================================================
          SETTINGS DIALOG
          ====================================================== */}

      <Dialog
        open={activePanel !== null}
        onClose={() => setActivePanel(null)}
        fullWidth
        maxWidth={
          activePanel === "onboarding"
            ? false
            : activePanel === "capacity"
              ? "md"
              : "sm"
        }
        scroll="paper"
        sx={
          activePanel === "onboarding"
            ? {
                "& .MuiDialog-paper": {
                  width: {
                    xs: "96vw",
                    md: "92vw",
                  },
                  maxWidth: "92vw",
                  height: {
                    xs: "94vh",
                    md: "90vh",
                  },
                  maxHeight: "94vh",
                  overflow: "hidden",
                },
              }
            : undefined
        }
      >
        <DialogTitle>
          <Typography
            sx={{
              fontSize: 18,

              fontWeight: 850,
            }}
          >
            {dialogTitle()}
          </Typography>

          <Typography
            sx={{
              mt: 0.25,

              color: "text.secondary",

              fontSize: 11,
            }}
          >
            {tenant.name}
          </Typography>
        </DialogTitle>

        <DialogContent
          dividers
          sx={
            activePanel === "onboarding"
              ? {
                  p: 0,
                  minHeight: 0,
                  overflow: "hidden",
                  display: "flex",
                }
              : {
                  p: 2.5,
                }
          }
        >
          {activePanel === "details" ? (
            <TenantProfileActions
              tenant={tenant}
              onTenantUpdated={onTenantUpdated}
            />
          ) : null}

          {activePanel === "onboarding" ? (
            <Box
              sx={{
                width: "100%",
                minHeight: 0,
              }}
            >
              <TenantOnboardingPanel
                tenant={tenant}
                onTenantUpdated={onTenantUpdated}
              />
            </Box>
          ) : null}

          {activePanel === "subscription" ? (
            <TenantCommercialActions
              tenant={tenant}
              onTenantUpdated={onTenantUpdated}
            />
          ) : null}

          {activePanel === "capacity" ? (
            <TenantCapacityActions tenant={tenant} />
          ) : null}

          {activePanel === "features" ? (
            <TenantFeatureLimits tenant={tenant} />
          ) : null}

          {activePanel === "administrator" ? (
            <Stack spacing={3}>
              <TenantInitialAdminActions tenant={tenant} />

              <TenantAdminRecoveryActions tenant={tenant} />
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setActivePanel(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
