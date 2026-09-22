import {
  Alert,
  Box,
  Button,
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
  RefreshRounded,
  RocketLaunchRounded,
  TaskAltRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";

import {
  activatePlatformOnboarding,
  getPlatformOnboardingSummary,
  getPlatformOnboardingWorkflow,
  reconcilePlatformOnboarding,
  setPlatformOnboardingApproval,
  updatePlatformOnboardingStep,
  type PlatformOnboardingApprovalStatus,
  type PlatformOnboardingStepStatus,
  type PlatformOnboardingWorkflow,
  type PlatformTenantListItem,
} from "./platform.api";

interface TenantOnboardingPanelProps {
  tenant: PlatformTenantListItem;
}

type StepChipColor = "default" | "success" | "warning" | "error" | "info";

interface MigrationMethod {
  value:
    | "imported_xlsx"
    | "imported_csv"
    | "preloaded_dataset"
    | "no_migration_required";

  label: string;

  status: "completed" | "skipped";
}

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

function stepColor(status: PlatformOnboardingStepStatus): StepChipColor {
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

function approvalColor(
  status: PlatformOnboardingApprovalStatus,
): StepChipColor {
  switch (status) {
    case "approved":
      return "success";

    case "rejected":
      return "error";

    default:
      return "warning";
  }
}

export function TenantOnboardingPanel({ tenant }: TenantOnboardingPanelProps) {
  const queryClient = useQueryClient();

  const workflowKey = [
    "platform",
    "onboarding",
    "workflow",
    tenant.id,
  ] as const;

  const summaryKey = ["platform", "onboarding", "summary", tenant.id] as const;

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
    workflow: PlatformOnboardingWorkflow,
  ): Promise<void> {
    queryClient.setQueryData(workflowKey, workflow);

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: summaryKey,
      }),

      queryClient.invalidateQueries({
        queryKey: ["platform", "onboarding", "queue"],
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

    onSuccess: async (workflow) => {
      setApprovalNotes("");

      await acceptWorkflow(workflow);
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
       * Step 11 launch validation is evidence-driven.
       *
       * Reconcile immediately after Step 10 so the backend can
       * automatically promote launch readiness if Steps 1-10 are
       * now satisfied.
       */
      return reconcilePlatformOnboarding(tenant.id);
    },

    onSuccess: async (workflow) => {
      setMigrationNotes("");

      await acceptWorkflow(workflow);
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

    onSuccess: async (workflow) => {
      setActivationNotes("");

      await acceptWorkflow(workflow);
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
          minHeight: 300,

          display: "grid",

          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
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

  const workflow = workflowQuery.data;

  if (!workflow) {
    return (
      <Alert severity="error">Tenant onboarding workflow is unavailable.</Alert>
    );
  }

  const summary = summaryQuery.data;

  const steps = [...workflow.steps].sort(
    (left, right) => left.stepOrder - right.stepOrder,
  );

  const migrationStep = steps.find((step) => step.stepKey === "data_migration");

  const live = summary?.workflow.live ?? workflow.currentStage === "live";

  const readyToActivate = summary?.workflow.readyToActivate ?? false;

  const canChangeApproval = workflow.approvalStatus !== "approved" && !live;

  return (
    <Stack spacing={3}>
      {/* ====================================================
          CONTROL-CENTRE SUMMARY
          ==================================================== */}

      <Box>
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
                fontSize: 16,

                fontWeight: 900,
              }}
            >
              15-step onboarding control centre
            </Typography>

            <Typography
              sx={{
                mt: 0.4,

                maxWidth: 700,

                color: "text.secondary",

                fontSize: 11,

                lineHeight: 1.6,
              }}
            >
              Canonical approval, commercial setup, account preparation,
              migration, launch validation and activation workflow. System
              evidence remains authoritative.
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
              label={humanize(workflow.approvalStatus)}
              color={approvalColor(workflow.approvalStatus)}
              variant="outlined"
            />

            <Chip
              size="small"
              label={humanize(workflow.currentStage)}
              color={live ? "success" : "default"}
            />
          </Stack>
        </Box>

        {summaryQuery.isLoading ? (
          <Box
            sx={{
              mt: 2,

              display: "flex",

              alignItems: "center",

              gap: 1,
            }}
          >
            <CircularProgress size={16} />

            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 10,
              }}
            >
              Checking launch readiness...
            </Typography>
          </Box>
        ) : null}

        {summaryQuery.isError ? (
          <Alert
            severity="warning"
            sx={{
              mt: 2,
            }}
          >
            {summaryQuery.error instanceof Error
              ? summaryQuery.error.message
              : "Launch summary is temporarily unavailable"}
          </Alert>
        ) : null}

        {summary ? (
          <Paper
            variant="outlined"
            sx={{
              mt: 2,

              p: 2,

              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  sm: "repeat(2, minmax(0, 1fr))",

                  lg: "repeat(4, minmax(0, 1fr))",
                },

                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 9,

                    textTransform: "uppercase",

                    letterSpacing: "0.05em",
                  }}
                >
                  Required progress
                </Typography>

                <Typography
                  sx={{
                    mt: 0.4,

                    fontSize: 15,

                    fontWeight: 850,
                  }}
                >
                  {summary.progress.completedRequiredSteps}
                  {" / "}
                  {summary.progress.requiredSteps}
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 9,

                    textTransform: "uppercase",

                    letterSpacing: "0.05em",
                  }}
                >
                  Remaining
                </Typography>

                <Typography
                  sx={{
                    mt: 0.4,

                    fontSize: 15,

                    fontWeight: 850,
                  }}
                >
                  {summary.progress.remainingRequiredSteps}
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 9,

                    textTransform: "uppercase",

                    letterSpacing: "0.05em",
                  }}
                >
                  Commercial
                </Typography>

                <Typography
                  sx={{
                    mt: 0.4,

                    fontSize: 12,

                    fontWeight: 800,
                  }}
                >
                  {summary.commercial
                    ? `${summary.commercial.planName} / ${humanize(
                        summary.commercial.subscriptionStatus,
                      )}`
                    : "Not configured"}
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 9,

                    textTransform: "uppercase",

                    letterSpacing: "0.05em",
                  }}
                >
                  Initial admin
                </Typography>

                <Typography
                  sx={{
                    mt: 0.4,

                    fontSize: 12,

                    fontWeight: 800,

                    wordBreak: "break-word",
                  }}
                >
                  {summary.initialAdmin
                    ? summary.initialAdmin.email
                    : "Not configured"}
                </Typography>
              </Box>
            </Box>

            <LinearProgress
              variant="determinate"
              value={summary.progress.percent}
              sx={{
                mt: 2,

                height: 7,

                borderRadius: 999,
              }}
            />

            <Typography
              sx={{
                mt: 0.75,

                color: "text.secondary",

                fontSize: 9.5,
              }}
            >
              {summary.progress.percent}% of activation prerequisites satisfied
            </Typography>
          </Paper>
        ) : null}
      </Box>

      {actionError ? (
        <Alert severity="error">
          {actionError instanceof Error
            ? actionError.message
            : "Unable to update onboarding workflow"}
        </Alert>
      ) : null}

      {/* ====================================================
          APPROVAL — STEPS 2 AND 3
          ==================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p: 2,

          borderRadius: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,

            fontWeight: 850,
          }}
        >
          School verification & approval
        </Typography>

        <Typography
          sx={{
            mt: 0.4,

            color: "text.secondary",

            fontSize: 10,

            lineHeight: 1.6,
          }}
        >
          Approval verifies the organisation. It does not activate operational
          access; activation remains Step 12.
        </Typography>

        {workflow.approvalStatus === "rejected" ? (
          <Alert
            severity="error"
            sx={{
              mt: 1.5,
            }}
          >
            Rejected
            {workflow.rejectionReason ? ` — ${workflow.rejectionReason}` : ""}
          </Alert>
        ) : null}

        {workflow.approvalStatus === "approved" ? (
          <Alert
            severity="success"
            sx={{
              mt: 1.5,
            }}
          >
            Organisation approved. Continue configuration and evidence
            reconciliation.
          </Alert>
        ) : null}

        {canChangeApproval ? (
          <Stack
            spacing={1.25}
            sx={{
              mt: 1.5,
            }}
          >
            <TextField
              size="small"
              label="Verification notes / rejection reason"
              value={approvalNotes}
              onChange={(event) => {
                setApprovalNotes(event.target.value);

                approvalMutation.reset();
              }}
              disabled={busy}
              multiline
              minRows={2}
              helperText="Required when rejecting; optional when approving."
              fullWidth
            />

            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={1}
            >
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
                {approvalMutation.isPending
                  ? "Updating..."
                  : workflow.approvalStatus === "rejected"
                    ? "Approve after review"
                    : "Approve school"}
              </Button>

              {workflow.approvalStatus === "pending_review" ? (
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
            </Stack>
          </Stack>
        ) : null}
      </Paper>

      {/* ====================================================
          EVIDENCE RECONCILIATION
          ==================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p: 2,

          borderRadius: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,

            fontWeight: 850,
          }}
        >
          Verified evidence reconciliation
        </Typography>

        <Typography
          sx={{
            mt: 0.4,

            color: "text.secondary",

            fontSize: 10,

            lineHeight: 1.6,
          }}
        >
          Re-check provisioning, package configuration, trial/subscription,
          administrator setup and launch-readiness evidence. This does not
          bypass any onboarding prerequisite.
        </Typography>

        <Button
          sx={{
            mt: 1.5,
          }}
          size="small"
          variant="outlined"
          startIcon={<RefreshRounded />}
          disabled={busy || workflow.approvalStatus !== "approved" || live}
          onClick={() => {
            reconcileMutation.reset();

            reconcileMutation.mutate();
          }}
        >
          {reconcileMutation.isPending
            ? "Reconciling..."
            : "Reconcile verified evidence"}
        </Button>
      </Paper>

      {/* ====================================================
          STEP 10 — DATA MIGRATION
          ==================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p: 2,

          borderRadius: 2,
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
                fontSize: 13,

                fontWeight: 850,
              }}
            >
              Step 10 — Data migration / import
            </Typography>

            <Typography
              sx={{
                mt: 0.4,

                color: "text.secondary",

                fontSize: 10,

                lineHeight: 1.6,
              }}
            >
              This remains a human-evidence step because the current platform
              does not yet have a canonical CSV/XLSX migration subsystem. Record
              what was supplied and validated.
            </Typography>
          </Box>

          {migrationStep ? (
            <Chip
              size="small"
              label={humanize(migrationStep.status)}
              color={stepColor(migrationStep.status)}
              variant="outlined"
            />
          ) : null}
        </Box>

        {migrationStep?.completionMethod ? (
          <Typography
            sx={{
              mt: 1,

              color: "text.secondary",

              fontSize: 9.5,
            }}
          >
            Current evidence:{" "}
            <strong>{humanize(migrationStep.completionMethod)}</strong>
          </Typography>
        ) : null}

        {!live ? (
          <Stack
            spacing={1.25}
            sx={{
              mt: 1.5,
            }}
          >
            <TextField
              select
              size="small"
              label="Migration method"
              value={migrationMethod}
              onChange={(event) => {
                setMigrationMethod(
                  event.target.value as MigrationMethod["value"],
                );

                migrationMutation.reset();
              }}
              disabled={busy || workflow.approvalStatus !== "approved"}
              fullWidth
            >
              {migrationMethods.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  {method.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Migration evidence / notes"
              value={migrationNotes}
              onChange={(event) => {
                setMigrationNotes(event.target.value);

                migrationMutation.reset();
              }}
              placeholder="e.g. Student and route workbook imported, 486 student records validated, no blocking errors."
              helperText="Record the source, scope and validation result, or explain why migration is not required."
              disabled={busy || workflow.approvalStatus !== "approved"}
              multiline
              minRows={2}
              fullWidth
            />

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
                ? "Recording..."
                : migrationMethod === "no_migration_required"
                  ? "Record migration not required"
                  : "Record migration complete"}
            </Button>
          </Stack>
        ) : null}
      </Paper>

      {/* ====================================================
          ACTIVATION GATE — STEP 12
          ==================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p: 2,

          borderRadius: 2,

          borderColor: readyToActivate ? "success.main" : "divider",
        }}
      >
        <Typography
          sx={{
            fontSize: 13,

            fontWeight: 850,
          }}
        >
          Step 12 — Activate tenant
        </Typography>

        {live ? (
          <Alert
            severity="success"
            sx={{
              mt: 1.5,
            }}
          >
            Tenant is live. Activated {formatDateTime(workflow.activatedAt)}.
          </Alert>
        ) : readyToActivate ? (
          <Alert
            severity="success"
            sx={{
              mt: 1.5,
            }}
          >
            All required Steps 1–11 are satisfied. This tenant is ready for
            activation.
          </Alert>
        ) : (
          <Alert
            severity="warning"
            sx={{
              mt: 1.5,
            }}
          >
            Activation remains locked until all required onboarding
            prerequisites are complete or validly skipped.
          </Alert>
        )}

        {!live ? (
          <Stack
            spacing={1.25}
            sx={{
              mt: 1.5,
            }}
          >
            {summary && summary.blockers.length > 0 ? (
              <Box>
                <Typography
                  sx={{
                    mb: 0.75,

                    color: "text.secondary",

                    fontSize: 9,

                    fontWeight: 750,

                    textTransform: "uppercase",

                    letterSpacing: "0.05em",
                  }}
                >
                  Remaining blockers
                </Typography>

                <Stack
                  direction="row"
                  spacing={0.75}
                  useFlexGap
                  sx={{
                    flexWrap: "wrap",
                  }}
                >
                  {summary.blockers.map((blocker) => (
                    <Chip
                      key={blocker.stepKey}
                      size="small"
                      label={`${blocker.stepOrder}. ${blocker.stepName}`}
                      variant="outlined"
                      color="warning"
                    />
                  ))}
                </Stack>
              </Box>
            ) : null}

            <TextField
              size="small"
              label="Activation notes"
              value={activationNotes}
              onChange={(event) => {
                setActivationNotes(event.target.value);

                activationMutation.reset();
              }}
              disabled={busy || !readyToActivate}
              multiline
              minRows={2}
              helperText="Optional final launch note."
              fullWidth
            />

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
          </Stack>
        ) : null}
      </Paper>

      <Divider />

      {/* ====================================================
          CANONICAL 15 STEPS
          ==================================================== */}

      <Box>
        <Typography
          sx={{
            fontSize: 14,

            fontWeight: 900,
          }}
        >
          Canonical workflow
        </Typography>

        <Typography
          sx={{
            mt: 0.4,

            color: "text.secondary",

            fontSize: 10,

            lineHeight: 1.6,
          }}
        >
          Every canonical step remains visible. Steps 14–15 are deliberately
          reserved for the isolated Docker Demo environment and cannot be
          manually enabled from this shared control plane.
        </Typography>

        <Box
          sx={{
            mt: 1.5,

            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",

              md: "repeat(2, minmax(0, 1fr))",
            },

            gap: 1.25,
          }}
        >
          {steps.map((step) => {
            const demoOnly = step.stepOrder >= 14;

            return (
              <Paper
                key={step.stepKey}
                variant="outlined"
                sx={{
                  p: 1.75,

                  borderRadius: 2,

                  opacity: demoOnly && !live ? 0.86 : 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",

                    alignItems: "flex-start",

                    justifyContent: "space-between",

                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 9,

                        fontWeight: 800,

                        textTransform: "uppercase",

                        letterSpacing: "0.05em",
                      }}
                    >
                      Step {step.stepOrder}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,

                        fontSize: 12,

                        fontWeight: 800,
                      }}
                    >
                      {step.stepName}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={humanize(step.status)}
                    color={stepColor(step.status)}
                    variant="outlined"
                  />
                </Box>

                <Stack
                  direction="row"
                  spacing={0.75}
                  useFlexGap
                  sx={{
                    mt: 1,

                    flexWrap: "wrap",
                  }}
                >
                  {step.requiredForActivation ? (
                    <Chip size="small" label="Required for activation" />
                  ) : (
                    <Chip
                      size="small"
                      label="Post-activation / tooling"
                      variant="outlined"
                    />
                  )}

                  {step.completionMethod ? (
                    <Chip
                      size="small"
                      label={humanize(step.completionMethod)}
                      variant="outlined"
                    />
                  ) : null}
                </Stack>

                {step.notes ? (
                  <Typography
                    sx={{
                      mt: 1,

                      color: "text.secondary",

                      fontSize: 9.5,

                      lineHeight: 1.5,
                    }}
                  >
                    {step.notes}
                  </Typography>
                ) : null}

                {step.completedAt ? (
                  <Typography
                    sx={{
                      mt: 0.75,

                      color: "text.disabled",

                      fontSize: 9,
                    }}
                  >
                    Completed {formatDateTime(step.completedAt)}
                  </Typography>
                ) : null}

                {demoOnly ? (
                  <Alert
                    severity="info"
                    sx={{
                      mt: 1.25,

                      "& .MuiAlert-message": {
                        fontSize: 9.5,
                      },
                    }}
                  >
                    Docker Demo tooling — not available from the shared
                    production-capable workflow.
                  </Alert>
                ) : null}
              </Paper>
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
}
