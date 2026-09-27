import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  NavigateBeforeRounded,
  NavigateNextRounded,
  RefreshRounded,
  RocketLaunchRounded,
  TaskAltRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PLATFORM_PERMISSIONS,
  hasFrontendPlatformPermission,
} from "../auth/platform-permissions";

import { TenantAdminRecoveryActions } from "./TenantAdminRecoveryActions";

import { OnboardingCommercialReview } from "./OnboardingCommercialReview";

import { TenantInitialAdminActions } from "./TenantInitialAdminActions";

import {
  activatePlatformOnboarding,
  getPlatformOnboardingSummary,
  getPlatformOnboardingWorkflow,
  reconcilePlatformOnboarding,
  setPlatformOnboardingApproval,
  updatePlatformOnboardingStep,
  type PlatformOnboardingApprovalStatus,
  type PlatformOnboardingStep,
  type PlatformOnboardingStepStatus,
  type PlatformOnboardingWorkflow,
  type PlatformTenantListItem,
} from "./platform.api";

interface TenantOnboardingPanelProps {
  tenant: PlatformTenantListItem;

  onTenantUpdated?: (tenant: PlatformTenantListItem) => void;
}

interface MigrationMethod {
  value:
    | "imported_xlsx"
    | "imported_csv"
    | "preloaded_dataset"
    | "no_migration_required";

  label: string;

  status: "completed" | "skipped";
}

type StatusColor = "default" | "success" | "warning" | "error" | "info";

const migrationMethods: MigrationMethod[] = [
  {
    value: "imported_xlsx",
    label: "Imported XLSX workbook",
    status: "completed",
  },
  {
    value: "imported_csv",
    label: "Imported CSV files",
    status: "completed",
  },
  {
    value: "preloaded_dataset",
    label: "Preloaded validated dataset",
    status: "completed",
  },
  {
    value: "no_migration_required",
    label: "No migration required",
    status: "skipped",
  },
];

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function stepColor(status: PlatformOnboardingStepStatus): StatusColor {
  switch (status) {
    case "completed":
      return "success";

    case "skipped":
      return "warning";

    case "blocked":
      return "error";

    case "in_progress":
      return "info";

    default:
      return "default";
  }
}

function approvalColor(status: PlatformOnboardingApprovalStatus): StatusColor {
  switch (status) {
    case "approved":
      return "success";

    case "rejected":
      return "error";

    default:
      return "warning";
  }
}

function stepComplete(step: PlatformOnboardingStep): boolean {
  return step.status === "completed" || step.status === "skipped";
}

const commercialBackendStepKeys = new Set([
  "package_selection",
  "package_limits",
  "feature_exceptions",
  "trial_configuration",
]);

interface OnboardingPhaseDefinition {
  key: string;
  label: string;
  description: string;
  stepKeys: readonly string[];
  completionStepKeys: readonly string[];
}

const onboardingPhaseDefinitions: readonly OnboardingPhaseDefinition[] = [
  {
    key: "application_verification",
    label: "Application & Verification",
    description: "Application, approval queue and organisation verification.",
    stepKeys: ["application_registration", "approval_queue", "verification"],
    completionStepKeys: [
      "application_registration",
      "approval_queue",
      "verification",
    ],
  },
  {
    key: "tenant_commercial_setup",
    label: "Tenant & Commercial Setup",
    description:
      "Choose the package and any optional purchasable features.",
    stepKeys: [
      "tenant_provisioning",
      "package_selection",
      "package_limits",
      "feature_exceptions",
      "trial_configuration",
    ],
    completionStepKeys: [
      "tenant_provisioning",
      "package_selection",
      "package_limits",
      "feature_exceptions",
      "trial_configuration",
    ],
  },
  {
    key: "administrator_data",
    label: "Administrator & Data",
    description: "Administrator provisioning and any required data migration.",
    stepKeys: ["account_setup", "data_migration"],
    completionStepKeys: ["account_setup", "data_migration"],
  },
  {
    key: "launch_readiness",
    label: "Launch Readiness",
    description: "Validate the school against the backend launch gate.",
    stepKeys: ["launch_validation"],
    completionStepKeys: ["launch_validation"],
  },
  {
    key: "activation_handover",
    label: "Activation & Handover",
    description: "Activate the school and complete operational handover.",
    stepKeys: ["activation", "onboarding_summary"],
    completionStepKeys: ["activation", "onboarding_summary"],
  },
];

function onboardingPhaseStatus(
  steps: readonly PlatformOnboardingStep[],
  completionStepKeys: readonly string[],
): PlatformOnboardingStepStatus {
  const completionSteps = completionStepKeys
    .map((key) => steps.find((step) => step.stepKey === key))
    .filter((step): step is PlatformOnboardingStep => step !== undefined);

  if (completionSteps.some((step) => step.status === "blocked")) {
    return "blocked";
  }

  if (completionSteps.length > 0 && completionSteps.every(stepComplete)) {
    return "completed";
  }

  if (
    completionSteps.some(
      (step) => step.status === "in_progress" || stepComplete(step),
    )
  ) {
    return "in_progress";
  }

  return "pending";
}

function StepEvidence({ step }: { step: PlatformOnboardingStep }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        mt: 3,
        p: 2,
        borderRadius: 2,
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 850,
        }}
      >
        Step evidence
      </Typography>

      <Box
        sx={{
          mt: 1.5,

          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
          },

          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 9,
              textTransform: "uppercase",
            }}
          >
            Status
          </Typography>

          <Typography
            sx={{
              mt: 0.3,
              fontSize: 11,
              fontWeight: 750,
            }}
          >
            {humanize(step.status)}
          </Typography>
        </Box>

        <Box>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 9,
              textTransform: "uppercase",
            }}
          >
            Completion method
          </Typography>

          <Typography
            sx={{
              mt: 0.3,
              fontSize: 11,
              fontWeight: 750,
            }}
          >
            {step.completionMethod
              ? humanize(step.completionMethod)
              : "Not yet recorded"}
          </Typography>
        </Box>

        <Box>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 9,
              textTransform: "uppercase",
            }}
          >
            Completed
          </Typography>

          <Typography
            sx={{
              mt: 0.3,
              fontSize: 11,
              fontWeight: 750,
            }}
          >
            {formatDateTime(step.completedAt)}
          </Typography>
        </Box>

        <Box>
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 9,
              textTransform: "uppercase",
            }}
          >
            Launch requirement
          </Typography>

          <Typography
            sx={{
              mt: 0.3,
              fontSize: 11,
              fontWeight: 750,
            }}
          >
            {step.requiredForActivation
              ? "Required for activation"
              : "Post-activation / tooling"}
          </Typography>
        </Box>
      </Box>

      {step.notes ? (
        <Typography
          sx={{
            mt: 1.5,
            color: "text.secondary",
            fontSize: 10,
            lineHeight: 1.6,
          }}
        >
          {step.notes}
        </Typography>
      ) : null}
    </Paper>
  );
}

