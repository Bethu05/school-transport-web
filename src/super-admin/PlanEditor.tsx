import {
  InfoOutlined,
  LockRounded,
  SaveRounded,
} from "@mui/icons-material";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
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

interface FeatureRowProps {
  plan: PlatformPlanDetail;

  feature: PlatformPlanFeature;
}

function FeatureRow({ plan, feature }: FeatureRowProps) {
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<PlatformPlanFeatureMode>(feature.mode);

  const [limitValue, setLimitValue] = useState(
    feature.limitValue === null ? "" : String(feature.limitValue),
  );

  const [saved, setSaved] = useState(false);

  const safetyLocked =
    feature.isSafetyBaseline && plan.status === "active" && plan.isSellable;

  const quotaBearing =
    feature.key.endsWith(".custom_fields") || feature.limitValue !== null;

  const parsedLimit = limitValue.trim() === "" ? null : Number(limitValue);

  const validLimit =
    parsedLimit === null || (Number.isInteger(parsedLimit) && parsedLimit >= 0);

  const requiresLimit = quotaBearing && mode !== "unavailable";

  const changed =
    mode !== feature.mode ||
    (quotaBearing &&
      mode !== "unavailable" &&
      parsedLimit !== feature.limitValue);

  const canSave =
    !safetyLocked &&
    changed &&
    validLimit &&
    (!requiresLimit || parsedLimit !== null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!canSave) {
        throw new Error("Enter a valid package configuration.");
      }

      return setPlatformPlanFeature(plan.id, feature.id, {
        mode,

        ...(quotaBearing && mode !== "unavailable" && parsedLimit !== null
          ? {
              limitValue: parsedLimit,
            }
          : {}),
      });
    },

    onSuccess: async (result) => {
      queryClient.setQueryData<PlatformPlanDetail>(
        ["platform", "plan", plan.id],
        (current) => {
          if (!current) {
            return current;
          }

          return {
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
          };
        },
      );

      await queryClient.invalidateQueries({
        queryKey: ["platform", "plans"],
      });

      setSaved(true);
    },
  });

  return (
    <TableRow
      hover
      sx={{
        bgcolor: feature.isSafetyBaseline
          ? "rgba(46, 125, 50, 0.06)"
          : mode === "unavailable"
            ? "rgba(237, 108, 2, 0.06)"
            : undefined,

        "&:hover": {
          bgcolor: feature.isSafetyBaseline
            ? "rgba(46, 125, 50, 0.10)"
            : mode === "unavailable"
              ? "rgba(237, 108, 2, 0.10)"
              : undefined,
        },

        "&:last-child td": {
          borderBottom: 0,
        },
      }}
    >
      <TableCell
        sx={{
          width: "42%",
        }}
      >
        <Box
          sx={{
            display: "flex",

            alignItems: "center",

            gap: 0.75,

            minWidth: 0,
          }}
        >
          <Box
            sx={{
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: "flex",

                alignItems: "center",

                gap: 0.6,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,

                  fontWeight: 750,
                }}
              >
                {feature.name}
              </Typography>

              {feature.description ? (
                <Tooltip title={feature.description} arrow>
                  <InfoOutlined
                    sx={{
                      width: 15,

                      height: 15,

                      color: "text.secondary",
                    }}
                  />
                </Tooltip>
              ) : null}

              {safetyLocked ? (
                <Tooltip title="Required safety-baseline feature" arrow>
                  <LockRounded
                    sx={{
                      width: 14,

                      height: 14,

                      color: "success.main",
                    }}
                  />
                </Tooltip>
              ) : null}
            </Box>

            <Typography
              noWrap
              sx={{
                mt: 0.15,

                color: "text.secondary",

                fontSize: 9,
              }}
            >
              {feature.key}
            </Typography>
          </Box>
        </Box>
      </TableCell>

      <TableCell
        sx={{
          width: 110,
        }}
      >
        <Chip
          size="small"
          label={feature.category}
          variant="outlined"
          sx={{
            height: 22,

            fontSize: 9,

            textTransform: "capitalize",
          }}
        />
      </TableCell>

      <TableCell
        sx={{
          width: 135,
        }}
      >
        <TextField
          select
          size="small"
          value={mode}
          disabled={safetyLocked || mutation.isPending}
          onChange={(event) => {
            setMode(event.target.value as PlatformPlanFeatureMode);

            setSaved(false);
          }}
          sx={{
            width: 125,

            "& .MuiInputBase-root": {
              height: 32,

              fontSize: 10.5,
            },
          }}
        >
          <MenuItem value="included">Included</MenuItem>

          <MenuItem value="addon">Add-on</MenuItem>

          <MenuItem value="unavailable">Unavailable</MenuItem>
        </TextField>
      </TableCell>

      <TableCell
        sx={{
          width: 100,
        }}
      >
        {quotaBearing ? (
          <TextField
            size="small"
            type="number"
            value={mode === "unavailable" ? "" : limitValue}
            placeholder="—"
            disabled={
              safetyLocked || mutation.isPending || mode === "unavailable"
            }
            onChange={(event) => {
              setLimitValue(event.target.value);

              setSaved(false);
            }}
            slotProps={{
              htmlInput: {
                min: 0,

                step: 1,

                "aria-label": `${feature.name} package limit`,
              },
            }}
          />
        ) : (
          <Typography
            sx={{
              color: "text.disabled",

              fontSize: 12,

              textAlign: "center",
            }}
          >
            —
          </Typography>
        )}
      </TableCell>

      <TableCell
        align="right"
        sx={{
          width: 85,
        }}
      >
        {safetyLocked ? (
          <Typography
            sx={{
              color: "success.main",

              fontSize: 9,

              fontWeight: 750,
            }}
          >
            Required
          </Typography>
        ) : (
          <Button
            size="small"
            disabled={!canSave || mutation.isPending}
            onClick={() => {
              setSaved(false);

              mutation.mutate();
            }}
            sx={{
              minWidth: 58,

              textTransform: "none",

              fontSize: 10,
            }}
          >
            {mutation.isPending ? "Saving" : saved ? "Saved" : "Save"}
          </Button>
        )}

        {mutation.isError ? (
          <Typography
            sx={{
              mt: 0.3,

              color: "error.main",

              fontSize: 8,
            }}
          >
            Error
          </Typography>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

interface PlanCapacityDefaultsEditorProps {
  plan: PlatformPlanDetail;
}

/**
 * Central package-level operating defaults.
 *
 * These numbers define the package starting point used by Sales.
 * Tenant-specific negotiated capacity remains separate.
 */
function PlanCapacityDefaultsEditor({
  plan,
}: PlanCapacityDefaultsEditorProps) {
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

      return setPlatformPlanCapacityDefaults(
        plan.id,
        {
          schools: schoolLimit,

          students: studentLimit,

          vehicles: vehicleLimit,

          drivers: driverLimit,
        },
      );
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
        mt: 2,

        p: 1.5,

        border: "1px solid",

        borderColor: "divider",

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
            Default operating allowances automatically offered when Sales selects
            this package.
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
          {mutation.isPending
            ? "Saving..."
            : "Save package capacity"}
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

  /**
   * Do not show the internal Demo package in the main commercial
   * editor. It remains available in the backend for development.
   */
  const visiblePlans = plans.filter((plan) => plan.code !== "demo");

  const selectedPlanId = selectedPlanState || visiblePlans[0]?.id || "";

  const planQuery = useQuery({
    queryKey: ["platform", "plan", selectedPlanId],

    queryFn: () => getPlatformPlan(selectedPlanId),

    enabled: selectedPlanId !== "",
  });

  if (plansQuery.isLoading) {
    return (
      <Box
        sx={{
          minHeight: 280,

          display: "grid",

          placeItems: "center",
        }}
      >
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

  return (
    <Box>
      {/* ====================================================
          COMPACT HEADER
          ==================================================== */}

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
              fontSize: 17,

              fontWeight: 850,
            }}
          >
            Plan Editor
          </Typography>

          <Typography
            sx={{
              mt: 0.35,

              color: "text.secondary",

              fontSize: 11,
            }}
          >
            Configure which capabilities each commercial package includes.
          </Typography>
        </Box>

        <TextField
          select
          size="small"
          label="Plan"
          value={selectedPlanId}
          onChange={(event) => {
            setSelectedPlanState(event.target.value);
          }}
          sx={{
            width: {
              xs: "100%",

              md: 165,
            },

            "& .MuiInputBase-root": {
              height: 34,

              fontSize: 11,
            },

            "& .MuiInputLabel-root": {
              fontSize: 11,
            },
          }}
        >
          {visiblePlans.map((plan) => (
            <MenuItem key={plan.id} value={plan.id}>
              {plan.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* ====================================================
          SELECTED PLAN SUMMARY
          ==================================================== */}

      {planQuery.data ? (
        <Box
          sx={{
            mt: 2,

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 13,

                fontWeight: 800,
              }}
            >
              {planQuery.data.name}
            </Typography>

            <Typography
              sx={{
                mt: 0.25,

                color: "text.secondary",

                fontSize: 9.5,
              }}
            >
              Feature descriptions are available from the information icon.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              label={planQuery.data.status}
              variant="outlined"
              color={planQuery.data.status === "active" ? "success" : "default"}
            />

            <Chip
              size="small"
              label={planQuery.data.isSellable ? "Sellable" : "Internal"}
              variant="outlined"
            />
          </Stack>
        </Box>
      ) : null}

      {planQuery.data ? (
        <PlanCapacityDefaultsEditor
          key={[
            planQuery.data.id,
            planQuery.data.capacityDefaults.updatedAt ?? "unconfigured",
          ].join(":")}
          plan={planQuery.data}
        />
      ) : null}

      {/* ====================================================
          FEATURE TABLE
          ==================================================== */}

      {planQuery.isLoading ? (
        <Box
          sx={{
            minHeight: 260,

            display: "grid",

            placeItems: "center",
          }}
        >
          <CircularProgress size={26} />
        </Box>
      ) : null}

      {planQuery.isError ? (
        <Alert
          severity="error"
          sx={{
            mt: 2,
          }}
        >
          {planQuery.error instanceof Error
            ? planQuery.error.message
            : "Unable to load plan"}
        </Alert>
      ) : null}

      {planQuery.data ? (
        <TableContainer
          sx={{
            mt: 1.5,

            border: "1px solid",

            borderColor: "divider",

            borderRadius: 2,

            maxHeight: "calc(100vh - 330px)",
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Feature</TableCell>

                <TableCell>Category</TableCell>

                <TableCell>Access</TableCell>

                <TableCell>Limit</TableCell>

                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {planQuery.data.features.map((feature) => (
                <FeatureRow
                  key={[
                    planQuery.data.id,

                    feature.id,

                    feature.mode,

                    feature.limitValue ?? "none",
                  ].join(":")}
                  plan={planQuery.data}
                  feature={feature}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Box>
  );
}
