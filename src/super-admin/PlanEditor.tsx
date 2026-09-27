import { InfoOutlined, LockRounded, SaveRounded } from "@mui/icons-material";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";

import {
  getPlatformPlan,
  listPlatformPlans,
  setPlatformPlanCapacityDefaults,
  setPlatformPlanFeature,
  type PlatformPlanDetail,
  type PlatformPlanFeature,
  type PlatformPlanFeatureMode,
} from "./platform.api";

interface PlanFeatureControlProps {
  plan: PlatformPlanDetail;
  feature: PlatformPlanFeature;
}

function PlanFeatureControl({ plan, feature }: PlanFeatureControlProps) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<PlatformPlanFeatureMode>(feature.mode);

  const [limitValue, setLimitValue] = useState(
    feature.limitValue === null ? "" : String(feature.limitValue),
  );

  const safetyLocked =
    feature.isSafetyBaseline && plan.status === "active" && plan.isSellable;

  const quotaBearing =
    feature.key.endsWith(".custom_fields") || feature.limitValue !== null;

  const parsedLimit = limitValue.trim() === "" ? null : Number(limitValue);

  const validLimit =
    parsedLimit === null || (Number.isInteger(parsedLimit) && parsedLimit >= 0);

  const limitChanged = quotaBearing && parsedLimit !== feature.limitValue;

  const mutation = useMutation({
    mutationFn: ({
      nextMode,
      nextLimit,
    }: {
      nextMode: PlatformPlanFeatureMode;
      nextLimit: number | null;
    }) =>
      setPlatformPlanFeature(plan.id, feature.id, {
        mode: nextMode,
        ...(nextLimit !== null ? { limitValue: nextLimit } : {}),
      }),

    onSuccess: async (result) => {
      setMode(result.mode);

      setLimitValue(
        result.limitValue === null ? "" : String(result.limitValue),
      );

      queryClient.setQueryData<PlatformPlanDetail>(
        ["platform", "plan", plan.id],
        (current) =>
          current
            ? {
                ...current,
                features: current.features.map((item) =>
                  item.id === feature.id
                    ? {
                        ...item,
                        mode: result.mode,
                        limitValue: result.limitValue,
                      }
                    : item,
                ),
              }
            : current,
      );

      await queryClient.invalidateQueries({
        queryKey: ["platform", "plans"],
      });
    },
  });

  function changeMode(nextMode: PlatformPlanFeatureMode | null) {
    if (!nextMode || safetyLocked || mutation.isPending) {
      return;
    }

    setMode(nextMode);

    mutation.mutate({
      nextMode,
      nextLimit: validLimit ? parsedLimit : null,
    });
  }

  return (
    <Box
      sx={{
        py: 1.15,
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "minmax(0,1fr) auto auto",
        },
        alignItems: "center",
        gap: 1.25,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.7,
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 800 }}>
            {mode === "included" ? "✓ " : mode === "addon" ? "+ " : ""}
            {feature.name}
          </Typography>

          {feature.isSafetyBaseline ? (
            <Tooltip title="Required safety baseline">
              <LockRounded
                sx={{
                  width: 13,
                  height: 13,
                  color: "success.main",
                }}
              />
            </Tooltip>
          ) : null}

          {feature.description ? (
            <Tooltip title={feature.description}>
              <InfoOutlined
                sx={{
                  width: 13,
                  height: 13,
                  color: "text.secondary",
                }}
              />
            </Tooltip>
          ) : null}
        </Box>

        <Typography
          sx={{
            mt: 0.2,
            color: "text.secondary",
            fontSize: 8.5,
          }}
        >
          {feature.category}
        </Typography>
      </Box>

      {quotaBearing && mode !== "unavailable" ? (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.6,
          }}
        >
          <TextField
            size="small"
            type="number"
            label="Limit"
            value={limitValue}
            disabled={mutation.isPending}
            onChange={(event) => setLimitValue(event.target.value)}
            slotProps={{
              htmlInput: {
                min: 0,
                step: 1,
              },
            }}
            sx={{ width: 90 }}
          />

          <Button
            size="small"
            disabled={
              !limitChanged ||
              !validLimit ||
              parsedLimit === null ||
              mutation.isPending
            }
            onClick={() =>
              mutation.mutate({
                nextMode: mode,
                nextLimit: parsedLimit,
              })
            }
          >
            Save
          </Button>
        </Box>
      ) : (
        <Box />
      )}

      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        disabled={safetyLocked || mutation.isPending}
        onChange={(_, value) =>
          changeMode(value as PlatformPlanFeatureMode | null)
        }
        aria-label={`${feature.name} package access`}
      >
        <ToggleButton value="included">Core</ToggleButton>

        <ToggleButton value="addon">Add-on</ToggleButton>

        <ToggleButton value="unavailable">Off</ToggleButton>
      </ToggleButtonGroup>

      {mutation.isError ? (
        <Typography
          sx={{
            gridColumn: "1 / -1",
            color: "error.main",
            fontSize: 8.5,
          }}
        >
          Unable to update feature.
        </Typography>
      ) : null}
    </Box>
  );
}

