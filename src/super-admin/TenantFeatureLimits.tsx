import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listPlatformTenantFeatureStates,
  removePlatformTenantFeatureEntitlement,
  setPlatformTenantFeatureEntitlement,
  type PlatformTenantFeatureSource,
  type PlatformTenantFeatureState,
  type PlatformTenantListItem,
} from "./platform.api";

interface TenantFeatureLimitsProps {
  tenant: PlatformTenantListItem;
}

/**
 * Commercial sources suitable for manually managed quota changes.
 *
 * Trial-specific and add-on-specific workflows have additional
 * commercial rules, so they are not mixed into this simple quota
 * adjustment control.
 */
const editableSources: Array<{
  value: PlatformTenantFeatureSource;
  label: string;
}> = [
  {
    value: "billing",
    label: "Billing / purchased capacity",
  },
  {
    value: "contract",
    label: "Contract",
  },
  {
    value: "promotion",
    label: "Promotion",
  },
  {
    value: "manual",
    label: "Manual adjustment",
  },
];

function allowanceLabel(state: PlatformTenantFeatureState): string {
  if (state.planMode !== "included") {
    return "Not included";
  }

  if (state.planLimitValue === null) {
    return "No numeric limit";
  }

  return String(state.planLimitValue);
}

function effectiveAllowanceLabel(state: PlatformTenantFeatureState): string {
  if (!state.effectiveEnabled) {
    return "Disabled";
  }

  if (state.effectiveLimitValue === null) {
    return "No numeric limit";
  }

  return String(state.effectiveLimitValue);
}

interface FeatureLimitEditorProps {
  tenantId: string;

  state: PlatformTenantFeatureState;

  queryKey: readonly unknown[];
}

function FeatureLimitEditor({
  tenantId,
  state,
  queryKey,
}: FeatureLimitEditorProps) {
  const queryClient = useQueryClient();

  const [limitValue, setLimitValue] = useState(
    state.override?.limitValue !== null &&
      state.override?.limitValue !== undefined
      ? String(state.override.limitValue)
      : state.planLimitValue !== null
        ? String(state.planLimitValue)
        : "",
  );

  const [source, setSource] = useState<PlatformTenantFeatureSource>(
    state.override?.source ?? "billing",
  );

  const [notes, setNotes] = useState(state.override?.notes ?? "");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parsedLimit = limitValue.trim() === "" ? null : Number(limitValue);

  const validLimit =
    parsedLimit !== null && Number.isInteger(parsedLimit) && parsedLimit >= 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!validLimit || parsedLimit === null) {
        throw new Error("Enter a whole-number allowance of zero or greater.");
      }

      const commercialReason = notes.trim();

      if (commercialReason.length < 3) {
        throw new Error(
          "Enter the commercial reason for this customer-specific exception.",
        );
      }

      return setPlatformTenantFeatureEntitlement(tenantId, state.featureId, {
        enabled: true,

        source,

        limitValue: parsedLimit,

        notes: commercialReason,
      });
    },

    onSuccess: async () => {
      setSuccessMessage("Feature allowance saved.");

      await queryClient.invalidateQueries({
        queryKey,
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      removePlatformTenantFeatureEntitlement(tenantId, state.featureId),

    onSuccess: async () => {
      setLimitValue(
        state.planLimitValue !== null ? String(state.planLimitValue) : "",
      );

      setSource("billing");

      setNotes("");

      setSuccessMessage(
        "Customer override removed. Package allowance now applies.",
      );

      await queryClient.invalidateQueries({
        queryKey,
      });
    },
  });

  const busy = saveMutation.isPending || removeMutation.isPending;

  const error = saveMutation.error ?? removeMutation.error;

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {state.name}
        </Typography>

        <Typography
          sx={{
            mt: 0.25,
            color: "text.secondary",
            fontSize: 9,
            wordBreak: "break-word",
          }}
        >
          {state.key}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
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
            Package
          </Typography>

          <Typography
            sx={{
              mt: 0.25,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {allowanceLabel(state)}
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
            Effective
          </Typography>

          <Typography
            sx={{
              mt: 0.25,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {effectiveAllowanceLabel(state)}
          </Typography>
        </Box>
      </Box>

      {state.override ? (
        <Alert severity="info">
          Customer override:{" "}
          <strong>{state.override.limitValue ?? "No numeric limit"}</strong> (
          {state.override.source})
        </Alert>
      ) : (
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: 10,
            lineHeight: 1.5,
          }}
        >
          No customer-specific override. The package allowance currently
          applies.
        </Typography>
      )}

      <TextField
        size="small"
        type="number"
        label="Total customer allowance"
        value={limitValue}
        onChange={(event) => {
          setLimitValue(event.target.value);

          setSuccessMessage(null);
        }}
        slotProps={{
          htmlInput: {
            min: 0,
            step: 1,
          },
        }}
        helperText="Enter the total allowance, not the number being added."
        disabled={busy}
        fullWidth
      />

      <TextField
        select
        size="small"
        label="Override source"
        value={source}
        onChange={(event) => {
          setSource(event.target.value as PlatformTenantFeatureSource);

          setSuccessMessage(null);
        }}
        disabled={busy}
        fullWidth
      >
        {editableSources.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        size="small"
        label="Commercial reason"
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);

          setSuccessMessage(null);
        }}
        placeholder="e.g. Professional package + additional allowance agreed as per contract"
        helperText="Required for every customer-specific feature exception"
        required
        multiline
        minRows={2}
        disabled={busy}
        fullWidth
      />

      <Button
        variant="contained"
        disabled={
          !validLimit ||
          notes.trim().length < 3 ||
          busy
        }
        onClick={() => {
          setSuccessMessage(null);

          saveMutation.mutate();
        }}
        fullWidth
      >
        {saveMutation.isPending ? (
          <CircularProgress size={18} color="inherit" />
        ) : (
          "Save customer allowance"
        )}
      </Button>

      {state.override ? (
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() => {
            setSuccessMessage(null);

            removeMutation.mutate();
          }}
          fullWidth
        >
          {removeMutation.isPending
            ? "Removing..."
            : "Return to package allowance"}
        </Button>
      ) : null}

      {error ? (
        <Alert severity="error">
          {error instanceof Error
            ? error.message
            : "Unable to update feature allowance"}
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert severity="success">{successMessage}</Alert>
      ) : null}
    </Stack>
  );
}

