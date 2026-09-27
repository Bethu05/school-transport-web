import { useState } from "react";

import { SaveRounded } from "@mui/icons-material";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyPlatformOnboardingTenantSalesConfiguration as applyPlatformTenantSalesConfiguration,
  getPlatformOnboardingCommercialPlan as getPlatformPlan,
  getPlatformOnboardingTenantCapacity as getPlatformTenantCapacity,
  getPlatformOnboardingSummary,
  listPlatformOnboardingCommercialPlans as listPlatformPlans,
  listPlatformOnboardingTenantFeatureStates as listPlatformTenantFeatureStates,
  reconcilePlatformOnboarding,
  type PlatformOnboardingStep,
  type PlatformPlanDetail,
  type PlatformPlanFeature,
  type PlatformTenantCapacityState,
  type PlatformTenantFeatureState,
  type PlatformTenantListItem,
} from "./platform.api";

interface OnboardingCommercialReviewProps {
  tenant: PlatformTenantListItem;

  commercialSteps: PlatformOnboardingStep[];

  onTenantUpdated: (tenant: PlatformTenantListItem) => void;
}

interface AddonSelection {
  source: "addon" | "contract";

  reason: string;

  limitValue: string;
}

interface CommercialDealEditorProps {
  tenant: PlatformTenantListItem;

  plan: PlatformPlanDetail;

  currentCapacity: PlatformTenantCapacityState | null;

  featureStates: PlatformTenantFeatureState[];

  onTenantUpdated: (tenant: PlatformTenantListItem) => void;
}