interface PlanCapacityDefaultsEditorProps {
  plan: PlatformPlanDetail;
}

function PlanCapacityDefaultsEditor({ plan }: PlanCapacityDefaultsEditorProps) {
  const queryClient = useQueryClient();

  const defaults = plan.capacityDefaults;

  const [schools, setSchools] = useState(
    defaults.schools === null ? "" : String(defaults.schools),
  );

  const [students, setStudents] = useState(
    defaults.students === null ? "" : String(defaults.students),
  );

  const [vehicles, setVehicles] = useState(
    defaults.vehicles === null ? "" : String(defaults.vehicles),
  );

  const [drivers, setDrivers] = useState(
    defaults.drivers === null ? "" : String(defaults.drivers),
  );

  const [saved, setSaved] = useState(false);

  function parseCapacity(value: string): number | null {
    if (value.trim() === "") {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  }

  const schoolLimit = parseCapacity(schools);

  const studentLimit = parseCapacity(students);

  const vehicleLimit = parseCapacity(vehicles);

  const driverLimit = parseCapacity(drivers);

  const valid =
    schoolLimit !== null &&
    studentLimit !== null &&
    vehicleLimit !== null &&
    driverLimit !== null;

  const mutation = useMutation({
    mutationFn: () => {
      if (
        schoolLimit === null ||
        studentLimit === null ||
        vehicleLimit === null ||
        driverLimit === null
      ) {
        throw new Error(
          "Enter a whole-number allowance of zero or greater for every capacity.",
        );
      }

      return setPlatformPlanCapacityDefaults(plan.id, {
        schools: schoolLimit,

        students: studentLimit,

        vehicles: vehicleLimit,

        drivers: driverLimit,
      });
    },

    onSuccess: (capacityDefaults) => {
      queryClient.setQueryData<PlatformPlanDetail>(
        ["platform", "plan", plan.id],
        (current) =>
          current
            ? {
                ...current,

                capacityDefaults,
              }
            : current,
      );

      setSaved(true);
    },
  });

  return (
    <Box
      sx={{
        p: 1.75,

        border: "1px solid",

        borderColor: "rgba(255, 255, 255, 0.09)",

        borderRadius: 2.5,

        bgcolor: "rgba(255, 255, 255, 0.035)",
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
              fontSize: 12,

              fontWeight: 850,
            }}
          >
            Package capacity
          </Typography>

          <Typography
            sx={{
              mt: 0.25,

              color: "text.secondary",

              fontSize: 9.5,

              lineHeight: 1.5,
            }}
          >
            Default operating allowances automatically offered when Sales
            selects this package.
          </Typography>
        </Box>

        {defaults.configured ? (
          <Chip
            size="small"
            label="Configured"
            color="success"
            variant="outlined"
          />
        ) : (
          <Chip
            size="small"
            label="Needs setup"
            color="warning"
            variant="outlined"
          />
        )}
      </Box>

      {!defaults.configured ? (
        <Alert
          severity="warning"
          sx={{
            mt: 1.5,
          }}
        >
          No package capacity defaults have been set yet. Enter the commercial
          allowances below before using this package in the Sales configuration
          workflow.
        </Alert>
      ) : null}

      <Box
        sx={{
          mt: 1.5,

          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            sm: "repeat(2, minmax(0, 1fr))",

            lg: "repeat(4, minmax(0, 1fr))",
          },

          gap: 1,
        }}
      >
        {[
          {
            label: "Schools",
            value: schools,
            setValue: setSchools,
          },
          {
            label: "Students",
            value: students,
            setValue: setStudents,
          },
          {
            label: "Buses",
            value: vehicles,
            setValue: setVehicles,
          },
          {
            label: "Drivers",
            value: drivers,
            setValue: setDrivers,
          },
        ].map((item) => (
          <TextField
            key={item.label}
            size="small"
            type="number"
            label={item.label}
            value={item.value}
            onChange={(event) => {
              item.setValue(event.target.value);

              setSaved(false);
            }}
            slotProps={{
              htmlInput: {
                min: 0,

                step: 1,
              },
            }}
            disabled={mutation.isPending}
            fullWidth
          />
        ))}
      </Box>

      {mutation.isError ? (
        <Alert
          severity="error"
          sx={{
            mt: 1.5,
          }}
        >
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Unable to save package capacity"}
        </Alert>
      ) : null}

      <Box
        sx={{
          mt: 1.5,

          display: "flex",

          alignItems: "center",

          justifyContent: "flex-end",

          gap: 1,
        }}
      >
        {saved ? (
          <Typography
            sx={{
              color: "success.main",

              fontSize: 10,

              fontWeight: 750,
            }}
          >
            Saved
          </Typography>
        ) : null}

        <Button
          size="small"
          variant="contained"
          startIcon={<SaveRounded />}
          disabled={!valid || mutation.isPending}
          onClick={() => {
            setSaved(false);

            mutation.mutate();
          }}
        >
          {mutation.isPending ? "Saving..." : "Save package capacity"}
        </Button>
      </Box>
    </Box>
  );
}

