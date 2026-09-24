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
  CheckRounded,
  ErrorOutlineRounded,
  NavigateBeforeRounded,
  NavigateNextRounded,
  RefreshRounded,
  RocketLaunchRounded,
  TaskAltRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";

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

  const defaultStep =
    visibleSteps.find((step) => !stepComplete(step)) ??
    visibleSteps[visibleSteps.length - 1];

  const activeStep =
    visibleSteps.find((step) => step.stepOrder === selectedStepOrder) ??
    defaultStep;

  const activeIndex = visibleSteps.findIndex(
    (step) => step.stepOrder === activeStep.stepOrder,
  );

  const previousStep = activeIndex > 0 ? visibleSteps[activeIndex - 1] : null;

  const nextStep =
    activeIndex < visibleSteps.length - 1
      ? visibleSteps[activeIndex + 1]
      : null;

  const activeVisualStatus = activeStep.status;

  const activeVisualName = activeStep.stepName;

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
              disabled={busy || live}
              multiline
              minRows={5}
              helperText="Required when rejecting; optional when approving."
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
        return (
          <OnboardingCommercialReview
            tenant={tenant}
            commercialSteps={commercialSteps}
            onTenantUpdated={handleTenantUpdated}
          />
        );

      case "account_setup":
        return (
          <Stack spacing={3}>
            <TenantInitialAdminActions tenant={tenant} />

            <Divider />

            <TenantAdminRecoveryActions tenant={tenant} />
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
                  ? "Import was intentionally skipped. Step 7 is complete and onboarding progress has been updated."
                  : "Migration evidence has been recorded. Step 7 is complete."}
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

        bgcolor: "background.default",
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

          bgcolor: "background.paper",

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
              label={`Step ${activeStep.stepOrder} of ${steps.length}`}
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
          LEFT STEP RAIL + FOCUSED STEP CONTENT
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

            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ p: 1.25 }}>
            {visibleSteps.map((step) => {
              const selected = step.stepOrder === activeStep.stepOrder;

              const complete = stepComplete(step);

              const visualStatus = step.status;

              const visualName = step.stepName;

              const demoOnly = step.stepOrder >= 14;

              return (
                <ButtonBase
                  key={step.stepKey}
                  onClick={() => setSelectedStepOrder(step.stepOrder)}
                  sx={{
                    width: "100%",

                    mb: 0.5,

                    textAlign: "left",

                    borderRadius: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",

                      display: "grid",

                      gridTemplateColumns: "38px minmax(0, 1fr) auto",

                      alignItems: "center",

                      gap: 1,

                      p: 1,

                      border: "1px solid",

                      borderColor: selected ? "primary.main" : "transparent",

                      bgcolor: selected ? "action.selected" : "transparent",

                      borderRadius: 2,

                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,

                        display: "grid",
                        placeItems: "center",

                        borderRadius: "50%",

                        bgcolor: complete
                          ? "success.main"
                          : selected
                            ? "primary.main"
                            : "action.hover",

                        color:
                          complete || selected
                            ? "common.white"
                            : "text.secondary",

                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {complete ? (
                        <CheckRounded
                          sx={{
                            fontSize: 17,
                          }}
                        />
                      ) : visualStatus === "blocked" ? (
                        <ErrorOutlineRounded
                          sx={{
                            fontSize: 17,
                          }}
                        />
                      ) : (
                        step.stepOrder
                      )}
                    </Box>

                    <Box
                      sx={{
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 10.5,

                          fontWeight: selected ? 850 : 700,

                          lineHeight: 1.3,
                        }}
                      >
                        Step {step.stepOrder}
                        {" — "}
                        {visualName}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.15,

                          color: "text.secondary",

                          fontSize: 8.5,
                        }}
                      >
                        {humanize(visualStatus)}
                      </Typography>
                    </Box>

                    {demoOnly ? (
                      <Chip size="small" label="Demo" variant="outlined" />
                    ) : null}
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
                  Step {activeStep.stepOrder}
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
                  {activeVisualName}
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
                  label={humanize(activeVisualStatus)}
                  color={stepColor(activeVisualStatus)}
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

            {activeStep.stepKey !== "package_selection" ? (
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

          bgcolor: "background.paper",

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
            disabled={!previousStep || busy}
            onClick={() => {
              if (previousStep) {
                setSelectedStepOrder(previousStep.stepOrder);
              }
            }}
          >
            Previous
          </Button>

          {workflow.approvalStatus === "approved" &&
          !live &&
          activeStep.stepOrder < 14 ? (
            <Button
              variant="outlined"
              startIcon={<RefreshRounded />}
              disabled={busy}
              onClick={() => {
                reconcileMutation.reset();

                reconcileMutation.mutate();
              }}
            >
              {reconcileMutation.isPending
                ? "Reconciling..."
                : "Reconcile verified evidence"}
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
          {activeStep.stepKey === "verification" &&
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

          {activeStep.stepKey === "verification" &&
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

          {activeStep.stepKey === "data_migration" &&
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

          {activeStep.stepKey === "activation" && !live ? (
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
                : "Activate tenant"}
            </Button>
          ) : null}

          <Button
            variant="contained"
            endIcon={<NavigateNextRounded />}
            disabled={!nextStep || busy}
            onClick={() => {
              /*
               * Navigation only.
               *
               * Deliberately does NOT mutate
               * onboarding evidence.
               */
              if (nextStep) {
                setSelectedStepOrder(nextStep.stepOrder);
              }
            }}
          >
            Next step
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
