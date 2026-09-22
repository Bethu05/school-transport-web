import {
  Alert,
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import {
  FactCheckRounded,
  PauseCircleOutlineRounded,
  RocketLaunchRounded,
  SchoolRounded,
  ScheduleRounded,
  TaskAltRounded,
} from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";

import {
  listPlatformOnboardingQueue,
  listPlatformTenants,
  type PlatformTenantListItem,
} from "./platform.api";

interface SuperAdminOverviewProps {
  onOpenOnboarding: () => void;

  onOpenSchools: () => void;
}

interface MetricCardProps {
  title: string;

  value: number;

  description: string;

  icon: React.ReactNode;

  onClick: () => void;
}

function isDeactivated(tenant: PlatformTenantListItem): boolean {
  return tenant.status.toLowerCase() !== "active";
}

function isPaidLive(tenant: PlatformTenantListItem): boolean {
  return (
    !isDeactivated(tenant) &&
    tenant.subscriptionStatus === "active" &&
    tenant.subscriptionEffective
  );
}

function isTrial(tenant: PlatformTenantListItem): boolean {
  return (
    !isDeactivated(tenant) &&
    tenant.subscriptionStatus === "trialing" &&
    tenant.subscriptionEffective
  );
}

function isPaused(tenant: PlatformTenantListItem): boolean {
  return (
    !isDeactivated(tenant) &&
    (tenant.subscriptionStatus === "cancelled" ||
      tenant.subscriptionStatus === "expired")
  );
}

function MetricCard({
  title,
  value,
  description,
  icon,
  onClick,
}: MetricCardProps) {
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

          minHeight: 104,

          p: 1.4,

          borderRadius: 1.75,

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
                color: "text.secondary",

                fontSize: 8.75,

                fontWeight: 850,

                textTransform: "uppercase",

                letterSpacing: "0.05em",
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                mt: 0.75,

                fontSize: 22,

                lineHeight: 1.05,

                fontWeight: 900,

                letterSpacing: "-0.04em",
              }}
            >
              {value}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 30,

              height: 30,

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

        <Typography
          sx={{
            mt: 0.7,

            color: "text.secondary",

            fontSize: 9,

            lineHeight: 1.35,
          }}
        >
          {description}
        </Typography>
      </Paper>
    </ButtonBase>
  );
}