function parseWholeNumber(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsed = Number(value.trim());

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function CommercialDealEditor({
  tenant,
  plan,
  currentCapacity,
  featureStates,
  onTenantUpdated,
}: CommercialDealEditorProps) {
  const queryClient = useQueryClient();

  const samePlan = plan.code === tenant.planCode;

  const capacityDefaultsReady =
    plan.capacityDefaults.configured &&
    plan.capacityDefaults.schools !== null &&
    plan.capacityDefaults.students !== null &&
    plan.capacityDefaults.vehicles !== null &&
    plan.capacityDefaults.drivers !== null;

  /*
   * Capacity remains part of the canonical commercial transaction,
   * but it is not another onboarding form.
   *
   * A newly selected package receives its configured defaults.
   * Revisiting the same package preserves already-recorded capacity.
   */
  const capacity =
    samePlan && currentCapacity
      ? {
          schools: currentCapacity.schools.limit,
          students: currentCapacity.students.limit,
          vehicles: currentCapacity.vehicles.limit,
          drivers: currentCapacity.drivers.limit,
        }
      : {
          schools: plan.capacityDefaults.schools ?? 0,
          students: plan.capacityDefaults.students ?? 0,
          vehicles: plan.capacityDefaults.vehicles ?? 0,
          drivers: plan.capacityDefaults.drivers ?? 0,
        };

  const optionalFeatures = plan.features.filter(
    (feature) =>
      feature.status === "active" &&
      !feature.isSafetyBaseline &&
      feature.mode === "addon",
  );

  const includedFeatureCount = plan.features.filter(
    (feature) =>
      feature.status === "active" &&
      !feature.isSafetyBaseline &&
      feature.mode === "included",
  ).length;

  const featuresById = new Map(
    plan.features.map((feature) => [feature.id, feature]),
  );

  function initialAddons(): Record<string, AddonSelection> {
    if (!samePlan) {
      return {};
    }

    const selections: Record<string, AddonSelection> = {};

    for (const state of featureStates) {
      const feature = featuresById.get(state.featureId);
      const override = state.override;

      if (
        !feature ||
        feature.mode !== "addon" ||
        !override?.enabled ||
        !(override.source === "addon" || override.source === "contract")
      ) {
        continue;
      }

      selections[feature.id] = {
        source: override.source,
        reason: override.notes ?? "Selected during onboarding",
        limitValue:
          override.limitValue !== null
            ? String(override.limitValue)
            : feature.limitValue !== null
              ? String(feature.limitValue)
              : "",
      };
    }

    return selections;
  }

  const existingAddons = initialAddons();

  const [addonSelections, setAddonSelections] =
    useState<Record<string, AddonSelection>>(existingAddons);

  const [showAdditionalFeatures, setShowAdditionalFeatures] = useState(
    Object.keys(existingAddons).length > 0,
  );

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const subscriptionStatus =
    tenant.subscriptionStatus === "trialing" ? "trialing" : "active";

  const unsupportedExistingOverrides = samePlan
    ? featureStates.filter((state) => {
        if (!state.override) {
          return false;
        }

        const feature = featuresById.get(state.featureId);

        return !(
          feature?.mode === "addon" &&
          state.override.enabled &&
          (state.override.source === "addon" ||
            state.override.source === "contract")
        );
      })
    : [];

  const addonLimitsValid = Object.values(addonSelections).every((selection) => {
    if (!selection.limitValue.trim()) {
      return true;
    }

    return parseWholeNumber(selection.limitValue) !== null;
  });

  const validationMessages: string[] = [];

  if (!capacityDefaultsReady) {
    validationMessages.push(
      "This package needs capacity defaults before it can be selected.",
    );
  }

  if (!addonLimitsValid) {
    validationMessages.push(
      "Additional feature allowances must be whole numbers.",
    );
  }

  if (
    subscriptionStatus === "trialing" &&
    !tenant.subscriptionEndsAt
  ) {
    validationMessages.push(
      "The existing trial does not have a valid end date.",
    );
  }

  if (unsupportedExistingOverrides.length > 0) {
    validationMessages.push(
      "Existing specialist feature overrides must be reviewed from Manage School before this setup can be changed.",
    );
  }

  function toggleAddon(
    feature: PlatformPlanFeature,
    selected: boolean,
  ): void {
    setSuccessMessage(null);

    setAddonSelections((currentSelections) => {
      const next = {
        ...currentSelections,
      };

      if (!selected) {
        delete next[feature.id];

        return next;
      }

      next[feature.id] = {
        source: "addon",
        reason: "Selected during onboarding",
        limitValue:
          feature.limitValue !== null ? String(feature.limitValue) : "",
      };

      return next;
    });
  }

  function updateAddonLimit(featureId: string, value: string): void {
    setSuccessMessage(null);

    setAddonSelections((currentSelections) => {
      const selection = currentSelections[featureId];

      if (!selection) {
        return currentSelections;
      }

      return {
        ...currentSelections,

        [featureId]: {
          ...selection,
          limitValue: value,
        },
      };
    });
  }

  const mutation = useMutation({
    mutationFn: () =>
      applyPlatformTenantSalesConfiguration(tenant.id, {
        planId: plan.id,

        status: subscriptionStatus,

        ...(subscriptionStatus === "trialing" && tenant.subscriptionEndsAt
          ? {
              endsAt: tenant.subscriptionEndsAt,
            }
          : {}),

        capacity,

        featureExceptions: Object.entries(addonSelections).map(
          ([featureId, selection]) => ({
            featureId,

            enabled: true,

            source: selection.source,

            reason: selection.reason,

            ...(selection.limitValue.trim()
              ? {
                  limitValue: Number(selection.limitValue),
                }
              : {}),
          }),
        ),
      }),

    onSuccess: async (result) => {
      queryClient.setQueryData(
        ["platform", "tenant-capacity", tenant.id],
        result.capacity,
      );

      queryClient.setQueryData(
        ["platform", "tenant-feature-states", tenant.id],
        result.featureStates,
      );

      const summary = await getPlatformOnboardingSummary(tenant.id);

      const refreshedSubscriptionStatus =
        summary.commercial?.subscriptionStatus;

      const nextSubscriptionStatus =
        refreshedSubscriptionStatus === "active" ||
        refreshedSubscriptionStatus === "trialing" ||
        refreshedSubscriptionStatus === "cancelled" ||
        refreshedSubscriptionStatus === "expired"
          ? refreshedSubscriptionStatus
          : null;

      onTenantUpdated({
        ...tenant,
        id: summary.tenant.id,
        name: summary.tenant.name,
        slug: summary.tenant.slug,
        status: summary.tenant.status,
        timezone: summary.tenant.timezone,
        planCode: summary.commercial?.planCode ?? null,
        planName: summary.commercial?.planName ?? null,
        subscriptionStatus: nextSubscriptionStatus,
        subscriptionStartsAt: summary.commercial?.startsAt ?? null,
        subscriptionEndsAt: summary.commercial?.endsAt ?? null,
      });

      /*
       * The backend remains authoritative.
       * Saving the compact presentation form does not directly mark
       * canonical onboarding evidence complete.
       */
      const workflow = await reconcilePlatformOnboarding(tenant.id);

      queryClient.setQueryData(
        ["platform", "onboarding", "workflow", tenant.id],
        workflow,
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["platform", "onboarding", "summary", tenant.id],
        }),

        queryClient.invalidateQueries({
          queryKey: ["platform", "onboarding", "queue"],
        }),
      ]);

      setSuccessMessage(
        `Commercial setup saved successfully. Audit #${result.auditEventId}.`,
      );
    },
  });

  return (
    <Stack spacing={1.5}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 1.5,
          borderColor: "rgba(255, 255, 255, 0.10)",
          bgcolor: "rgba(255, 255, 255, 0.03)",
        }}
      >
        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={1}
          sx={{
            alignItems: {
              xs: "stretch",
              sm: "center",
            },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 11.5,
                fontWeight: 850,
              }}
            >
              {plan.name}
            </Typography>

            <Typography
              sx={{
                mt: 0.2,
                color: "text.secondary",
                fontSize: 9.5,
              }}
            >
              Package limits and {includedFeatureCount} included feature
              {includedFeatureCount === 1 ? "" : "s"} apply automatically.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: 1.25,
          borderRadius: 1.5,
          borderColor: showAdditionalFeatures
            ? "rgba(37, 99, 235, 0.42)"
            : "rgba(255, 255, 255, 0.10)",
          bgcolor: showAdditionalFeatures
            ? "rgba(37, 99, 235, 0.07)"
            : "rgba(255, 255, 255, 0.025)",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
          }}
        >
          <Checkbox
            size="small"
            checked={showAdditionalFeatures}
            onChange={(event) => {
              const enabled = event.target.checked;

              setShowAdditionalFeatures(enabled);
              setSuccessMessage(null);

              if (!enabled) {
                setAddonSelections({});
              }
            }}
          />

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 850,
              }}
            >
              Purchase additional features
            </Typography>

            <Typography
              sx={{
                mt: 0.1,
                color: "text.secondary",
                fontSize: 9,
              }}
            >
              Enable only when this school is buying features outside the
              selected package.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {showAdditionalFeatures ? (
        <Stack spacing={0.75}>
          {optionalFeatures.map((feature) => {
            const selection = addonSelections[feature.id];
            const selected = Boolean(selection);

            return (
              <Paper
                key={feature.id}
                variant="outlined"
                sx={{
                  px: 1.25,
                  py: 1,
                  borderRadius: 1.5,
                  borderColor: selected
                    ? "rgba(37, 99, 235, 0.42)"
                    : "rgba(255, 255, 255, 0.08)",
                  bgcolor: selected
                    ? "rgba(37, 99, 235, 0.06)"
                    : "transparent",
                }}
              >
                <Stack
                  direction={{
                    xs: "column",
                    sm: "row",
                  }}
                  spacing={1}
                  sx={{
                    alignItems: {
                      xs: "stretch",
                      sm: "center",
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                      alignItems: "center",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={selected}
                      onChange={(event) =>
                        toggleAddon(feature, event.target.checked)
                      }
                    />

                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: 10.5,
                          fontWeight: 800,
                        }}
                      >
                        {feature.name}
                      </Typography>

                      {feature.description ? (
                        <Typography
                          sx={{
                            mt: 0.1,
                            color: "text.secondary",
                            fontSize: 8.5,
                            lineHeight: 1.35,
                          }}
                        >
                          {feature.description}
                        </Typography>
                      ) : null}
                    </Box>
                  </Stack>

                  {selected &&
                  selection &&
                  feature.limitValue !== null ? (
                    <TextField
                      size="small"
                      type="number"
                      label="Allowance"
                      value={selection.limitValue}
                      onChange={(event) =>
                        updateAddonLimit(feature.id, event.target.value)
                      }
                      slotProps={{
                        htmlInput: {
                          min: 0,
                          step: 1,
                        },
                      }}
                      sx={{
                        width: {
                          xs: "100%",
                          sm: 130,
                        },
                      }}
                    />
                  ) : null}
                </Stack>
              </Paper>
            );
          })}

          {optionalFeatures.length === 0 ? (
            <Alert severity="info">
              This package has no separately purchasable features.
            </Alert>
          ) : null}
        </Stack>
      ) : null}

      {unsupportedExistingOverrides.length > 0 ? (
        <Alert severity="warning">
          Existing specialist feature overrides require review under Manage
          School before changing this package.
        </Alert>
      ) : null}

      {validationMessages.length > 0 ? (
        <Alert severity="warning">
          {validationMessages.join(" ")}
        </Alert>
      ) : null}

      {mutation.isError ? (
        <Alert severity="error">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Unable to save commercial setup"}
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert severity="success">{successMessage}</Alert>
      ) : null}

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button
          variant="contained"
          startIcon={
            mutation.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveRounded />
            )
          }
          disabled={mutation.isPending || validationMessages.length > 0}
          onClick={() => {
            setSuccessMessage(null);
            mutation.mutate();
          }}
          sx={{
            minWidth: 210,
            minHeight: 42,
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 850,
          }}
        >
          {mutation.isPending ? "Saving..." : "Save commercial setup"}
        </Button>
      </Box>
    </Stack>
  );
}