export function TenantFeatureLimits({ tenant }: TenantFeatureLimitsProps) {
  const [selectedFeatureKey, setSelectedFeatureKey] = useState(
    "students.custom_fields",
  );

  const queryKey = ["platform", "tenant-feature-states", tenant.id] as const;

  const statesQuery = useQuery({
    queryKey,

    queryFn: () => listPlatformTenantFeatureStates(tenant.id),
  });

  /**
   * At present Student Custom Fields is our first quota-bearing
   * feature.
   *
   * The suffix rule also makes future driver/vehicle/guardian
   * custom-field quota features appear automatically.
   *
   * Any other feature with an explicit numeric plan or tenant
   * limit is also surfaced without requiring a UI rewrite.
   */
  const quotaFeatures =
    statesQuery.data?.filter(
      (state) =>
        state.key.endsWith(".custom_fields") ||
        state.planLimitValue !== null ||
        (state.override !== null && state.override.limitValue !== null),
    ) ?? [];

  const selectedState =
    quotaFeatures.find((state) => state.key === selectedFeatureKey) ??
    quotaFeatures[0] ??
    null;

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        Feature limits
      </Typography>

      <Typography
        sx={{
          mt: 0.5,
          color: "text.secondary",
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        View package allowances and apply customer-specific capacity purchased
        or agreed outside the base package.
      </Typography>

      <Stack
        spacing={1.5}
        sx={{
          mt: 2,
        }}
      >
        {statesQuery.isLoading ? (
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              py: 2,
            }}
          >
            <CircularProgress size={22} />
          </Box>
        ) : null}

        {statesQuery.isError ? (
          <Alert severity="error">
            {statesQuery.error instanceof Error
              ? statesQuery.error.message
              : "Unable to load tenant feature limits"}
          </Alert>
        ) : null}

        {!statesQuery.isLoading &&
        !statesQuery.isError &&
        quotaFeatures.length === 0 ? (
          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 10,
            }}
          >
            No quota-managed features are currently configured.
          </Typography>
        ) : null}

        {quotaFeatures.length > 1 ? (
          <TextField
            select
            size="small"
            label="Feature"
            value={selectedState?.key ?? ""}
            onChange={(event) => setSelectedFeatureKey(event.target.value)}
            fullWidth
          >
            {quotaFeatures.map((state) => (
              <MenuItem key={state.featureId} value={state.key}>
                {state.name}
              </MenuItem>
            ))}
          </TextField>
        ) : null}

        {selectedState ? (
          <FeatureLimitEditor
            key={[
              tenant.id,
              selectedState.featureId,
              selectedState.override?.id ?? "plan",
            ].join(":")}
            tenantId={tenant.id}
            state={selectedState}
            queryKey={queryKey}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
