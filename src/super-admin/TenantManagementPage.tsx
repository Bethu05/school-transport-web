import {
  ArrowBackRounded,
  BusinessRounded,
  CellTowerRounded,
  DomainRounded,
  FactCheckRounded,
  GpsFixedRounded,
  GroupsRounded,
  LockRounded,
  PaymentsRounded,
  RefreshRounded,
  SensorsRounded,
  TuneRounded,
} from "@mui/icons-material";

import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
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
import { TenantFeatureAccess } from "./TenantFeatureAccess";
import { TenantFeatureLimits } from "./TenantFeatureLimits";
import { TenantInitialAdminActions } from "./TenantInitialAdminActions";
import { TenantOnboardingPanel } from "./TenantOnboardingPanel";
import { TenantProfileActions } from "./TenantProfileActions";

import {
  getPlatformTenantCapacity,
  getPlatformTenantOnboardingStatus,
  listPlatformVehicles,
  type PlatformVehicleTracker,
  type PlatformTenantListItem,
} from "./platform.api";

type ManagementPanel =
  | "details"
  | "onboarding"
  | "subscription"
  | "capacity"
  | "features"
  | "administrator"
  | "trackers"
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
          borderRadius: 1.25,
          bgcolor: "rgba(30, 35, 41, 0.65)",
          borderColor: "rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.22)",
          transition:
            "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
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
            <Typography sx={{ fontSize: 14, fontWeight: 850 }}>
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
              bgcolor: "rgba(255, 255, 255, 0.06)",
              color: "primary.main",
            }}
          >
            {icon}
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>{children}</Box>

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