export function TenantOnboardingPanel({
  tenant,
  onTenantUpdated,
}: TenantOnboardingPanelProps) {
  const queryClient = useQueryClient();

  const { isSuperAdmin, platformPermissions } = useAuth();

  const canApproveOnboarding = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.ONBOARDING_APPROVE,
  );

  const canManageOnboarding =
    hasFrontendPlatformPermission(
      platformPermissions,
      FRONTEND_PLATFORM_PERMISSIONS.ONBOARDING_MANAGE,
    ) ||
    hasFrontendPlatformPermission(
      platformPermissions,
      FRONTEND_PLATFORM_PERMISSIONS.ONBOARDING_UPDATE_ASSIGNED,
    );

  const canConfigureCommercial = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.ONBOARDING_CONFIGURE_COMMERCIAL,
  );

  const canProvisionAdmin = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.ONBOARDING_PROVISION_ADMIN,
  );

  const canActivateTenant = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_ACTIVATE,
  );

  const workflowKey = [
    "platform",
    "onboarding",
    "workflow",
    tenant.id,
  ] as const;

  const summaryKey = ["platform", "onboarding", "summary", tenant.id] as const;

  const [selectedStepOrder, setSelectedStepOrder] = useState<number | null>(
    null,
  );

  const [approvalNotes, setApprovalNotes] = useState("");

  const [migrationMethod, setMigrationMethod] =
    useState<MigrationMethod["value"]>("imported_xlsx");

  const [migrationNotes, setMigrationNotes] = useState("");

  const [launchReviewConfirmed, setLaunchReviewConfirmed] = useState(false);

  const [activationNotes, setActivationNotes] = useState("");

  const workflowQuery = useQuery({
    queryKey: workflowKey,

    queryFn: () => getPlatformOnboardingWorkflow(tenant.id),
  });

  const summaryQuery = useQuery({
    queryKey: summaryKey,

    queryFn: () => getPlatformOnboardingSummary(tenant.id),
  });

  async function acceptWorkflow(
    nextWorkflow: PlatformOnboardingWorkflow,
  ): Promise<void> {
    queryClient.setQueryData(workflowKey, nextWorkflow);

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: summaryKey,
      }),

      queryClient.invalidateQueries({
        queryKey: ["platform", "onboarding", "queue"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["platform", "tenants"],
      }),
    ]);
  }

  const approvalMutation = useMutation({
    mutationFn: ({
      approvalStatus,
      notes,
    }: {
      approvalStatus: "approved" | "rejected";

      notes?: string;
    }) =>
      setPlatformOnboardingApproval(tenant.id, {
        approvalStatus,

        ...(notes
          ? {
              notes,
            }
          : {}),
      }),

    onSuccess: async (nextWorkflow) => {
      setApprovalNotes("");

      await acceptWorkflow(nextWorkflow);
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: () => reconcilePlatformOnboarding(tenant.id),

    onSuccess: acceptWorkflow,
  });

  const migrationMutation = useMutation({
    mutationFn: async () => {
      const method = migrationMethods.find(
        (candidate) => candidate.value === migrationMethod,
      );

      if (!method) {
        throw new Error("Select a valid migration method");
      }

      const notes = migrationNotes.trim();

      if (notes.length < 3) {
        throw new Error(
          "Record a short migration note, source or reason before continuing.",
        );
      }

      await updatePlatformOnboardingStep(tenant.id, "data_migration", {
        status: method.status,

        completionMethod: method.value,

        notes,

        metadata: {
          recordedFrom: "platform_super_admin_ui",

          migrationMethod: method.value,
        },
      });

      /*
       * Step 11 is evidence-driven.
       * Recording Step 10 never directly completes
       * launch validation; reconciliation asks the
       * backend to determine the canonical state.
       */
      return reconcilePlatformOnboarding(tenant.id);
    },

    onSuccess: async (nextWorkflow) => {
      setMigrationNotes("");

      await acceptWorkflow(nextWorkflow);
    },
  });

  const activationMutation = useMutation({
    mutationFn: () =>
      activatePlatformOnboarding(tenant.id, {
        ...(activationNotes.trim()
          ? {
              notes: activationNotes.trim(),
            }
          : {}),
      }),

    onSuccess: async (nextWorkflow) => {
      setActivationNotes("");

      await acceptWorkflow(nextWorkflow);
    },
  });

  const busy =
    approvalMutation.isPending ||
    reconcileMutation.isPending ||
    migrationMutation.isPending ||
    activationMutation.isPending;

  const actionError =
    approvalMutation.error ??
    reconcileMutation.error ??
    migrationMutation.error ??
    activationMutation.error;

  if (workflowQuery.isLoading) {
    return (
      <Box
        sx={{
          height: "100%",
          minHeight: 500,
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress size={30} />
      </Box>
    );
  }

  if (workflowQuery.isError) {
    return (
      <Alert severity="error">
        {workflowQuery.error instanceof Error
          ? workflowQuery.error.message
          : "Unable to load onboarding workflow"}
      </Alert>
    );
  }

  if (!workflowQuery.data) {
    return (
      <Alert severity="error">Tenant onboarding workflow is unavailable.</Alert>
    );
  }

  /*
   * Give the successfully-loaded workflow an explicitly non-null
   * type. This keeps TypeScript's narrowing valid inside the nested
   * step-render function as well as the outer component render.
   */
  const workflow: PlatformOnboardingWorkflow = workflowQuery.data;

  const steps = [...workflow.steps]
    .filter((step) => step.stepOrder <= 13)
    .sort((left, right) => left.stepOrder - right.stepOrder);

  if (steps.length === 0) {
    return <Alert severity="error">Onboarding steps are unavailable.</Alert>;
  }

  /*
   * The selected step is purely a UI navigation state.
   *
   * Previous / Next NEVER completes a step.
   * Persisted backend evidence remains authoritative.
   */
  /*
   * Backend Steps 5-8 remain one transactional commercial
   * configuration, but every persisted onboarding record is now
   * visible as its own canonical numbered step.
   */
  const commercialSteps = steps.filter((step) =>
    commercialBackendStepKeys.has(step.stepKey),
  );

  const visibleSteps = steps;

  /*
   * Production onboarding defaults only through canonical Steps 1-13.
   * Demo-only Steps 14-15 remain persisted and inspectable, but never
   * become the default production workflow position.
   */
  const operationalSteps = steps.filter((step) => step.stepOrder <= 13);

  const defaultStep =
    operationalSteps.find((step) => !stepComplete(step)) ??
    operationalSteps[operationalSteps.length - 1] ??
    steps[0];

  const activeStep =
    visibleSteps.find((step) => step.stepOrder === selectedStepOrder) ??
    defaultStep;

  const phases = onboardingPhaseDefinitions.map((definition) => ({
    ...definition,

    steps: steps.filter((step) => definition.stepKeys.includes(step.stepKey)),

    status: onboardingPhaseStatus(steps, definition.completionStepKeys),
  }));

  const activePhase =
    phases.find((phase) =>
      phase.steps.some((step) => step.stepOrder === activeStep.stepOrder),
    ) ?? phases.find((phase) => phase.steps.length > 0);

  if (!activePhase) {
    return <Alert severity="error">Onboarding phases are unavailable.</Alert>;
  }

  const activePhaseKey = activePhase.key;

  const activePhaseIndex = phases.findIndex(
    (phase) => phase.key === activePhaseKey,
  );

  function phaseEntryStep(
    phase: (typeof phases)[number],
  ): PlatformOnboardingStep | undefined {
    const completionSteps = phase.steps.filter((step) =>
      phase.completionStepKeys.includes(step.stepKey),
    );

    return (
      completionSteps.find((step) => !stepComplete(step)) ??
      completionSteps[completionSteps.length - 1] ??
      phase.steps[0]
    );
  }

  const previousPhase =
    activePhaseIndex > 0 ? phases[activePhaseIndex - 1] : null;

  const nextPhase =
    activePhaseIndex < phases.length - 1 ? phases[activePhaseIndex + 1] : null;

  const summary = summaryQuery.data;

  const live = summary?.workflow.live ?? workflow.currentStage === "live";

  const readyToActivate = summary?.workflow.readyToActivate ?? false;

  const requiredSteps = steps.filter((step) => step.requiredForActivation);

  const completedRequired = requiredSteps.filter(stepComplete).length;

  const progressPercent =
    summary?.progress.percent ??
    Math.round((completedRequired / Math.max(requiredSteps.length, 1)) * 100);

  const migrationStep = steps.find((step) => step.stepKey === "data_migration");

  const handleTenantUpdated = onTenantUpdated ?? (() => undefined);

  function renderStepContent() {
    /*
     * Phase 1 is deliberately presented as one operator review.
     * The canonical application / queue / verification records remain
     * persisted backend evidence, but are not exposed as separate screens.
     */
    if (activePhaseKey === "application_verification") {
      const verificationStep = steps.find(
        (step) => step.stepKey === "verification",
      );

      return (
        <Stack spacing={2}>
          <Box>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              Application review
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                color: "text.secondary",
                fontSize: 10.5,
                lineHeight: 1.6,
              }}
            >
              Review the school application and record the verification decision
              before continuing to commercial setup.
            </Typography>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 1.75,
              borderRadius: 1.5,
              borderColor: "rgba(255, 255, 255, 0.10)",
              bgcolor: "rgba(255, 255, 255, 0.035)",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "minmax(0, 1.4fr) repeat(2, minmax(0, 1fr))",
                },
                gap: 1.5,
                alignItems: "center",
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 8.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  School
                </Typography>

                <Typography
                  sx={{
                    mt: 0.35,
                    fontSize: 13,
                    fontWeight: 850,
                  }}
                >
                  {tenant.name}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.2,
                    color: "text.secondary",
                    fontSize: 9.5,
                  }}
                >
                  {humanize(tenant.status)}
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{
                    mb: 0.55,
                    color: "text.secondary",
                    fontSize: 8.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Application status
                </Typography>

                <Chip
                  size="small"
                  label={humanize(workflow.approvalStatus)}
                  color={
                    workflow.approvalStatus === "approved"
                      ? "success"
                      : workflow.approvalStatus === "rejected"
                        ? "error"
                        : "warning"
                  }
                  variant="outlined"
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    mb: 0.55,
                    color: "text.secondary",
                    fontSize: 8.5,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Verification status
                </Typography>

                <Chip
                  size="small"
                  label={humanize(verificationStep?.status ?? "pending")}
                  color={stepColor(verificationStep?.status ?? "pending")}
                  variant="outlined"
                />
              </Box>
            </Box>
          </Paper>

          {workflow.approvalStatus === "approved" ? (
            <Alert severity="success">
              School application approved. Commercial setup can now proceed.
            </Alert>
          ) : null}

          {workflow.approvalStatus === "rejected" ? (
            <Alert severity="error">
              Application rejected
              {workflow.rejectionReason ? ` — ${workflow.rejectionReason}` : ""}
            </Alert>
          ) : null}

          {workflow.approvalStatus === "pending_review" ? (
            <Alert severity="info">
              Review the application details, record any relevant verification
              notes, then approve or reject the school.
            </Alert>
          ) : null}

          <TextField
            label="Verification notes / rejection reason"
            value={approvalNotes}
            onChange={(event) => {
              setApprovalNotes(event.target.value);
              approvalMutation.reset();
            }}
            disabled={busy || live || !canApproveOnboarding}
            multiline
            minRows={3}
            helperText={
              canApproveOnboarding
                ? "Optional when approving. A reason is required when rejecting."
                : "Read-only: your platform access does not allow approval decisions."
            }
            fullWidth
          />
        </Stack>
      );
    }

    /*
     * Phase 3 combines administrator provisioning and data migration
     * into one operator-facing workspace.
     *
     * Canonical account_setup and data_migration records remain
     * independently persisted by the backend.
     */
    if (activePhaseKey === "administrator_data") {
      const migrationAlreadyRecorded =
        migrationStep !== undefined && stepComplete(migrationStep);

      const skipImport =
        migrationMethod === "no_migration_required" ||
        migrationStep?.status === "skipped";

      return (
        <Stack spacing={1.75}>
          <Paper
            variant="outlined"
            sx={{
              p: 1.75,
              borderRadius: 1.5,
              borderColor: "rgba(255, 255, 255, 0.10)",
              bgcolor: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Initial administrator
                </Typography>

                <Typography
                  sx={{
                    mt: 0.3,
                    color: "text.secondary",
                    fontSize: 9.5,
                    lineHeight: 1.5,
                  }}
                >
                  Create or confirm the school administrator who will take over
                  day-to-day setup after onboarding.
                </Typography>
              </Box>

              {canProvisionAdmin ? (
                <TenantInitialAdminActions tenant={tenant} />
              ) : (
                <Alert severity="info">
                  Initial administrator provisioning is read-only for your
                  current platform access.
                </Alert>
              )}

              {isSuperAdmin ? (
                <>
                  <Divider />

                  <TenantAdminRecoveryActions tenant={tenant} />
                </>
              ) : null}
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 1.75,
              borderRadius: 1.5,
              borderColor: "rgba(255, 255, 255, 0.10)",
              bgcolor: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <Stack spacing={1.4}>
              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={1}
                sx={{
                  alignItems: {
                    xs: "flex-start",
                    sm: "center",
                  },
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 15,
                      fontWeight: 900,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Data Migration / Import
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.3,
                      color: "text.secondary",
                      fontSize: 9.5,
                      lineHeight: 1.5,
                    }}
                  >
                    Import existing transport data, or confirm that this school
                    is starting with a clean dataset.
                  </Typography>
                </Box>

                {migrationStep ? (
                  <Chip
                    size="small"
                    label={humanize(migrationStep.status)}
                    color={
                      stepComplete(migrationStep)
                        ? "success"
                        : stepColor(migrationStep.status)
                    }
                    variant="outlined"
                  />
                ) : null}
              </Stack>

              {migrationAlreadyRecorded ? (
                <Alert severity="success">
                  {migrationStep?.status === "skipped"
                    ? "Import was intentionally skipped and the decision has been recorded."
                    : "Migration/import evidence has been recorded."}
                </Alert>
              ) : (
                <>
                  <Paper
                    variant="outlined"
                    sx={{
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.5,
                      borderColor: skipImport
                        ? "rgba(37, 99, 235, 0.42)"
                        : "rgba(255, 255, 255, 0.08)",
                      bgcolor: skipImport
                        ? "rgba(37, 99, 235, 0.06)"
                        : "transparent",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{
                        alignItems: "center",
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={skipImport}
                        disabled={
                          busy ||
                          !canManageOnboarding ||
                          workflow.approvalStatus !== "approved" ||
                          live
                        }
                        onChange={(event) => {
                          migrationMutation.reset();

                          if (event.target.checked) {
                            setMigrationMethod("no_migration_required");

                            if (migrationNotes.trim().length < 3) {
                              setMigrationNotes(
                                "School will start fresh without imported legacy data.",
                              );
                            }

                            return;
                          }

                          setMigrationMethod("imported_xlsx");

                          if (
                            migrationNotes ===
                            "School will start fresh without imported legacy data."
                          ) {
                            setMigrationNotes("");
                          }
                        }}
                      />

                      <Box>
                        <Typography
                          sx={{
                            fontSize: 10.5,
                            fontWeight: 850,
                          }}
                        >
                          Skip import — start fresh
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.1,
                            color: "text.secondary",
                            fontSize: 8.5,
                          }}
                        >
                          Use when the school has no existing transport records
                          to migrate.
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  {!skipImport ? (
                    <TextField
                      select
                      size="small"
                      label="Import method"
                      value={migrationMethod}
                      onChange={(event) => {
                        setMigrationMethod(
                          event.target.value as MigrationMethod["value"],
                        );

                        migrationMutation.reset();
                      }}
                      disabled={
                        busy ||
                        !canManageOnboarding ||
                        workflow.approvalStatus !== "approved" ||
                        live
                      }
                      sx={{
                        maxWidth: 420,
                      }}
                      fullWidth
                    >
                      {migrationMethods
                        .filter(
                          (method) =>
                            method.value !== "no_migration_required",
                        )
                        .map((method) => (
                          <MenuItem
                            key={method.value}
                            value={method.value}
                          >
                            {method.label}
                          </MenuItem>
                        ))}
                    </TextField>
                  ) : null}

                  <TextField
                    size="small"
                    label={
                      skipImport
                        ? "Reason for skipping import"
                        : "Import evidence / notes"
                    }
                    value={migrationNotes}
                    onChange={(event) => {
                      setMigrationNotes(event.target.value);

                      migrationMutation.reset();
                    }}
                    placeholder={
                      skipImport
                        ? "Example: New school — no legacy transport data exists."
                        : "Example: Student and route workbook imported and validated."
                    }
                    disabled={
                      busy ||
                      !canManageOnboarding ||
                      workflow.approvalStatus !== "approved" ||
                      live
                    }
                    multiline
                    minRows={2}
                    fullWidth
                  />
                </>
              )}

              {migrationStep?.completionMethod ? (
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 8.5,
                  }}
                >
                  Recorded method:{" "}
                  {humanize(migrationStep.completionMethod)}
                </Typography>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      );
    }

    if (activePhaseKey === "launch_readiness") {
      return (
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
            Launch readiness
          </Typography>

          {readyToActivate ? (
            <Alert severity="success">
              All required onboarding evidence is currently satisfied.
            </Alert>
          ) : (
            <Alert severity="warning">
              Outstanding onboarding requirements remain.
            </Alert>
          )}

          {summary && summary.blockers.length > 0 ? (
            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
              <Typography sx={{ mb: 0.75, fontSize: 10.5, fontWeight: 850 }}>
                Outstanding items
              </Typography>

              {summary.blockers.map((blocker) => (
                <Typography
                  key={blocker.stepKey}
                  sx={{ color: "text.secondary", fontSize: 9.5 }}
                >
                  • {blocker.stepName}
                </Typography>
              ))}
            </Paper>
          ) : null}

          <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={0.75}>
              <Checkbox
                size="small"
                checked={launchReviewConfirmed}
                disabled={busy || !canManageOnboarding || live}
                onChange={(event) => {
                  setLaunchReviewConfirmed(event.target.checked);
                  reconcileMutation.reset();
                }}
              />

              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 850 }}>
                  Confirm personal review
                </Typography>

                <Typography sx={{ color: "text.secondary", fontSize: 8.75 }}>
                  I have personally reviewed the launch-readiness evidence and
                  confirm that I am deliberately initiating this validation.
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      );
    }

    if (activePhaseKey === "activation_handover") {
      const migrationStatus = migrationStep?.status ?? "pending";

      return (
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
            Activation & handover
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
              gap: 1,
            }}
          >
            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
              <Typography sx={{ color: "text.secondary", fontSize: 8 }}>
                PACKAGE
              </Typography>
              <Typography sx={{ mt: 0.4, fontSize: 10.5, fontWeight: 850 }}>
                {summary?.commercial?.planName ?? tenant.planName ?? "Not configured"}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
              <Typography sx={{ color: "text.secondary", fontSize: 8 }}>
                ADMINISTRATOR
              </Typography>
              <Typography sx={{ mt: 0.4, fontSize: 10.5, fontWeight: 850 }}>
                {summary?.initialAdmin?.email ?? "Not configured"}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
              <Typography sx={{ color: "text.secondary", fontSize: 8 }}>
                DATA MIGRATION
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  size="small"
                  label={humanize(migrationStatus)}
                  color={stepColor(migrationStatus)}
                  variant="outlined"
                />
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5 }}>
              <Typography sx={{ color: "text.secondary", fontSize: 8 }}>
                LAUNCH READINESS
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  size="small"
                  label={live ? "Live" : readyToActivate ? "Ready" : "Pending"}
                  color={live || readyToActivate ? "success" : "warning"}
                  variant="outlined"
                />
              </Box>
            </Paper>
          </Box>

          {live ? (
            <Alert severity="success">
              School onboarding is complete and the school is live. Operational
              ownership can now be handed over to the school administrator.
            </Alert>
          ) : readyToActivate ? (
            <Alert severity="success">
              All launch requirements are satisfied. The school is ready for activation.
            </Alert>
          ) : (
            <Alert severity="warning">
              Activation remains locked until Launch Readiness is satisfied.
            </Alert>
          )}

          {!live ? (
            <TextField
              size="small"
              label="Activation / handover note"
              value={activationNotes}
              onChange={(event) => {
                setActivationNotes(event.target.value);
                activationMutation.reset();
              }}
              disabled={busy || !readyToActivate || !canActivateTenant}
              multiline
              minRows={2}
              fullWidth
            />
          ) : null}
        </Stack>
      );
    }

    if (activePhaseKey === "tenant_commercial_setup") {
      return canConfigureCommercial ? (
        <OnboardingCommercialReview
          tenant={tenant}
          commercialSteps={commercialSteps}
          onTenantUpdated={handleTenantUpdated}
        />
      ) : (
        <Alert severity="info">
          Commercial setup is read-only for your current platform access.
        </Alert>
      );
    }

    switch (activeStep.stepKey) {
      case "application_registration":
        return (
          <Stack spacing={2}>
            <Alert severity="success">
              The school organisation exists and its canonical onboarding
              workflow has been created.
            </Alert>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              Registration is system-managed. No manual completion control is
              provided here.
            </Typography>
          </Stack>
        );

      case "approval_queue":
        return (
          <Stack spacing={2}>
            <Alert
              severity={
                workflow.approvalStatus === "pending_review"
                  ? "warning"
                  : "info"
              }
            >
              Approval status: {humanize(workflow.approvalStatus)}
            </Alert>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              This step represents the school's position in the Platform Admin
              approval queue.
            </Typography>
          </Stack>
        );

      case "verification":
        return (
          <Stack spacing={2}>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 850,
              }}
            >
              School verification & approval
            </Typography>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 11,
                lineHeight: 1.7,
              }}
            >
              Verify the organisation before commercial and operational setup.
              Approval does not activate the school.
            </Typography>

            {workflow.approvalStatus === "approved" ? (
              <Alert severity="success">School approved.</Alert>
            ) : null}

            {workflow.approvalStatus === "rejected" ? (
              <Alert severity="error">
                Application rejected
                {workflow.rejectionReason
                  ? ` — ${workflow.rejectionReason}`
                  : ""}
              </Alert>
            ) : null}

            <TextField
              label="Verification notes / rejection reason"
              value={approvalNotes}
              onChange={(event) => {
                setApprovalNotes(event.target.value);

                approvalMutation.reset();
              }}
              disabled={busy || live || !canApproveOnboarding}
              multiline
              minRows={5}
              helperText={
                canApproveOnboarding
                  ? "Required when rejecting; optional when approving."
                  : "Read-only: your platform permissions do not allow an approval decision."
              }
              fullWidth
            />
          </Stack>
        );

      case "tenant_provisioning":
        return (
          <Stack spacing={2}>
            <Alert severity="info">
              Tenant provisioning is verified from persisted platform evidence.
            </Alert>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              Use Reconcile verified evidence after provisioning changes. This
              step cannot be manually bypassed.
            </Typography>
          </Stack>
        );

      case "package_selection":
      case "package_limits":
      case "feature_exceptions":
      case "trial_configuration":
        return canConfigureCommercial ? (
          <OnboardingCommercialReview
            tenant={tenant}
            commercialSteps={commercialSteps}
            onTenantUpdated={handleTenantUpdated}
          />
        ) : (
          <Alert severity="info">
            Commercial setup is read-only for your current platform access.
          </Alert>
        );

      case "account_setup":
        return (
          <Stack spacing={3}>
            {canProvisionAdmin ? (
              <TenantInitialAdminActions tenant={tenant} />
            ) : (
              <Alert severity="info">
                Initial administrator provisioning is not included in your
                current platform access.
              </Alert>
            )}

            {isSuperAdmin ? (
              <>
                <Divider />

                <TenantAdminRecoveryActions tenant={tenant} />
              </>
            ) : null}
          </Stack>
        );

      case "data_migration": {
        const migrationAlreadyRecorded =
          migrationStep !== undefined && stepComplete(migrationStep);

        const skipImport =
          migrationMethod === "no_migration_required" ||
          migrationStep?.status === "skipped";

        return (
          <Stack spacing={2.25}>
            <Box>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 900,
                  }}
                >
                  Data migration
                </Typography>

                <Chip
                  size="small"
                  label="Optional"
                  color="info"
                  variant="outlined"
                />

                {migrationStep ? (
                  <Chip
                    size="small"
                    label={humanize(migrationStep.status)}
                    color={
                      stepComplete(migrationStep)
                        ? "success"
                        : stepColor(migrationStep.status)
                    }
                    variant="outlined"
                  />
                ) : null}
              </Stack>

              <Typography
                sx={{
                  mt: 0.65,
                  color: "text.secondary",
                  fontSize: 11,
                  lineHeight: 1.7,
                }}
              >
                Import existing transport data only when the school needs it. A
                new school can skip import and start with a clean dataset.
                Either choice is recorded as onboarding evidence.
              </Typography>
            </Box>

            {migrationAlreadyRecorded ? (
              <Alert severity="success">
                {migrationStep?.status === "skipped"
                  ? "Import was intentionally skipped and onboarding progress has been updated."
                  : "Migration evidence has been recorded."}
              </Alert>
            ) : null}

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                borderColor: skipImport ? "primary.main" : "divider",
                bgcolor: skipImport ? "action.selected" : "background.paper",
              }}
            >
              <Stack
                direction="row"
                spacing={1.25}
                sx={{
                  alignItems: "flex-start",
                }}
              >
                <Checkbox
                  checked={skipImport}
                  disabled={
                    busy ||
                    !canManageOnboarding ||
                    workflow.approvalStatus !== "approved" ||
                    live ||
                    migrationAlreadyRecorded
                  }
                  onChange={(event) => {
                    migrationMutation.reset();

                    if (event.target.checked) {
                      setMigrationMethod("no_migration_required");

                      if (migrationNotes.trim().length < 3) {
                        setMigrationNotes(
                          "School will start fresh without imported legacy data.",
                        );
                      }

                      return;
                    }

                    setMigrationMethod("imported_xlsx");

                    if (
                      migrationNotes ===
                      "School will start fresh without imported legacy data."
                    ) {
                      setMigrationNotes("");
                    }
                  }}
                />

                <Box
                  sx={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 850,
                    }}
                  >
                    Skip import — start fresh
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,
                      color: "text.secondary",
                      fontSize: 10,
                      lineHeight: 1.6,
                    }}
                  >
                    Tick this when the school has no existing student, route,
                    vehicle, driver or transport data that needs to be migrated.
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {!skipImport && !migrationAlreadyRecorded ? (
              <TextField
                select
                label="Import method"
                value={migrationMethod}
                onChange={(event) => {
                  setMigrationMethod(
                    event.target.value as MigrationMethod["value"],
                  );

                  migrationMutation.reset();
                }}
                disabled={
                  busy || workflow.approvalStatus !== "approved" || live
                }
                fullWidth
              >
                {migrationMethods
                  .filter((method) => method.value !== "no_migration_required")
                  .map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      {method.label}
                    </MenuItem>
                  ))}
              </TextField>
            ) : null}

            {!migrationAlreadyRecorded ? (
              <TextField
                label={
                  skipImport
                    ? "Reason for skipping import"
                    : "Import evidence / notes"
                }
                value={migrationNotes}
                onChange={(event) => {
                  setMigrationNotes(event.target.value);

                  migrationMutation.reset();
                }}
                placeholder={
                  skipImport
                    ? "Example: New school setup — no legacy transport data exists."
                    : "Example: Student and route workbook imported; 486 student records validated; no blocking errors."
                }
                helperText={
                  skipImport
                    ? "A short reason is retained in the onboarding audit trail."
                    : "Record the source, scope and validation result."
                }
                disabled={
                  busy || workflow.approvalStatus !== "approved" || live
                }
                multiline
                minRows={3}
                fullWidth
              />
            ) : null}

            {migrationStep?.completionMethod ? (
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 9,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Recorded evidence
                </Typography>

                <Typography
                  sx={{
                    mt: 0.35,
                    fontSize: 11,
                    fontWeight: 750,
                  }}
                >
                  {humanize(migrationStep.completionMethod)}
                </Typography>

                {migrationStep.notes ? (
                  <Typography
                    sx={{
                      mt: 0.45,
                      color: "text.secondary",
                      fontSize: 10,
                      lineHeight: 1.55,
                    }}
                  >
                    {migrationStep.notes}
                  </Typography>
                ) : null}
              </Paper>
            ) : null}

            {!migrationAlreadyRecorded ? (
              <Alert severity="info">
                Completing an import or confirming a deliberate skip will mark
                Step 7 as satisfied and refresh the overall onboarding progress.
              </Alert>
            ) : null}
          </Stack>
        );
      }

      case "launch_validation":
        return (
          <Stack spacing={2}>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 850,
              }}
            >
              Launch readiness validation
            </Typography>

            {summaryQuery.isLoading ? <CircularProgress size={22} /> : null}

            {readyToActivate ? (
              <Alert severity="success">
                All required pre-launch evidence is satisfied. This school is
                ready to activate.
              </Alert>
            ) : (
              <Alert severity="warning">
                Launch validation remains incomplete while required evidence is
                missing.
              </Alert>
            )}

            {summary && summary.blockers.length > 0 ? (
              <Stack spacing={1}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 850,
                  }}
                >
                  Remaining blockers
                </Typography>

                {summary.blockers.map((blocker) => (
                  <Paper
                    key={blocker.stepKey}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 750,
                      }}
                    >
                      Step {blocker.stepOrder}
                      {" — "}
                      {blocker.stepName}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        color: "text.secondary",
                        fontSize: 9.5,
                      }}
                    >
                      {humanize(blocker.status)}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            ) : null}
          </Stack>
        );

      case "activation":
        return (
          <Stack spacing={2}>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 850,
              }}
            >
              Activate school
            </Typography>

            {live ? (
              <Alert severity="success">
                School is live. Activated {formatDateTime(workflow.activatedAt)}
                .
              </Alert>
            ) : readyToActivate ? (
              <Alert severity="success">
                All launch prerequisites are satisfied. Final activation is
                available.
              </Alert>
            ) : (
              <Alert severity="warning">
                Activation is locked until all pre-launch requirements are
                satisfied.
              </Alert>
            )}

            <TextField
              label="Activation notes"
              value={activationNotes}
              onChange={(event) => {
                setActivationNotes(event.target.value);

                activationMutation.reset();
              }}
              disabled={busy || !readyToActivate || live}
              multiline
              minRows={5}
              helperText="Optional final launch note."
              fullWidth
            />
          </Stack>
        );

      case "onboarding_summary":
        return (
          <Stack spacing={2}>
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 850,
              }}
            >
              Commercial & onboarding summary
            </Typography>

            {summary ? (
              <Box
                sx={{
                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                  },

                  gap: 1.5,
                }}
              >
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 9,
                      textTransform: "uppercase",
                    }}
                  >
                    Commercial
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontWeight: 800,
                    }}
                  >
                    {summary.commercial
                      ? `${summary.commercial.planName} / ${humanize(
                          summary.commercial.subscriptionStatus,
                        )}`
                      : "Not configured"}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 9,
                      textTransform: "uppercase",
                    }}
                  >
                    Initial administrator
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontWeight: 800,
                    }}
                  >
                    {summary.initialAdmin
                      ? summary.initialAdmin.email
                      : "Not configured"}
                  </Typography>
                </Paper>
              </Box>
            ) : null}

            <Alert severity={live ? "success" : "info"}>
              {live
                ? "Onboarding is complete and the school is live."
                : "The onboarding summary completes automatically after successful activation."}
            </Alert>
          </Stack>
        );

      default:
        return (
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 12,
            }}
          >
            Review the persisted evidence for this onboarding stage.
          </Typography>
        );
    }
  }

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,

        display: "flex",
        flexDirection: "column",

        bgcolor: "transparent",
      }}
    >
      {/* ====================================================
          FIXED WORKFLOW HEADER
          ==================================================== */}

      <Box
        sx={{
          flexShrink: 0,

          px: {
            xs: 2,
            md: 3,
          },

          py: 1.75,

          bgcolor: "rgba(48, 55, 63, 0.46)",

          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",

          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
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
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              Onboarding workflow
            </Typography>

            <Typography
              sx={{
                mt: 0.3,
                color: "text.secondary",
                fontSize: 10.5,
              }}
            >
              {humanize(workflow.currentStage)}
              {" • "}
              Backend-verified onboarding evidence
            </Typography>
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
              label={`Phase ${activePhaseIndex + 1} of ${phases.length}`}
              color="primary"
            />

            <Chip
              size="small"
              label={`${progressPercent}% launch ready`}
              variant="outlined"
            />

            <Chip
              size="small"
              label={humanize(workflow.approvalStatus)}
              color={approvalColor(workflow.approvalStatus)}
              variant="outlined"
            />
          </Stack>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{
            mt: 1.5,
            height: 6,
            borderRadius: 999,
          }}
        />
      </Box>

      {actionError ? (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {actionError instanceof Error
            ? actionError.message
            : "Unable to update onboarding workflow"}
        </Alert>
      ) : null}

      {/* ====================================================
          FIVE-PHASE RAIL + PHASE CONTENT
          ==================================================== */}

      <Box
        sx={{
          minHeight: 0,
          flex: 1,

          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",
            md: "290px minmax(0, 1fr)",
          },

          overflow: "hidden",
        }}
      >
        <Paper
          square
          elevation={0}
          sx={{
            minHeight: 0,
            overflowY: "auto",

            borderRight: {
              xs: 0,
              md: "1px solid",
            },

            borderBottom: {
              xs: "1px solid",
              md: 0,
            },

            borderColor: "divider",

            bgcolor: "rgba(42, 48, 55, 0.56)",

            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <Box sx={{ p: 1.25 }}>
            {phases.map((phase, phaseIndex) => {
              const selected = phase.key === activePhaseKey;

              const entryStep = phaseEntryStep(phase);

              return (
                <ButtonBase
                  key={phase.key}
                  disabled={!entryStep}
                  onClick={() => {
                    if (entryStep) {
                      setSelectedStepOrder(entryStep.stepOrder);
                    }
                  }}
                  sx={{
                    width: "100%",
                    mb: 0.6,
                    textAlign: "left",
                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "34px minmax(0, 1fr) auto",
                      alignItems: "center",
                      gap: 1,
                      p: 1.1,
                      border: "1px solid",
                      borderColor: selected
                        ? "rgba(37, 99, 235, 0.42)"
                        : "transparent",
                      bgcolor: selected
                        ? "rgba(57, 65, 74, 0.68)"
                        : "transparent",
                      borderRadius: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "50%",
                        bgcolor: selected
                          ? "primary.main"
                          : "rgba(255, 255, 255, 0.08)",
                        color: selected
                          ? "primary.contrastText"
                          : "text.secondary",
                        fontSize: 10,
                        fontWeight: 900,
                      }}
                    >
                      {phaseIndex + 1}
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          fontWeight: 850,
                          lineHeight: 1.35,
                        }}
                      >
                        {phase.label}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.25,
                          color: "text.secondary",
                          fontSize: 8.5,
                          lineHeight: 1.35,
                        }}
                      >
                        {phase.description}
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      label={humanize(phase.status)}
                      color={stepColor(phase.status)}
                      variant="outlined"
                    />
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
        </Paper>

        <Box
          sx={{
            minHeight: 0,
            overflowY: "auto",

            p: {
              xs: 2,
              md: 3,
            },
          }}
        >
          <Box
            sx={{
              maxWidth: 960,
              mx: "auto",

              p: {
                xs: 2,
                md: 2.5,
              },

              border: "1px solid",
              borderColor: "rgba(255, 255, 255, 0.10)",

              borderRadius: 1.5,

              bgcolor: "rgba(48, 55, 63, 0.58)",

              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",

              boxShadow: "0 16px 42px rgba(15, 23, 42, 0.08)",
            }}
          >
            <Box
              sx={{
                display: "flex",

                justifyContent: "space-between",

                alignItems: "flex-start",

                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: "primary.main",

                    fontSize: 10,

                    fontWeight: 850,

                    textTransform: "uppercase",

                    letterSpacing: "0.07em",
                  }}
                >
                  Phase {activePhaseIndex + 1}
                </Typography>

                <Typography
                  component="h2"
                  sx={{
                    mt: 0.5,

                    fontSize: {
                      xs: 22,
                      md: 28,
                    },

                    fontWeight: 900,

                    letterSpacing: "-0.03em",
                  }}
                >
                  {activePhase.label}
                </Typography>
              </Box>

              <Stack
                direction="row"
                spacing={0.75}
                useFlexGap
                sx={{
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <Chip
                  size="small"
                  label={humanize(activePhase.status)}
                  color={stepColor(activePhase.status)}
                  variant="outlined"
                />

                {activeStep.requiredForActivation ? (
                  <Chip
                    size="small"
                    label="Launch requirement"
                    variant="outlined"
                  />
                ) : null}
              </Stack>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            {renderStepContent()}

            {activePhaseKey !== "application_verification" &&
            activePhaseKey !== "tenant_commercial_setup" &&
            activePhaseKey !== "administrator_data" &&
            activePhaseKey !== "launch_readiness" &&
            activePhaseKey !== "activation_handover" &&
            activeStep.stepKey !== "package_selection" ? (
              <StepEvidence step={activeStep} />
            ) : null}
          </Box>
        </Box>
      </Box>

      {/* ====================================================
          STICKY BOTTOM CONTROL BAR
          ==================================================== */}

      <Box
        sx={{
          flexShrink: 0,

          px: {
            xs: 1.5,
            md: 2.5,
          },

          py: 1.25,

          bgcolor: "rgba(39, 45, 52, 0.78)",

          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",

          borderTop: "1px solid",
          borderColor: "divider",

          boxShadow: "0 -4px 18px rgba(15, 23, 42, 0.05)",

          display: "flex",

          alignItems: {
            xs: "stretch",
            md: "center",
          },

          justifyContent: "space-between",

          gap: 1.5,

          flexDirection: {
            xs: "column",
            md: "row",
          },

          "& .MuiButton-root": {
            minHeight: 44,

            px: 2.25,

            borderRadius: 1.75,

            textTransform: "none",

            fontWeight: 800,
          },
        }}
      >
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Button
            startIcon={<NavigateBeforeRounded />}
            disabled={!previousPhase || busy}
            onClick={() => {
              if (previousPhase) {
                const step = phaseEntryStep(previousPhase);

                if (step) {
                  setSelectedStepOrder(step.stepOrder);
                }
              }
            }}
          >
            Previous
          </Button>

          {canManageOnboarding &&
          activePhaseKey === "launch_readiness" &&
          workflow.approvalStatus === "approved" &&
          !live ? (
            <Button
              variant="outlined"
              startIcon={<RefreshRounded />}
              disabled={busy || !launchReviewConfirmed}
              onClick={() => {
                reconcileMutation.reset();

                reconcileMutation.mutate();
              }}
            >
              {reconcileMutation.isPending
                ? "Validating..."
                : "Run launch validation"}
            </Button>
          ) : null}
        </Stack>

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={1}
        >
          {canApproveOnboarding &&
          activePhaseKey === "application_verification" &&
          workflow.approvalStatus === "pending_review" ? (
            <Button
              variant="outlined"
              color="error"
              disabled={busy || approvalNotes.trim().length < 3}
              onClick={() => {
                approvalMutation.reset();

                approvalMutation.mutate({
                  approvalStatus: "rejected",

                  notes: approvalNotes.trim(),
                });
              }}
            >
              Reject application
            </Button>
          ) : null}

          {canApproveOnboarding &&
          activePhaseKey === "application_verification" &&
          workflow.approvalStatus !== "approved" ? (
            <Button
              variant="contained"
              disabled={busy}
              onClick={() => {
                approvalMutation.reset();

                approvalMutation.mutate({
                  approvalStatus: "approved",

                  notes: approvalNotes.trim() || undefined,
                });
              }}
            >
              {approvalMutation.isPending ? "Approving..." : "Approve school"}
            </Button>
          ) : null}

          {canManageOnboarding &&
          activePhaseKey === "administrator_data" &&
          !live &&
          migrationStep &&
          !stepComplete(migrationStep) ? (
            <Button
              variant="contained"
              startIcon={<TaskAltRounded />}
              disabled={
                busy ||
                workflow.approvalStatus !== "approved" ||
                migrationNotes.trim().length < 3
              }
              onClick={() => {
                migrationMutation.reset();

                migrationMutation.mutate();
              }}
            >
              {migrationMutation.isPending
                ? "Saving..."
                : migrationMethod === "no_migration_required"
                  ? "Confirm skip import"
                  : "Mark import complete"}
            </Button>
          ) : null}

          {canActivateTenant &&
          activePhaseKey === "activation_handover" &&
          !live ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<RocketLaunchRounded />}
              disabled={busy || !readyToActivate}
              onClick={() => {
                activationMutation.reset();

                activationMutation.mutate();
              }}
            >
              {activationMutation.isPending
                ? "Activating..."
                : "Activate school"}
            </Button>
          ) : null}

          <Button
            variant="contained"
            endIcon={<NavigateNextRounded />}
            disabled={!nextPhase || busy}
            onClick={() => {
              /*
               * Navigation only.
               *
               * Deliberately does NOT mutate
               * onboarding evidence.
               */
              if (nextPhase) {
                const step = phaseEntryStep(nextPhase);

                if (step) {
                  setSelectedStepOrder(step.stepOrder);
                }
              }
            }}
          >
            Next phase
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
