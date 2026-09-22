import { useState } from "react";

import { CheckCircleRounded, SaveRounded } from "@mui/icons-material";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyPlatformTenantSalesConfiguration,
  getPlatformPlan,
  getPlatformTenantCapacity,
  listPlatformPlans,
  listPlatformTenantFeatureStates,
  listPlatformTenants,
  reconcilePlatformOnboarding,
  type PlatformOnboardingStep,
  type PlatformPlanDetail,
  type PlatformPlanFeature,
  type PlatformSalesCapacitySource,
  type PlatformTenantCapacityState,
  type PlatformTenantFeatureState,
  type PlatformTenantListItem,
} from "./platform.api";

interface OnboardingCommercialReviewProps {
  tenant: PlatformTenantListItem;

  commercialSteps: PlatformOnboardingStep[];

  onTenantUpdated: (tenant: PlatformTenantListItem) => void;
}

type CapacityDimension = "schools" | "students" | "vehicles" | "drivers";

type AddonCommercialTreatment = "addon" | "contract";

interface AddonSelection {
  source: AddonCommercialTreatment;

  reason: string;

  limitValue: string;
}

interface CommercialDealEditorProps {
  tenant: PlatformTenantListItem;

  plan: PlatformPlanDetail;

  commercialSteps: PlatformOnboardingStep[];

  currentCapacity: PlatformTenantCapacityState | null;

  featureStates: PlatformTenantFeatureState[];

  onTenantUpdated: (tenant: PlatformTenantListItem) => void;
}

const commercialSubprocesses = [
  {
    stepKey: "package_selection",
    label: "Choose tier",
  },

  {
    stepKey: "package_limits",
    label: "Confirm capacity",
  },

  {
    stepKey: "feature_exceptions",
    label: "Additional features",
  },

  {
    stepKey: "trial_configuration",
    label: "Access period",
  },
] as const;

function stepComplete(step: PlatformOnboardingStep | undefined): boolean {
  return step?.status === "completed" || step?.status === "skipped";
}

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function futureTrialDate(): string {
  const date = new Date();

  date.setDate(date.getDate() + 14);

  return date.toISOString().slice(0, 10);
}

function categoryLabel(category: string): string {
  return humanize(category);
}

