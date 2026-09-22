import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { BlockRounded, PlayArrowRounded } from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listPlatformPlans,
  listPlatformTenants,
  pausePlatformTenantAccess,
  reconcilePlatformOnboarding,
  setPlatformTenantSubscription,
  type PlatformTenantListItem,
} from "./platform.api";

interface TenantCommercialActionsProps {
  tenant: PlatformTenantListItem;

  onTenantUpdated: (tenant: PlatformTenantListItem) => void;
}

function defaultTrialEndDate(): string {
  const date = new Date();

  date.setDate(date.getDate() + 14);

  return date.toISOString().slice(0, 10);
}

/**
 * Existing trials must open with the date that is actually persisted
 * by the backend. Only a tenant without a saved end date receives the
 * default 14-day suggestion.
 */
function initialTrialEndDate(tenant: PlatformTenantListItem): string {
  return tenant.subscriptionEndsAt?.slice(0, 10) ?? defaultTrialEndDate();
}

export function TenantCommercialActions({
  tenant,
  onTenantUpdated,
}: TenantCommercialActionsProps) {
  const queryClient = useQueryClient();

  const [planId, setPlanId] = useState("");

  const [trialEndDate, setTrialEndDate] = useState(() =>
    initialTrialEndDate(tenant),
  );

  const [pauseOpen, setPauseOpen] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ["platform", "plans"],

    queryFn: listPlatformPlans,
  });

  const sellablePlans =
    plansQuery.data?.filter(
      (plan) => plan.isSellable && plan.status === "active",
    ) ?? [];

  /**
   * If the tenant already has a plan, infer its ID from the plan
   * catalogue. This means a paused tenant can be reactivated on
   * the same plan without the operator having to remember it.
   */
  const existingPlanId =
    sellablePlans.find((plan) => plan.code === tenant.planCode)?.id ?? "";

  const selectedPlanId = planId || existingPlanId;

  const savedTrialEndDate = tenant.subscriptionEndsAt?.slice(0, 10) ?? "";

  const trialDateDirty =
    tenant.subscriptionStatus === "trialing" &&
    Boolean(savedTrialEndDate) &&
    trialEndDate !== savedTrialEndDate;

  /**
   * A commercial save is not considered visually complete until we
   * have re-read the tenant from the backend and reconciled the
   * canonical onboarding workflow.
   *
   * This is what allows Steps 5/8 (and any evidence-driven dependent
   * step) to immediately change state in the numbered onboarding rail.
   */
  async function refreshCommercialAndOnboarding(): Promise<void> {
    const tenants = await listPlatformTenants();

    queryClient.setQueryData(["platform", "tenants"], tenants);

    const refreshedTenant = tenants.find((item) => item.id === tenant.id);

    if (refreshedTenant) {
      onTenantUpdated(refreshedTenant);
    }

    const workflow = await reconcilePlatformOnboarding(tenant.id);

    queryClient.setQueryData(
      ["platform", "onboarding", "workflow", tenant.id],
      workflow,
    );

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["platform", "tenant-feature-states", tenant.id],
      }),

      queryClient.invalidateQueries({
        queryKey: ["platform", "onboarding", "summary", tenant.id],
      }),

      queryClient.invalidateQueries({
        queryKey: ["platform", "onboarding", "queue"],
      }),
    ]);
  }

  const subscriptionMutation = useMutation({
    mutationFn: async ({ status }: { status: "active" | "trialing" }) => {
      if (!selectedPlanId) {
        throw new Error("Select a commercial plan first");
      }

      if (status === "trialing" && !trialEndDate) {
        throw new Error("Select a trial end date");
      }

      return setPlatformTenantSubscription(tenant.id, {
        planId: selectedPlanId,

        status,

        ...(status === "trialing"
          ? {
              endsAt: `${trialEndDate}T23:59:59+03:00`,
            }
          : {}),
      });
    },

    onSuccess: async (_result, variables) => {
      await refreshCommercialAndOnboarding();

      setSuccessMessage(
        variables.status === "trialing"
          ? tenant.subscriptionStatus === "trialing"
            ? "Trial changes saved successfully."
            : "Trial started successfully."
          : tenant.subscriptionStatus === "cancelled"
            ? "Tenant access reactivated successfully."
            : tenant.subscriptionStatus === "active"
              ? "Active plan saved successfully."
              : "Plan assigned successfully.",
      );
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => pausePlatformTenantAccess(tenant.id),

    onSuccess: async () => {
      await refreshCommercialAndOnboarding();

      setPauseOpen(false);

      setSuccessMessage(
        "Access paused. Users may still sign in, but operational features are blocked.",
      );
    },
  });

  const busy = subscriptionMutation.isPending || pauseMutation.isPending;

  const paused = tenant.subscriptionStatus === "cancelled";

  const error = pauseMutation.error ?? subscriptionMutation.error;

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 12,

          fontWeight: 800,
        }}
      >
        Commercial controls
      </Typography>

      <Typography
        sx={{
          mt: 0.5,

          color: "text.secondary",

          fontSize: 10,

          lineHeight: 1.5,
        }}
      >
        Assign a paid plan, start a trial or temporarily pause operational
        platform access.
      </Typography>

      <Stack
        spacing={1.5}

        sx={{
          mt: 2,
        }}
      >
        {paused ? (
          <Alert severity="warning">
            Access is currently paused. Users can still sign in, but transport
            operations are unavailable.
          </Alert>
        ) : null}

        {plansQuery.isError ? (
          <Alert severity="error">
            {plansQuery.error instanceof Error
              ? plansQuery.error.message
              : "Unable to load plans"}
          </Alert>
        ) : null}

        <TextField
          select

          size="small"

          label="Commercial plan"

          value={selectedPlanId}

          onChange={(event) => {
            setPlanId(event.target.value);

            setSuccessMessage(null);
          }}

          disabled={plansQuery.isLoading || busy}

          fullWidth
        >
          {sellablePlans.map((plan) => (
            <MenuItem
              key={plan.id}

              value={plan.id}
            >
              {plan.name}
            </MenuItem>
          ))}
        </TextField>

        <Button
          variant="contained"

          disabled={!selectedPlanId || busy}

          startIcon={paused ? <PlayArrowRounded /> : undefined}

          onClick={() => {
            setSuccessMessage(null);

            subscriptionMutation.mutate({
              status: "active",
            });
          }}

          fullWidth
        >
          {subscriptionMutation.isPending &&
          subscriptionMutation.variables?.status === "active" ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
              }}
            >
              <CircularProgress size={16} color="inherit" />

              <span>Saving...</span>
            </Stack>
          ) : paused ? (
            "Reactivate access"
          ) : (
            "Save active plan"
          )}
        </Button>

        <Divider>
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 9,

              fontWeight: 700,
            }}
          >
            OR TRIAL
          </Typography>
        </Divider>

        <TextField
          size="small"

          label="Trial end date"

          type="date"

          value={trialEndDate}

          onChange={(event) => {
            setTrialEndDate(event.target.value);

            setSuccessMessage(null);
          }}

          disabled={busy}

          helperText={
            tenant.subscriptionStatus === "trialing" && savedTrialEndDate
              ? trialDateDirty
                ? `Saved trial end: ${savedTrialEndDate} • unsaved change`
                : `Saved trial end: ${savedTrialEndDate}`
              : "Choose the end date, then save the trial."
          }

          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}

          fullWidth
        />

        <Button
          variant="outlined"

          disabled={!selectedPlanId || !trialEndDate || busy}

          onClick={() => {
            setSuccessMessage(null);

            subscriptionMutation.mutate({
              status: "trialing",
            });
          }}

          fullWidth
        >
          {subscriptionMutation.isPending &&
          subscriptionMutation.variables?.status === "trialing"
            ? "Saving..."
            : tenant.subscriptionStatus === "trialing"
              ? "Save trial changes"
              : "Start trial"}
        </Button>

        {tenant.subscriptionEffective ? (
          <>
            <Divider>
              <Typography
                sx={{
                  color: "text.secondary",

                  fontSize: 9,

                  fontWeight: 700,
                }}
              >
                ACCESS CONTROL
              </Typography>
            </Divider>

            <Button
              variant="outlined"

              color="error"

              startIcon={<BlockRounded />}

              disabled={busy}

              onClick={() => {
                setSuccessMessage(null);

                setPauseOpen(true);
              }}

              fullWidth
            >
              Pause access
            </Button>
          </>
        ) : null}

        {error ? (
          <Alert severity="error">
            {error instanceof Error
              ? error.message
              : "Unable to update tenant access"}
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert severity="success">{successMessage}</Alert>
        ) : null}
      </Stack>

      <Dialog
        open={pauseOpen}

        onClose={busy ? undefined : () => setPauseOpen(false)}

        fullWidth

        maxWidth="xs"
      >
        <DialogTitle>Pause platform access?</DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 12,

              lineHeight: 1.7,
            }}
          >
            Users for <strong>{tenant.name}</strong> will still be able to sign
            in, but all operational transport functionality will be paused. No
            tenant, user or transport data will be deleted.
          </Typography>

          <Alert
            severity="warning"

            sx={{
              mt: 2,
            }}
          >
            Use this only when you intend to suspend commercial access for this
            organisation.
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={busy}

            onClick={() => setPauseOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"

            color="error"

            disabled={busy}

            onClick={() => pauseMutation.mutate()}
          >
            {pauseMutation.isPending ? "Pausing..." : "Pause access"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
