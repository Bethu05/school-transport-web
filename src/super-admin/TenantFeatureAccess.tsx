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

interface TenantFeatureAccessProps {
  tenant: PlatformTenantListItem;
}

interface FeatureAccessEditorProps {
  tenantId: string;

  state: PlatformTenantFeatureState;

  queryKey: readonly unknown[];
}

const LIVE_FLEET_MAP_KEY = "control_room.live_map";

const entitlementSources: Array<{
  value: PlatformTenantFeatureSource;
  label: string;
}> = [
  {
    value: "billing",
    label: "Billing / purchased feature",
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
  {
    value: "trial",
    label: "Trial",
  },
  {
    value: "addon",
    label: "Add-on",
  },
  {
    value: "demo",
    label: "Demo",
  },
];

function packageModeLabel(state: PlatformTenantFeatureState): string {
  switch (state.planMode) {
    case "included":
      return "Included";

    case "addon":
      return "Add-on";

    case "unavailable":
      return "Unavailable";
  }
}

function effectiveSourceLabel(state: PlatformTenantFeatureState): string {
  switch (state.effectiveSource) {
    case "plan":
      return "Package";

    case "override":
      return "Customer override";

    case "none":
      return "None";
  }
}

function FeatureAccessEditor({
  tenantId,
  state,
  queryKey,
}: FeatureAccessEditorProps) {
  const queryClient = useQueryClient();

  const [source, setSource] = useState<PlatformTenantFeatureSource>(
    state.override?.source ?? "billing",
  );

  const [notes, setNotes] = useState(state.override?.notes ?? "");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const commercialReason = notes.trim();

      if (commercialReason.length < 3) {
        throw new Error(
          "Enter the commercial reason for this customer-specific exception.",
        );
      }

      return setPlatformTenantFeatureEntitlement(tenantId, state.featureId, {
        enabled,
        source,
        notes: commercialReason,
      });
    },

    onSuccess: async (_result, enabled) => {
      setSuccessMessage(
        enabled
          ? "Live Fleet Map enabled for this school."
          : "Live Fleet Map disabled for this school.",
      );

      await queryClient.invalidateQueries({
        queryKey,
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      removePlatformTenantFeatureEntitlement(tenantId, state.featureId),

    onSuccess: async () => {
      setSource("billing");

      setNotes("");

      setSuccessMessage(
        "Customer override removed. Package setting now applies.",
      );

      await queryClient.invalidateQueries({
        queryKey,
      });
    },
  });

  const busy = saveMutation.isPending || removeMutation.isPending;

  const error = saveMutation.error ?? removeMutation.error;

  return (
    <Stack data-platform-live-map-entitlement spacing={1.5}>
      <Box>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 850,
          }}
        >
          {state.name}
        </Typography>

        <Typography
          sx={{
            mt: 0.25,
            color: "text.secondary",
            fontSize: 9,
          }}
        >
          {state.key}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, minmax(0, 1fr))",
          },
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
            {packageModeLabel(state)}
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
            {state.effectiveEnabled ? "Enabled" : "Disabled"}
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
            Source
          </Typography>

          <Typography
            sx={{
              mt: 0.25,
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {effectiveSourceLabel(state)}
          </Typography>
        </Box>
      </Box>

      {state.override ? (
        <Alert severity="info">
          Customer override:{" "}
          <strong>{state.override.enabled ? "Enabled" : "Disabled"}</strong> (
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
          No customer-specific override. The package setting currently applies.
        </Typography>
      )}

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
        {entitlementSources.map((option) => (
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
        placeholder="e.g. Live Fleet Map purchased as an additional feature"
        helperText="Required for every customer-specific feature exception"
        required
        multiline
        minRows={2}
        disabled={busy}
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
          disabled={
            notes.trim().length < 3 || busy || state.override?.enabled === true
          }
          onClick={() => {
            setSuccessMessage(null);

            saveMutation.mutate(true);
          }}
          fullWidth
        >
          {saveMutation.isPending && saveMutation.variables === true ? (
            <CircularProgress size={18} color="inherit" />
          ) : (
            "Enable for school"
          )}
        </Button>

        <Button
          variant="outlined"
          color="warning"
          disabled={
            notes.trim().length < 3 || busy || state.override?.enabled === false
          }
          onClick={() => {
            setSuccessMessage(null);

            saveMutation.mutate(false);
          }}
          fullWidth
        >
          {saveMutation.isPending && saveMutation.variables === false ? (
            <CircularProgress size={18} />
          ) : (
            "Disable for school"
          )}
        </Button>
      </Stack>

      {state.override ? (
        <Button
          variant="text"
          disabled={busy}
          onClick={() => {
            setSuccessMessage(null);

            removeMutation.mutate();
          }}
          fullWidth
        >
          {removeMutation.isPending
            ? "Removing..."
            : "Return to package setting"}
        </Button>
      ) : null}

      {error ? (
        <Alert severity="error">
          {error instanceof Error
            ? error.message
            : "Unable to update Live Fleet Map access"}
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert severity="success">{successMessage}</Alert>
      ) : null}
    </Stack>
  );
}

export function TenantFeatureAccess({ tenant }: TenantFeatureAccessProps) {
  const queryKey = ["platform", "tenant-feature-states", tenant.id] as const;

  const statesQuery = useQuery({
    queryKey,

    queryFn: () => listPlatformTenantFeatureStates(tenant.id),
  });

  const liveFleetMapState =
    statesQuery.data?.find((state) => state.key === LIVE_FLEET_MAP_KEY) ?? null;

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        Feature access
      </Typography>

      <Typography
        sx={{
          mt: 0.5,
          color: "text.secondary",
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        Apply customer-specific access exceptions without changing the
        underlying package.
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
              : "Unable to load tenant feature access"}
          </Alert>
        ) : null}

        {!statesQuery.isLoading &&
        !statesQuery.isError &&
        !liveFleetMapState ? (
          <Alert severity="warning">
            Live Fleet Map is not present in the platform feature catalogue.
          </Alert>
        ) : null}

        {liveFleetMapState ? (
          <FeatureAccessEditor
            key={[
              tenant.id,
              liveFleetMapState.featureId,
              liveFleetMapState.override?.id ?? "plan",
            ].join(":")}
            tenantId={tenant.id}
            state={liveFleetMapState}
            queryKey={queryKey}
          />
        ) : null}
      </Stack>
    </Box>
  );
}