function featureModeLabel(feature: PlatformPlanFeature): string {
  if (feature.mode === "included") {
    return "Included";
  }

  if (feature.mode === "addon") {
    return "Optional";
  }

  return "Unavailable";
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

function SubprocessTracker({ steps }: { steps: PlatformOnboardingStep[] }) {
  return (
    <Box
      sx={{
        display: "grid",

        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          xl: "repeat(4, minmax(0, 1fr))",
        },

        gap: 1,
      }}
    >
      {commercialSubprocesses.map((process, index) => {
        const backendStep = steps.find(
          (step) => step.stepKey === process.stepKey,
        );

        const complete = stepComplete(backendStep);

        return (
          <Paper
            key={process.stepKey}
            variant="outlined"
            sx={{
              p: 1.5,

              borderRadius: 2,

              borderColor: complete
                ? "success.main"
                : backendStep?.status === "blocked"
                  ? "error.main"
                  : "divider",

              bgcolor: complete ? "success.50" : "background.paper",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,

                  flexShrink: 0,

                  display: "grid",

                  placeItems: "center",

                  borderRadius: "50%",

                  bgcolor: complete ? "success.main" : "action.hover",

                  color: complete ? "common.white" : "text.secondary",

                  fontSize: 10,

                  fontWeight: 900,
                }}
              >
                {complete ? (
                  <CheckCircleRounded
                    sx={{
                      fontSize: 17,
                    }}
                  />
                ) : (
                  index + 1
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

                    fontWeight: 850,
                  }}
                >
                  {process.label}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.1,

                    color: "text.secondary",

                    fontSize: 8.5,
                  }}
                >
                  {backendStep ? humanize(backendStep.status) : "Pending"}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: number;

  title: string;

  description: string;
}) {
  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.25}
        sx={{
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,

            flexShrink: 0,

            display: "grid",

            placeItems: "center",

            borderRadius: 1.5,

            bgcolor: "primary.main",

            color: "common.white",

            fontSize: 11,

            fontWeight: 900,
          }}
        >
          {number}
        </Box>

        <Typography
          sx={{
            fontSize: 16,

            fontWeight: 900,

            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </Typography>
      </Stack>

      <Typography
        sx={{
          mt: 0.75,

          ml: {
            xs: 0,
            sm: 5.25,
          },

          color: "text.secondary",

          fontSize: 10.5,

          lineHeight: 1.65,
        }}
      >
        {description}
      </Typography>
    </Box>
  );
}

function CommercialDealEditor({
  tenant,
  plan,
  commercialSteps,
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

  const packageDefaults = {
    schools: plan.capacityDefaults.schools ?? 0,

    students: plan.capacityDefaults.students ?? 0,

    vehicles: plan.capacityDefaults.vehicles ?? 0,

    drivers: plan.capacityDefaults.drivers ?? 0,
  };

  const initialCapacity =
    samePlan && currentCapacity
      ? {
          schools: currentCapacity.schools.limit,

          students: currentCapacity.students.limit,

          vehicles: currentCapacity.vehicles.limit,

          drivers: currentCapacity.drivers.limit,
        }
      : packageDefaults;

  const [capacity, setCapacity] = useState<Record<CapacityDimension, string>>({
    schools: String(initialCapacity.schools),

    students: String(initialCapacity.students),

    vehicles: String(initialCapacity.vehicles),

    drivers: String(initialCapacity.drivers),
  });

  const [capacitySource, setCapacitySource] = useState<
    Exclude<PlatformSalesCapacitySource, "billing">
  >(
    currentCapacity?.source === "promotion"
      ? "promotion"
      : currentCapacity?.source === "manual"
        ? "manual"
        : "contract",
  );

  const [capacityReason, setCapacityReason] = useState(
    samePlan ? (currentCapacity?.notes ?? "") : "",
  );

  const [subscriptionStatus, setSubscriptionStatus] = useState<
    "active" | "trialing"
  >(tenant.subscriptionStatus === "trialing" ? "trialing" : "active");

  const [trialEndDate, setTrialEndDate] = useState(
    tenant.subscriptionStatus === "trialing" && tenant.subscriptionEndsAt
      ? tenant.subscriptionEndsAt.slice(0, 10)
      : futureTrialDate(),
  );

  const [dealReference, setDealReference] = useState("");

  const [dealNotes, setDealNotes] = useState("");

  const planFeaturesById = new Map(
    plan.features.map((feature) => [feature.id, feature]),
  );

  function buildInitialAddonSelections(): Record<string, AddonSelection> {
    if (!samePlan) {
      return {};
    }

    const selections: Record<string, AddonSelection> = {};

    for (const state of featureStates) {
      const feature = planFeaturesById.get(state.featureId);

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

        reason: override.notes ?? "",

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

  const [addonSelections, setAddonSelections] = useState<
    Record<string, AddonSelection>
  >(buildInitialAddonSelections);

  const visiblePremiumFeatures = plan.features.filter(
    (feature) => feature.status === "active" && !feature.isSafetyBaseline,
  );

  const [focusedFeatureId, setFocusedFeatureId] = useState(
    visiblePremiumFeatures[0]?.id ?? "",
  );

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parsedCapacity = {
    schools: parseWholeNumber(capacity.schools),

    students: parseWholeNumber(capacity.students),

    vehicles: parseWholeNumber(capacity.vehicles),

    drivers: parseWholeNumber(capacity.drivers),
  };

  const capacityValid = Object.values(parsedCapacity).every(
    (value) => value !== null,
  );

  const capacityChanged =
    capacityValid &&
    (Object.keys(packageDefaults) as CapacityDimension[]).some(
      (dimension) => parsedCapacity[dimension] !== packageDefaults[dimension],
    );

  const capacityReasonValid =
    !capacityChanged || capacityReason.trim().length >= 3;

  const addonReasonsValid = Object.values(addonSelections).every(
    (selection) => selection.reason.trim().length >= 3,
  );

  const addonLimitsValid = Object.values(addonSelections).every((selection) => {
    if (!selection.limitValue.trim()) {
      return true;
    }

    return parseWholeNumber(selection.limitValue) !== null;
  });

  const trialDateValid =
    subscriptionStatus === "active" ||
    (Boolean(trialEndDate) &&
      new Date(`${trialEndDate}T23:59:59+03:00`).getTime() > Date.now());

  /*
   * The onboarding screen intentionally supports the ordinary
   * billable-add-on / included-in-contract sales workflow.
   *
   * If another type of override already exists, fail closed instead
   * of silently replacing an existing commercial decision.
   */
  const unsupportedExistingOverrides = samePlan
    ? featureStates.filter((state) => {
        if (!state.override) {
          return false;
        }

        const feature = planFeaturesById.get(state.featureId);

        return !(
          feature?.mode === "addon" &&
          state.override.enabled &&
          (state.override.source === "addon" ||
            state.override.source === "contract")
        );
      })
    : [];

  const validationMessages: string[] = [];

  if (!capacityDefaultsReady) {
    validationMessages.push(
      "The selected tier does not have complete capacity defaults.",
    );
  }

  if (!capacityValid) {
    validationMessages.push(
      "Capacity must contain whole numbers of zero or greater.",
    );
  }

  if (!capacityReasonValid) {
    validationMessages.push("Negotiated capacity requires a reason.");
  }

  if (!addonReasonsValid) {
    validationMessages.push(
      "Every selected additional feature requires a reason.",
    );
  }

  if (!addonLimitsValid) {
    validationMessages.push("Feature limits must be whole numbers.");
  }

  if (!trialDateValid) {
    validationMessages.push("A trial requires a future end date.");
  }

  if (unsupportedExistingOverrides.length > 0) {
    validationMessages.push(
      "Existing feature overrides outside the normal onboarding sales workflow must be reviewed from Manage School first.",
    );
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (
        parsedCapacity.schools === null ||
        parsedCapacity.students === null ||
        parsedCapacity.vehicles === null ||
        parsedCapacity.drivers === null
      ) {
        throw new Error("Commercial capacity is invalid.");
      }

      return applyPlatformTenantSalesConfiguration(tenant.id, {
        planId: plan.id,

        status: subscriptionStatus,

        ...(subscriptionStatus === "trialing"
          ? {
              endsAt: `${trialEndDate}T23:59:59+03:00`,
            }
          : {}),

        capacity: {
          schools: parsedCapacity.schools,

          students: parsedCapacity.students,

          vehicles: parsedCapacity.vehicles,

          drivers: parsedCapacity.drivers,

          ...(capacityChanged
            ? {
                source: capacitySource,

                reason: capacityReason.trim(),
              }
            : {}),
        },

        featureExceptions: Object.entries(addonSelections).map(
          ([featureId, selection]) => ({
            featureId,

            enabled: true,

            source: selection.source,

            reason: selection.reason.trim(),

            ...(selection.limitValue.trim()
              ? {
                  limitValue: Number(selection.limitValue),
                }
              : {}),
          }),
        ),

        ...(dealReference.trim()
          ? {
              dealReference: dealReference.trim(),
            }
          : {}),

        ...(dealNotes.trim()
          ? {
              dealNotes: dealNotes.trim(),
            }
          : {}),
      });
    },

    onSuccess: async (result) => {
      queryClient.setQueryData(
        ["platform", "tenant-capacity", tenant.id],
        result.capacity,
      );

      queryClient.setQueryData(
        ["platform", "tenant-feature-states", tenant.id],
        result.featureStates,
      );

      const tenants = await listPlatformTenants();

      queryClient.setQueryData(["platform", "tenants"], tenants);

      const refreshedTenant = tenants.find(
        (candidate) => candidate.id === tenant.id,
      );

      if (refreshedTenant) {
        onTenantUpdated(refreshedTenant);
      }

      /*
       * This is the important boundary:
       * UI state never marks onboarding complete itself.
       * The backend reconciler evaluates the audited sales event.
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

  function updateCapacity(dimension: CapacityDimension, value: string): void {
    setCapacity((current) => ({
      ...current,

      [dimension]: value,
    }));

    setSuccessMessage(null);
  }

  function toggleAddon(feature: PlatformPlanFeature, selected: boolean): void {
    setFocusedFeatureId(feature.id);

    setAddonSelections((current) => {
      const next = {
        ...current,
      };

      if (!selected) {
        delete next[feature.id];

        return next;
      }

      next[feature.id] = {
        source: "addon",

        reason: "",

        limitValue:
          feature.limitValue !== null ? String(feature.limitValue) : "",
      };

      return next;
    });

    setSuccessMessage(null);
  }

  function updateAddon(
    featureId: string,
    patch: Partial<AddonSelection>,
  ): void {
    setAddonSelections((current) => {
      const existing = current[featureId];

      if (!existing) {
        return current;
      }

      return {
        ...current,

        [featureId]: {
          ...existing,

          ...patch,
        },
      };
    });

    setSuccessMessage(null);
  }

  const focusedFeature =
    plan.features.find((feature) => feature.id === focusedFeatureId) ?? null;

  const includedFeatureCount = visiblePremiumFeatures.filter(
    (feature) => feature.mode === "included",
  ).length;

  const optionalFeatureCount = visiblePremiumFeatures.filter(
    (feature) => feature.mode === "addon",
  ).length;

  const selectedAddonCount = Object.keys(addonSelections).length;

  return (
    <Stack spacing={3}>
      <SubprocessTracker steps={commercialSteps} />

      {/* ======================================================
          1. TIER
          ====================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },

          borderRadius: 2.5,
        }}
      >
        <Stack spacing={2}>
          <SectionHeading
            number={1}
            title="Choose tier"
            description="Select the base commercial package for this school. Capacity and optional features are reviewed separately below."
          />

          <Box
            sx={{
              ml: {
                xs: 0,
                sm: 5.25,
              },
            }}
          >
            <Stack
              direction={{
                xs: "column",
                md: "row",
              }}
              spacing={1}
              sx={{
                alignItems: {
                  xs: "flex-start",
                  md: "center",
                },
              }}
            >
              <Chip color="primary" label={plan.name} />

              <Chip
                variant="outlined"
                label={`${includedFeatureCount} included`}
              />

              <Chip
                variant="outlined"
                label={`${optionalFeatureCount} optional`}
              />
            </Stack>

            {plan.description ? (
              <Typography
                sx={{
                  mt: 1.25,

                  color: "text.secondary",

                  fontSize: 10.5,

                  lineHeight: 1.65,
                }}
              >
                {plan.description}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      </Paper>

      {/* ======================================================
          2. CAPACITY
          ====================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },

          borderRadius: 2.5,
        }}
      >
        <Stack spacing={2}>
          <SectionHeading
            number={2}
            title="Confirm capacity"
            description="Package limits are pre-filled. Only change a value when the contract gives this school a different allowance."
          />

          {!capacityDefaultsReady ? (
            <Alert severity="error">
              Capacity defaults must be configured for this tier before it can
              be sold.
            </Alert>
          ) : null}

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(4, minmax(0, 1fr))",
              },

              gap: 1.25,
            }}
          >
            {(
              [
                ["schools", "Schools"],

                ["students", "Students"],

                ["vehicles", "Buses / vehicles"],

                ["drivers", "Drivers"],
              ] as const
            ).map(([dimension, label]) => (
              <TextField
                key={dimension}
                size="small"
                type="number"
                label={label}
                value={capacity[dimension]}
                onChange={(event) =>
                  updateCapacity(dimension, event.target.value)
                }
                helperText={`Tier default: ${packageDefaults[dimension]}`}
                slotProps={{
                  htmlInput: {
                    min: 0,
                    step: 1,
                  },
                }}
                fullWidth
              />
            ))}
          </Box>

          {capacityChanged ? (
            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",
                  md: "240px minmax(0, 1fr)",
                },

                gap: 1.25,
              }}
            >
              <TextField
                select
                size="small"
                label="Exception basis"
                value={capacitySource}
                onChange={(event) =>
                  setCapacitySource(
                    event.target.value as Exclude<
                      PlatformSalesCapacitySource,
                      "billing"
                    >,
                  )
                }
                fullWidth
              >
                <MenuItem value="contract">Contract</MenuItem>

                <MenuItem value="promotion">Promotion</MenuItem>

                <MenuItem value="manual">Approved manual exception</MenuItem>
              </TextField>

              <TextField
                size="small"
                label="Reason for different capacity"
                value={capacityReason}
                onChange={(event) => setCapacityReason(event.target.value)}
                placeholder="Why does this school differ from the tier defaults?"
                fullWidth
              />
            </Box>
          ) : (
            <Alert severity="success">
              This school is using the normal capacity bundled with the selected
              tier.
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* ======================================================
          3. PREMIUM / OPTIONAL FEATURES
          ====================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },

          borderRadius: 2.5,
        }}
      >
        <Stack spacing={2}>
          <SectionHeading
            number={3}
            title="Additional features"
            description="Use the checkbox for simple feature selection. Features already bundled with the tier are shown as included; unavailable features remain locked."
          />

          <Stack spacing={0.75}>
            {visiblePremiumFeatures.map((feature) => {
              const included = feature.mode === "included";

              const selectable = feature.mode === "addon";

              const selection = addonSelections[feature.id];

              const checked = included || Boolean(selection);

              return (
                <Paper
                  key={feature.id}
                  variant="outlined"
                  onClick={() => setFocusedFeatureId(feature.id)}
                  sx={{
                    p: 1.25,

                    borderRadius: 2,

                    borderColor: selection ? "primary.main" : "divider",

                    cursor: "pointer",
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
                      checked={checked}
                      disabled={!selectable}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        toggleAddon(feature, event.target.checked)
                      }
                    />

                    <Box
                      sx={{
                        minWidth: 0,

                        flex: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 11,

                          fontWeight: 850,
                        }}
                      >
                        {feature.name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.1,

                          color: "text.secondary",

                          fontSize: 8.5,
                        }}
                      >
                        {categoryLabel(feature.category)}
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      label={featureModeLabel(feature)}
                      color={
                        included ? "success" : selectable ? "info" : "default"
                      }
                      variant="outlined"
                    />
                  </Stack>

                  {selection && selectable ? (
                    <Box
                      sx={{
                        mt: 1.25,

                        ml: {
                          xs: 0,
                          sm: 5,
                        },

                        display: "grid",

                        gridTemplateColumns: {
                          xs: "1fr",
                          md:
                            feature.limitValue !== null
                              ? "200px minmax(0, 1fr) 180px"
                              : "200px minmax(0, 1fr)",
                        },

                        gap: 1,
                      }}
                    >
                      <TextField
                        select
                        size="small"
                        label="Commercial treatment"
                        value={selection.source}
                        onChange={(event) =>
                          updateAddon(feature.id, {
                            source: event.target
                              .value as AddonCommercialTreatment,
                          })
                        }
                        fullWidth
                      >
                        <MenuItem value="addon">Billable add-on</MenuItem>

                        <MenuItem value="contract">
                          Included in contract
                        </MenuItem>
                      </TextField>

                      <TextField
                        size="small"
                        label="Reason"
                        value={selection.reason}
                        onChange={(event) =>
                          updateAddon(feature.id, {
                            reason: event.target.value,
                          })
                        }
                        placeholder="Why has this feature been added?"
                        fullWidth
                      />

                      {feature.limitValue !== null ? (
                        <TextField
                          size="small"
                          type="number"
                          label="Total allowance"
                          value={selection.limitValue}
                          onChange={(event) =>
                            updateAddon(feature.id, {
                              limitValue: event.target.value,
                            })
                          }
                          slotProps={{
                            htmlInput: {
                              min: 0,
                              step: 1,
                            },
                          }}
                          fullWidth
                        />
                      ) : null}
                    </Box>
                  ) : null}
                </Paper>
              );
            })}
          </Stack>

          {visiblePremiumFeatures.length === 0 ? (
            <Alert severity="info">
              No optional premium features are configured for this tier.
            </Alert>
          ) : null}

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              flexWrap: "wrap",
            }}
          >
            <Chip
              color="primary"
              label={`${selectedAddonCount} additional selected`}
            />

            <Chip
              variant="outlined"
              label={`${includedFeatureCount} already included`}
            />
          </Stack>

          {focusedFeature ? (
            <Box
              sx={{
                p: 2,

                borderRadius: 2,

                bgcolor: "action.hover",
              }}
            >
              <Typography
                sx={{
                  color: "text.secondary",

                  fontSize: 8.5,

                  fontWeight: 850,

                  textTransform: "uppercase",

                  letterSpacing: "0.07em",
                }}
              >
                Feature description
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,

                  fontSize: 12,

                  fontWeight: 850,
                }}
              >
                {focusedFeature.name}
              </Typography>

              <Typography
                sx={{
                  mt: 0.4,

                  color: "text.secondary",

                  fontSize: 10.5,

                  lineHeight: 1.65,
                }}
              >
                {focusedFeature.description ??
                  "No additional description has been configured for this feature."}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Paper>

      {/* ======================================================
          4. ACCESS / TRIAL
          ====================================================== */}

      <Paper
        variant="outlined"
        sx={{
          p: {
            xs: 2,
            md: 2.5,
          },

          borderRadius: 2.5,
        }}
      >
        <Stack spacing={2}>
          <SectionHeading
            number={4}
            title="Access period"
            description="Choose paid access or a time-limited trial. This is saved with the tier, capacity and additional features as one reviewed commercial decision."
          />

          <RadioGroup
            row
            value={subscriptionStatus}
            onChange={(event) =>
              setSubscriptionStatus(event.target.value as "active" | "trialing")
            }
          >
            <FormControlLabel
              value="active"
              control={<Radio />}
              label="Paid / active"
            />

            <FormControlLabel
              value="trialing"
              control={<Radio />}
              label="Trial"
            />
          </RadioGroup>

          {subscriptionStatus === "trialing" ? (
            <TextField
              size="small"
              type="date"
              label="Trial end date"
              value={trialEndDate}
              onChange={(event) => setTrialEndDate(event.target.value)}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              fullWidth
            />
          ) : null}

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(0, 0.7fr) minmax(0, 1.3fr)",
              },

              gap: 1.25,
            }}
          >
            <TextField
              size="small"
              label="Contract / deal reference"
              value={dealReference}
              onChange={(event) => setDealReference(event.target.value)}
              fullWidth
            />

            <TextField
              size="small"
              label="Commercial notes"
              value={dealNotes}
              onChange={(event) => setDealNotes(event.target.value)}
              fullWidth
            />
          </Box>
        </Stack>
      </Paper>

      {unsupportedExistingOverrides.length > 0 ? (
        <Alert severity="warning">
          This school has existing feature overrides that cannot safely be
          represented by this onboarding form. Review those overrides under
          Manage School first.
        </Alert>
      ) : null}

      {validationMessages.length > 0 ? (
        <Alert severity="warning">
          <Stack spacing={0.4}>
            {validationMessages.map((message) => (
              <Typography
                key={message}
                sx={{
                  fontSize: 10,
                }}
              >
                • {message}
              </Typography>
            ))}
          </Stack>
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

      <Button
        variant="contained"
        size="large"
        startIcon={
          mutation.isPending ? (
            <CircularProgress size={18} color="inherit" />
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
          minHeight: 50,

          borderRadius: 2,

          px: 3,

          textTransform: "none",

          fontSize: 13,

          fontWeight: 900,
        }}
        fullWidth
      >
        {mutation.isPending
          ? "Saving commercial setup..."
          : "Save commercial setup"}
      </Button>

      <Typography
        sx={{
          textAlign: "center",

          color: "text.secondary",

          fontSize: 9,
        }}
      >
        The green Commercial Setup status comes from backend onboarding
        reconciliation, not from local UI state.
      </Typography>
    </Stack>
  );
}

export function OnboardingCommercialReview({
  tenant,
  commercialSteps,
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
    <Stack spacing={2.5}>
      <Box>
        <Typography
          sx={{
            fontSize: 18,

            fontWeight: 900,

            letterSpacing: "-0.025em",
          }}
        >
          Commercial Setup
        </Typography>

        <Typography
          sx={{
            mt: 0.4,

            color: "text.secondary",

            fontSize: 11,

            lineHeight: 1.65,
          }}
        >
          One commercial decision covering tier, capacity, optional features and
          access period.
        </Typography>
      </Box>

      <TextField
        select
        label="Tier / package"
        value={selectedPlanId}
        onChange={(event) => setSelectedPlanOverride(event.target.value)}
        disabled={plansQuery.isLoading}
        fullWidth
      >
        {sellablePlans.map((plan) => (
          <MenuItem key={plan.id} value={plan.id}>
            {plan.name}
          </MenuItem>
        ))}
      </TextField>

      {plansQuery.isError ? (
        <Alert severity="error">Unable to load commercial tiers.</Alert>
      ) : null}

      {!selectedPlanId ? (
        <Alert severity="info">
          Choose the school&apos;s commercial tier to continue.
        </Alert>
      ) : null}

      {selectedPlanId && planQuery.isLoading ? (
        <Box
          sx={{
            py: 5,

            display: "grid",

            placeItems: "center",
          }}
        >
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {planQuery.isError ? (
        <Alert severity="error">Unable to load the selected tier.</Alert>
      ) : null}

      {featureStatesQuery.isError ? (
        <Alert severity="error">
          Existing feature entitlements could not be loaded. Saving is blocked
          to prevent accidental replacement of unknown overrides.
        </Alert>
      ) : null}

      {capacityQuery.isError ? (
        <Alert severity="info">
          Existing tenant capacity could not be read. The selected tier defaults
          will be used as the starting point.
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
          commercialSteps={commercialSteps}
          currentCapacity={capacityQuery.data ?? null}
          featureStates={featureStatesQuery.data ?? []}
          onTenantUpdated={onTenantUpdated}
        />
      ) : null}
    </Stack>
  );
}
