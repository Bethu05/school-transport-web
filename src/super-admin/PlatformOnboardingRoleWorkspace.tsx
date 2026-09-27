import { useState } from "react";

import { CloseRounded } from "@mui/icons-material";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PLATFORM_PERMISSIONS,
  hasFrontendPlatformPermission,
} from "../auth/platform-permissions";

import {
  getPlatformOnboardingSummary,
  listOwnPlatformSchoolSetupRequests,
  listPlatformOnboardingQueue,
  type PlatformOnboardingQueueItem,
  type PlatformOnboardingSummary,
  type PlatformTenantListItem,
} from "./platform.api";

import { TenantOnboardingPanel } from "./TenantOnboardingPanel";

function tenantFromSummary(
  summary: PlatformOnboardingSummary,
): PlatformTenantListItem {
  const commercialStatus = summary.commercial?.subscriptionStatus;

  const subscriptionStatus =
    commercialStatus === "active" ||
    commercialStatus === "trialing" ||
    commercialStatus === "cancelled" ||
    commercialStatus === "expired"
      ? commercialStatus
      : null;

  return {
    id: summary.tenant.id,
    name: summary.tenant.name,
    slug: summary.tenant.slug,
    status: summary.tenant.status,
    timezone: summary.tenant.timezone,
    planCode: summary.commercial?.planCode ?? null,
    planName: summary.commercial?.planName ?? null,
    subscriptionStatus,
    subscriptionStartsAt: summary.commercial?.startsAt ?? null,
    subscriptionEndsAt: summary.commercial?.endsAt ?? null,
    subscriptionEffective: summary.workflow.live,
  };
}

export function PlatformOnboardingRoleWorkspace() {
  const { platformPermissions } = useAuth();

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const canReadAll = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.ONBOARDING_READ_ALL,
  );

  const canReadAssigned = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.ONBOARDING_READ_ASSIGNED,
  );

  const canReadOwnApplications = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_READ_OWN,
  );

  const queueQuery = useQuery({
    queryKey: ["platform", "onboarding", "queue"],
    queryFn: listPlatformOnboardingQueue,
    enabled: canReadAll,
  });

  const assignedApplicationsQuery = useQuery({
    queryKey: ["platform", "school-setup", "mine", "onboarding"],
    queryFn: listOwnPlatformSchoolSetupRequests,
    enabled: !canReadAll && canReadAssigned && canReadOwnApplications,
  });

  const selectedSummaryQuery = useQuery({
    queryKey: ["platform", "onboarding", "summary", selectedTenantId],
    queryFn: () => {
      if (!selectedTenantId) {
        throw new Error("No onboarding tenant selected");
      }

      return getPlatformOnboardingSummary(selectedTenantId);
    },
    enabled: selectedTenantId !== null,
  });

  const loading =
    (canReadAll && queueQuery.isLoading) ||
    (!canReadAll &&
      canReadAssigned &&
      canReadOwnApplications &&
      assignedApplicationsQuery.isLoading);

  if (loading) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  const readError = canReadAll
    ? queueQuery.error
    : assignedApplicationsQuery.error;

  if (readError) {
    return (
      <Alert severity="error">
        {readError instanceof Error
          ? readError.message
          : "Unable to load onboarding work"}
      </Alert>
    );
  }

  const assignedQueue: PlatformOnboardingQueueItem[] = (
    assignedApplicationsQuery.data ?? []
  )
    .filter(
      (application) =>
        application.status === "approved" && application.tenantId !== null,
    )
    .map((application) => ({
      tenantId: application.tenantId as string,
      tenantName: application.tenantName,
      tenantSlug: application.tenantSlug,
      tenantStatus: "assigned",
      approvalStatus: "approved",
      currentStage: "provisioning",
      completedRequiredSteps: 0,
      requiredSteps: 0,
      updatedAt: application.updatedAt,
    }));

  const queue = canReadAll ? (queueQuery.data?.items ?? []) : assignedQueue;
  const selectedTenant = selectedSummaryQuery.data
    ? tenantFromSummary(selectedSummaryQuery.data)
    : null;

  return (
    <Stack spacing={2} sx={{ height: "100%", minHeight: 0 }}>
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 900 }}>
          School onboarding
        </Typography>

        <Typography
          sx={{
            mt: 0.4,
            color: "text.secondary",
            fontSize: 10.5,
          }}
        >
          Permission-scoped onboarding queue and launch workflow.
        </Typography>
      </Box>

      {queue.length === 0 ? (
        <Alert severity="info">There is currently no onboarding work.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ minHeight: 0, overflow: "auto" }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>School</TableCell>
                <TableCell>Approval</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {queue.map((item) => {
                const progress =
                  item.requiredSteps > 0
                    ? Math.round(
                        (item.completedRequiredSteps / item.requiredSteps) *
                          100,
                      )
                    : 0;

                return (
                  <TableRow key={item.tenantId} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>
                        {item.tenantName}
                      </Typography>

                      <Typography sx={{ color: "text.secondary", fontSize: 9 }}>
                        {item.tenantSlug}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={item.approvalStatus.replaceAll("_", " ")}
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={item.currentStage.replaceAll("_", " ")}
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell sx={{ minWidth: 150 }}>
                      <Typography
                        sx={{
                          mb: 0.4,
                          color: "text.secondary",
                          fontSize: 9,
                        }}
                      >
                        {item.completedRequiredSteps} / {item.requiredSteps}
                      </Typography>

                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 5, borderRadius: 999 }}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => setSelectedTenantId(item.tenantId)}
                        sx={{ textTransform: "none" }}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={selectedTenantId !== null}
        onClose={() => setSelectedTenantId(null)}
        fullWidth
        maxWidth={false}
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "96vw", md: "92vw" },
            maxWidth: "92vw",
            height: { xs: "94vh", md: "90vh" },
            maxHeight: "94vh",
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle>
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 900 }}>
                {selectedTenant?.name ?? "School onboarding"}
              </Typography>

              {selectedTenant ? (
                <Typography sx={{ color: "text.secondary", fontSize: 9.5 }}>
                  {selectedTenant.slug}
                </Typography>
              ) : null}
            </Box>

            <IconButton
              aria-label="Close onboarding"
              onClick={() => setSelectedTenantId(null)}
            >
              <CloseRounded />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0, minHeight: 0 }}>
          {selectedSummaryQuery.isLoading ? (
            <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
              <CircularProgress size={28} />
            </Box>
          ) : selectedSummaryQuery.isError ? (
            <Alert severity="error">
              {selectedSummaryQuery.error instanceof Error
                ? selectedSummaryQuery.error.message
                : "Unable to load onboarding school"}
            </Alert>
          ) : selectedTenant ? (
            <TenantOnboardingPanel tenant={selectedTenant} />
          ) : null}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