export function PlanEditor() {
  const [selectedPlanState, setSelectedPlanState] = useState("");

  const plansQuery = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: listPlatformPlans,
  });

  const plans = plansQuery.data ?? [];

  /*
   * Demo remains an internal development package and must not appear
   * in the customer-facing commercial product catalogue.
   */
  const visiblePlans = plans.filter((plan) => plan.code !== "demo");

  const selectedPlanId =
    selectedPlanState &&
    visiblePlans.some((plan) => plan.id === selectedPlanState)
      ? selectedPlanState
      : (visiblePlans[0]?.id ?? "");

  const planQuery = useQuery({
    queryKey: ["platform", "plan", selectedPlanId],
    queryFn: () => getPlatformPlan(selectedPlanId),
    enabled: selectedPlanId !== "",
    staleTime: 30_000,
  });

  const selectedPlan = planQuery.data;

  const liveFeatures =
    selectedPlan?.features.filter(
      (feature) => feature.releaseStage !== "future",
    ) ?? [];

  const coreFeatures = liveFeatures.filter(
    (feature) => feature.mode === "included",
  );

  const addonFeatures = liveFeatures.filter(
    (feature) => feature.mode === "addon",
  );

  const unavailableFeatures = liveFeatures.filter(
    (feature) => feature.mode === "unavailable",
  );

  const futureFeatures =
    selectedPlan?.features.filter(
      (feature) => feature.releaseStage === "future",
    ) ?? [];

  if (plansQuery.isLoading) {
    return (
      <Box sx={{ minHeight: 280, display: "grid", placeItems: "center" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (plansQuery.isError) {
    return (
      <Alert severity="error">
        {plansQuery.error instanceof Error
          ? plansQuery.error.message
          : "Unable to load plans"}
      </Alert>
    );
  }

  if (visiblePlans.length === 0) {
    return (
      <Alert severity="warning">
        No commercial packages are currently available.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 18,
          fontWeight: 900,
          letterSpacing: "-0.02em",
        }}
      >
        Commercial Packages
      </Typography>

      <Typography
        sx={{
          mt: 0.35,
          maxWidth: 700,
          color: "text.secondary",
          fontSize: 10.5,
          lineHeight: 1.6,
        }}
      >
        Select a package to review its included capabilities, capacity and
        optional features.
      </Typography>

      <ToggleButtonGroup
        exclusive
        fullWidth
        value={selectedPlanId}
        onChange={(_, value: string | null) => {
          if (value) {
            setSelectedPlanState(value);
          }
        }}
        aria-label="Commercial package"
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: `repeat(${visiblePlans.length}, minmax(0, 1fr))`,
          },
          gap: 0.75,
          "& .MuiToggleButtonGroup-grouped": {
            m: 0,
            border: "1px solid rgba(255,255,255,0.10) !important",
            borderRadius: "12px !important",
          },
        }}
      >
        {visiblePlans.map((plan) => (
          <ToggleButton
            key={plan.id}
            value={plan.id}
            sx={{
              py: 1.25,
              px: 1,
              color: "text.secondary",
              fontSize: 10,
              fontWeight: 850,
              textTransform: "none",
              bgcolor: "rgba(255,255,255,0.035)",
              "&.Mui-selected": {
                color: "text.primary",
                bgcolor: "rgba(255,255,255,0.11)",
              },
            }}
          >
            {plan.name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Box
        sx={{
          mt: 2.5,
          pt: 2.25,
          borderTop: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {planQuery.isLoading ? (
          <Box sx={{ minHeight: 240, display: "grid", placeItems: "center" }}>
            <CircularProgress size={26} />
          </Box>
        ) : null}

        {planQuery.isError ? (
          <Alert severity="error">
            {planQuery.error instanceof Error
              ? planQuery.error.message
              : "Unable to load package"}
          </Alert>
        ) : null}

        {planQuery.data ? (
          <Stack spacing={1.5}>
            <Box
              sx={{
                display: "flex",
                alignItems: {
                  xs: "flex-start",
                  sm: "center",
                },
                justifyContent: "space-between",
                flexDirection: {
                  xs: "column",
                  sm: "row",
                },
                gap: 1,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 15, fontWeight: 900 }}>
                  {planQuery.data.name}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.2,
                    color: "text.secondary",
                    fontSize: 9.5,
                  }}
                >
                  Detailed package configuration
                </Typography>
              </Box>

              <Stack direction="row" spacing={0.7}>
                <Chip
                  size="small"
                  label={planQuery.data.status}
                  variant="outlined"
                  color={
                    planQuery.data.status === "active" ? "success" : "default"
                  }
                />

                <Chip
                  size="small"
                  label={planQuery.data.isSellable ? "Sellable" : "Internal"}
                  variant="outlined"
                />
              </Stack>
            </Box>

            <PlanCapacityDefaultsEditor
              key={[
                planQuery.data.id,
                planQuery.data.capacityDefaults.updatedAt ?? "unconfigured",
              ].join(":")}
              plan={planQuery.data}
            />

            <Box
              sx={{
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 2.5,
                overflow: "hidden",
                bgcolor: "rgba(255,255,255,0.025)",
              }}
            >
              <Box sx={{ px: 1.75, py: 1.35 }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Core
                </Typography>

                <Typography
                  sx={{
                    mt: 0.2,
                    color: "text.secondary",
                    fontSize: 8.5,
                  }}
                >
                  Features bundled directly into this package.
                </Typography>

                <Box sx={{ mt: 0.8 }}>
                  {coreFeatures.map((feature) => (
                    <PlanFeatureControl
                      key={[
                        selectedPlan!.id,
                        feature.id,
                        feature.mode,
                        feature.limitValue ?? "none",
                      ].join(":")}
                      plan={selectedPlan!}
                      feature={feature}
                    />
                  ))}
                </Box>
              </Box>

              <Box
                sx={{
                  px: 1.75,
                  py: 1.35,
                  borderTop: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Add-ons
                </Typography>

                <Typography
                  sx={{
                    mt: 0.2,
                    color: "text.secondary",
                    fontSize: 8.5,
                  }}
                >
                  Optional live capabilities that can be bundled, sold
                  separately or switched off.
                </Typography>

                <Box sx={{ mt: 0.8 }}>
                  {[...addonFeatures, ...unavailableFeatures].map((feature) => (
                    <PlanFeatureControl
                      key={[
                        selectedPlan!.id,
                        feature.id,
                        feature.mode,
                        feature.limitValue ?? "none",
                      ].join(":")}
                      plan={selectedPlan!}
                      feature={feature}
                    />
                  ))}
                </Box>
              </Box>

              <Box
                sx={{
                  px: 1.75,
                  py: 1.35,
                  borderTop: "1px solid rgba(255,255,255,0.09)",
                  bgcolor: "rgba(255,255,255,0.02)",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Future Releases
                </Typography>

                <Typography
                  sx={{
                    mt: 0.2,
                    color: "text.secondary",
                    fontSize: 8.5,
                  }}
                >
                  Roadmap capabilities. These cannot yet be enabled for a
                  customer package.
                </Typography>

                <Stack spacing={0} sx={{ mt: 0.8 }}>
                  {futureFeatures.map((feature) => (
                    <Box
                      key={feature.id}
                      sx={{
                        py: 1.15,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          ○ {feature.name}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.2,
                            color: "text.secondary",
                            fontSize: 8.5,
                          }}
                        >
                          {feature.description}
                        </Typography>
                      </Box>

                      <Chip size="small" label="Future" variant="outlined" />
                    </Box>
                  ))}

                  {futureFeatures.length === 0 ? (
                    <Typography
                      sx={{
                        py: 1,
                        color: "text.secondary",
                        fontSize: 9,
                      }}
                    >
                      No future releases currently listed.
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            </Box>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