export function SuperAdminOverview({
  onOpenOnboarding,
  onOpenSchools,
}: SuperAdminOverviewProps) {
  const tenantsQuery = useQuery({
    queryKey: ["platform", "tenants"],

    queryFn: listPlatformTenants,
  });

  const onboardingQuery = useQuery({
    queryKey: ["platform", "onboarding", "queue"],

    queryFn: listPlatformOnboardingQueue,
  });

  if (tenantsQuery.isLoading || onboardingQuery.isLoading) {
    return (
      <Box
        sx={{
          minHeight: 320,

          display: "grid",

          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (tenantsQuery.isError || onboardingQuery.isError) {
    const error = tenantsQuery.error ?? onboardingQuery.error;

    return (
      <Alert severity="error">
        {error instanceof Error
          ? error.message
          : "Unable to load platform overview"}
      </Alert>
    );
  }

  const tenants = tenantsQuery.data ?? [];

  const onboarding = onboardingQuery.data?.items ?? [];

  const pendingReview = onboarding.filter(
    (item) => item.approvalStatus === "pending_review",
  );

  const readyToLaunch = onboarding.filter(
    (item) =>
      item.approvalStatus === "approved" &&
      item.currentStage === "ready_to_launch",
  );

  const inOnboarding = onboarding.filter(
    (item) =>
      item.approvalStatus === "approved" &&
      item.currentStage !== "live" &&
      item.currentStage !== "ready_to_launch",
  );

  const liveSchools = tenants.filter(isPaidLive);

  const trialSchools = tenants.filter(isTrial);

  const pausedOrInactive = tenants.filter(
    (tenant) => isPaused(tenant) || isDeactivated(tenant),
  );

  const recentOnboarding = onboarding
    .filter((item) => item.currentStage !== "live")
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    )
    .slice(0, 6);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography
          sx={{
            fontSize: 15,

            fontWeight: 900,
          }}
        >
          Platform control centre
        </Typography>

        <Typography
          sx={{
            mt: 0.5,

            color: "text.secondary",

            fontSize: 11,

            lineHeight: 1.6,
          }}
        >
          Monitor school applications, onboarding readiness, trials and
          operational customer accounts.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            sm: "repeat(2, minmax(0, 1fr))",

            lg: "repeat(3, minmax(0, 1fr))",
          },

          gap: 1,
        }}
      >
        <MetricCard
          title="Pending review"
          value={pendingReview.length}
          description="New school applications awaiting Platform Admin verification."
          icon={<ScheduleRounded fontSize="small" />}
          onClick={onOpenOnboarding}
        />

        <MetricCard
          title="In onboarding"
          value={inOnboarding.length}
          description="Approved schools still completing setup and migration."
          icon={<FactCheckRounded fontSize="small" />}
          onClick={onOpenOnboarding}
        />

        <MetricCard
          title="Ready to launch"
          value={readyToLaunch.length}
          description="Schools that have satisfied Steps 1–11 and can be activated."
          icon={<RocketLaunchRounded fontSize="small" />}
          onClick={onOpenOnboarding}
        />

        <MetricCard
          title="Live schools"
          value={liveSchools.length}
          description="Activated schools on an effective paid subscription."
          icon={<SchoolRounded fontSize="small" />}
          onClick={onOpenSchools}
        />

        <MetricCard
          title="On trial"
          value={trialSchools.length}
          description="Operational schools currently using a time-limited trial."
          icon={<TaskAltRounded fontSize="small" />}
          onClick={onOpenSchools}
        />

        <MetricCard
          title="Paused / inactive"
          value={pausedOrInactive.length}
          description="Paused, expired or deactivated school accounts requiring attention."
          icon={<PauseCircleOutlineRounded fontSize="small" />}
          onClick={onOpenSchools}
        />
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: 2.25,

          borderRadius: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: 14,

            fontWeight: 850,
          }}
        >
          Recent onboarding activity
        </Typography>

        <Typography
          sx={{
            mt: 0.35,

            color: "text.secondary",

            fontSize: 10,
          }}
        >
          Most recently updated school onboarding records.
        </Typography>

        {recentOnboarding.length === 0 ? (
          <Typography
            sx={{
              mt: 2,

              color: "text.secondary",

              fontSize: 11,
            }}
          >
            No active onboarding records.
          </Typography>
        ) : (
          <Stack
            spacing={1}
            sx={{
              mt: 2,
            }}
          >
            {recentOnboarding.map((item) => (
              <Box
                key={item.tenantId}
                sx={{
                  display: "flex",

                  alignItems: {
                    xs: "flex-start",

                    sm: "center",
                  },

                  justifyContent: "space-between",

                  gap: 1.5,

                  py: 1,

                  borderBottom: "1px solid",

                  borderColor: "divider",

                  flexDirection: {
                    xs: "column",

                    sm: "row",
                  },
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 12,

                      fontWeight: 800,
                    }}
                  >
                    {item.tenantName}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.2,

                      color: "text.secondary",

                      fontSize: 9.5,
                    }}
                  >
                    {item.completedRequiredSteps}
                    {" / "}
                    {item.requiredSteps}
                    {" required steps complete"}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={0.75}
                  useFlexGap
                  sx={{
                    flexWrap: "wrap",
                  }}
                >
                  <Chip
                    size="small"
                    label={item.approvalStatus.replaceAll("_", " ")}
                    variant="outlined"
                  />

                  <Chip
                    size="small"
                    label={item.currentStage.replaceAll("_", " ")}
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