function TenantTrackersPanel({ tenantId }: { tenantId: string }) {
  const [selectedVehicle, setSelectedVehicle] =
    useState<PlatformVehicleTracker | null>(null);

  const trackersQuery = useQuery({
    queryKey: ["platform-tenant-trackers", tenantId],
    queryFn: async () =>
      (await listPlatformVehicles()).filter(
        (vehicle) => vehicle.tenantId === tenantId,
      ),
  });

  const vehicles = trackersQuery.data ?? [];
  const configuredCount = vehicles.filter((v) => Boolean(v.gpsDeviceId)).length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
            Tenant GPS Hardware Inventory
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {configuredCount} of {vehicles.length} vehicles have GPS device
            IDs configured.
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshRounded />}
          onClick={() => trackersQuery.refetch()}
        >
          Refresh
        </Button>
      </Box>

      {trackersQuery.isLoading ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          <CircularProgress size={24} />
        </Box>
      ) : trackersQuery.isError ? (
        <Alert severity="error">
          {trackersQuery.error instanceof Error
            ? trackersQuery.error.message
            : "Failed to load tenant trackers."}
        </Alert>
      ) : vehicles.length === 0 ? (
        <Alert severity="info">
          No vehicles registered under this tenant.
        </Alert>
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          {vehicles.map((v, idx) => {
            const isConfigured = Boolean(v.gpsDeviceId);
            return (
              <Box
                key={v.id}
                sx={{
                  p: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom:
                    idx === vehicles.length - 1 ? "none" : "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {v.registrationNumber}
                    </Typography>
                    <Chip
                      size="small"
                      icon={isConfigured ? <SensorsRounded /> : undefined}
                      label={isConfigured ? "Configured" : "Unconfigured"}
                      color={isConfigured ? "success" : "warning"}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: "monospace" }}
                  >
                    IMEI: {v.gpsDeviceId || "Unassigned"} | Port:{" "}
                    {v.listenerPort || 5027} (
                    {v.gpsProtocol?.toUpperCase() || "GT06"})
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CellTowerRounded sx={{ fontSize: 14 }} />}
                  onClick={() => setSelectedVehicle(v)}
                >
                  View telemetry
                </Button>
              </Box>
            );
          })}
        </Paper>
      )}

      {selectedVehicle && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: "rgba(0,0,0,0.3)",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 800 }}
          >
            Tracker telemetry: {selectedVehicle.registrationNumber} (IMEI:{" "}
            {selectedVehicle.gpsDeviceId || "unassigned"})
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {selectedVehicle.lastTelemetryAt
              ? `Last telemetry: ${new Date(selectedVehicle.lastTelemetryAt).toLocaleString()}`
              : "No telemetry received"}
          </Typography>
          <Button
            size="small"
            sx={{ mt: 1 }}
            onClick={() => void trackersQuery.refetch()}
            disabled={trackersQuery.isFetching}
          >
            Refresh telemetry
          </Button>
        </Paper>
      )}
    </Box>
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
      case "trackers":
        return "Tenant GPS Hardware & Trackers";
      default:
        return "";
    }
  }

  return (
    <Box>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box>
          <Button
            size="small"
            startIcon={<ArrowBackRounded />}
            onClick={onBack}
            sx={{ mb: 1, px: 0, textTransform: "none" }}
          >
            Back to schools
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
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
                sx={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.02em" }}
              >
                {tenant.name}
              </Typography>

              <Typography sx={{ color: "text.secondary", fontSize: 10 }}>
                {tenant.slug}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
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

      {/* CONTROL CENTRE GRID */}
      <Box
        sx={{
          mt: 2.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {/* TENANT DETAILS */}
        <ControlCard
          title="Tenant details"
          description="Organisation identity, location, contacts and profile."
          icon={<DomainRounded fontSize="small" />}
          onClick={() => setActivePanel("details")}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
            {tenant.name}
          </Typography>
          <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 10 }}>
            {tenant.timezone}
          </Typography>
        </ControlCard>

        {/* ONBOARDING */}
        <ControlCard
          title="Onboarding"
          description="Five-phase approval, setup, readiness and activation workflow."
          icon={<FactCheckRounded fontSize="small" />}
          onClick={() => setActivePanel("onboarding")}
        >
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Chip
              size="small"
              label="15 canonical steps"
              color="primary"
              variant="outlined"
            />
            <Chip size="small" label="Activation gated" variant="outlined" />
          </Stack>
        </ControlCard>

        {/* TRACKERS & GPS HARDWARE */}
        <ControlCard
          title="Trackers & Fleet Hardware"
          description="Inspect GPS hardware IMEIs, listener ports, and ping status for this tenant."
          icon={<GpsFixedRounded fontSize="small" />}
          onClick={() => setActivePanel("trackers")}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 750 }}>
            Hardware Telemetry
          </Typography>
          <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 10 }}>
            View configured IMEIs, listener gateway ports, and conduct live ping
            reachability tests.
          </Typography>
        </ControlCard>

        {/* SUBSCRIPTION */}
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
            sx={{ flexWrap: "wrap" }}
          >
            <Chip size="small" label={tenant.planName ?? "No plan"} />
            <Chip
              size="small"
              label={subscriptionLabel(tenant)}
              variant="outlined"
            />
          </Stack>
        </ControlCard>

        {/* CAPACITY */}
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
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Typography sx={{ mt: 0.2, fontSize: 13, fontWeight: 800 }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: "text.secondary", fontSize: 11 }}>
              {capacityQuery.isLoading
                ? "Loading capacity..."
                : "Capacity unavailable"}
            </Typography>
          )}
        </ControlCard>

        {/* FEATURES */}
        <ControlCard
          title="Features"
          description="Customer-specific feature allowances and overrides."
          icon={<TuneRounded fontSize="small" />}
          onClick={() => setActivePanel("features")}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 750 }}>
            Package features
          </Typography>
        </ControlCard>

        {/* ADMINISTRATOR */}
        <ControlCard
          title="Administrator"
          description="Initial account and emergency access recovery."
          icon={<LockRounded fontSize="small" />}
          onClick={() => setActivePanel("administrator")}
        >
          {onboardingQuery.isLoading ? (
            <Typography sx={{ color: "text.secondary", fontSize: 11 }}>
              Checking account...
            </Typography>
          ) : administrator ? (
            <>
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                {administrator.firstName} {administrator.lastName}
              </Typography>
              <Typography
                sx={{ mt: 0.3, color: "text.secondary", fontSize: 10 }}
              >
                {administrator.email}
              </Typography>
            </>
          ) : (
            <Chip size="small" label="Not configured" variant="outlined" />
          )}
        </ControlCard>
      </Box>

      <Dialog
        open={activePanel !== null}
        onClose={() => setActivePanel(null)}
        fullWidth
        maxWidth={
          activePanel === "onboarding"
            ? false
            : activePanel === "capacity" || activePanel === "trackers"
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
          <Typography sx={{ fontSize: 18, fontWeight: 850 }}>
            {dialogTitle()}
          </Typography>
          <Typography sx={{ mt: 0.25, color: "text.secondary", fontSize: 11 }}>
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
              : { p: 2.5 }
          }
        >
          {activePanel === "details" && (
            <TenantProfileActions
              tenant={tenant}
              onTenantUpdated={onTenantUpdated}
            />
          )}
          {activePanel === "onboarding" && (
            <Box sx={{ width: "100%", minHeight: 0 }}>
              <TenantOnboardingPanel
                tenant={tenant}
                onTenantUpdated={onTenantUpdated}
              />
            </Box>
          )}
          {activePanel === "subscription" && (
            <TenantCommercialActions
              tenant={tenant}
              onTenantUpdated={onTenantUpdated}
            />
          )}
          {activePanel === "capacity" && (
            <TenantCapacityActions tenant={tenant} />
          )}
          {activePanel === "trackers" && (
            <TenantTrackersPanel tenantId={tenant.id} />
          )}
          {activePanel === "features" && (
            <Stack spacing={3}>
              <TenantFeatureAccess tenant={tenant} />
              <TenantFeatureLimits tenant={tenant} />
            </Stack>
          )}
          {activePanel === "administrator" && (
            <Stack spacing={3}>
              <TenantInitialAdminActions tenant={tenant} />
              <TenantAdminRecoveryActions tenant={tenant} />
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setActivePanel(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