export function OnboardingCommercialReview({
  tenant,
  onTenantUpdated,
}: OnboardingCommercialReviewProps) {
  const [selectedPlanOverride, setSelectedPlanOverride] = useState("");

  const plansQuery = useQuery({
    queryKey: ["platform", "plans"],

    queryFn: listPlatformPlans,
  });

  const sellablePlans =
    plansQuery.data?.filter(
      (plan) => plan.isSellable && plan.status === "active",
    ) ?? [];

  const existingPlanId =
    sellablePlans.find((plan) => plan.code === tenant.planCode)?.id ?? "";

  const selectedPlanId = selectedPlanOverride || existingPlanId;

  const planQuery = useQuery({
    queryKey: ["platform", "plan-detail", selectedPlanId],

    enabled: Boolean(selectedPlanId),

    queryFn: () => getPlatformPlan(selectedPlanId),
  });

  const capacityQuery = useQuery({
    queryKey: ["platform", "tenant-capacity", tenant.id],

    queryFn: () => getPlatformTenantCapacity(tenant.id),

    retry: false,
  });

  const featureStatesQuery = useQuery({
    queryKey: ["platform", "tenant-feature-states", tenant.id],

    queryFn: () => listPlatformTenantFeatureStates(tenant.id),

    retry: false,
  });

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          Package
        </Typography>

        <Typography
          sx={{
            mt: 0.25,
            color: "text.secondary",
            fontSize: 9.5,
          }}
        >
          Choose the school&apos;s package. Its standard limits and included
          features are applied automatically.
        </Typography>
      </Box>

      <TextField
        select
        size="small"
        label="Plan / package"
        value={selectedPlanId}
        onChange={(event) => setSelectedPlanOverride(event.target.value)}
        disabled={plansQuery.isLoading}
        sx={{
          maxWidth: 420,
        }}
        fullWidth
      >
        {sellablePlans.map((plan) => (
          <MenuItem key={plan.id} value={plan.id}>
            {plan.name}
          </MenuItem>
        ))}
      </TextField>

      {plansQuery.isError ? (
        <Alert severity="error">Unable to load available packages.</Alert>
      ) : null}

      {!selectedPlanId ? (
        <Alert severity="info">Choose a package to continue.</Alert>
      ) : null}

      {selectedPlanId && planQuery.isLoading ? (
        <Box
          sx={{
            py: 2,
            display: "grid",
            placeItems: "center",
          }}
        >
          <CircularProgress size={24} />
        </Box>
      ) : null}

      {planQuery.isError ? (
        <Alert severity="error">Unable to load the selected package.</Alert>
      ) : null}

      {featureStatesQuery.isError ? (
        <Alert severity="error">
          Existing feature settings could not be loaded. Saving is blocked to
          avoid overwriting unknown settings.
        </Alert>
      ) : null}

      {selectedPlanId &&
      planQuery.data &&
      !featureStatesQuery.isLoading &&
      !featureStatesQuery.isError ? (
        <CommercialDealEditor
          key={[tenant.id, planQuery.data.id].join(":")}
          tenant={tenant}
          plan={planQuery.data}
          currentCapacity={capacityQuery.data ?? null}
          featureStates={featureStatesQuery.data ?? []}
          onTenantUpdated={onTenantUpdated}
        />
      ) : null}
    </Stack>
  );
}
