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

import { SaveRounded } from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getPlatformTenantCapacity,
  setPlatformTenantCapacity,
  type PlatformTenantCapacityState,
  type PlatformTenantListItem,
  type SetPlatformTenantCapacitySource,
} from "./platform.api";

interface TenantCapacityActionsProps {
  tenant: PlatformTenantListItem;
}

interface CapacityEditorProps {
  tenant: PlatformTenantListItem;

  capacity: PlatformTenantCapacityState;

  queryKey: readonly unknown[];
}

interface CapacityMetricProps {
  label: string;

  helper: string;

  used: number;

  limit: string;

  overLimit: boolean;

  onChange: (value: string) => void;
}

function CapacityMetric({
  label,
  helper,
  used,
  limit,
  overLimit,
  onChange,
}: CapacityMetricProps) {
  return (
    <Box
      sx={{
        p: 2,

        border: "1px solid",

        borderColor: overLimit ? "warning.main" : "divider",

        borderRadius: 2,

        bgcolor: "background.paper",
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

              fontWeight: 800,
            }}
          >
            {label}
          </Typography>

          <Typography
            sx={{
              mt: 0.35,

              color: "text.secondary",

              fontSize: 10,

              lineHeight: 1.5,
            }}
          >
            {helper}
          </Typography>
        </Box>

        <Typography
          sx={{
            whiteSpace: "nowrap",

            fontSize: 13,

            fontWeight: 800,

            color: overLimit ? "warning.main" : "text.primary",
          }}
        >
          {used} / {limit || "—"}
        </Typography>
      </Box>

      <TextField
        sx={{
          mt: 2,
        }}
        size="small"
        type="number"
        label="Tenant allowance"
        value={limit}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        slotProps={{
          htmlInput: {
            min: 0,
            step: 1,
          },
        }}
        fullWidth
      />

      {overLimit ? (
        <Typography
          sx={{
            mt: 1,

            color: "warning.main",

            fontSize: 10,

            fontWeight: 700,
          }}
        >
          Current usage is above the contracted allowance.
        </Typography>
      ) : null}
    </Box>
  );
}

function CapacityEditor({ tenant, capacity, queryKey }: CapacityEditorProps) {
  const queryClient = useQueryClient();

  const [schools, setSchools] = useState(String(capacity.schools.limit));

  const [students, setStudents] = useState(String(capacity.students.limit));

  const [vehicles, setVehicles] = useState(String(capacity.vehicles.limit));

  const [drivers, setDrivers] = useState(String(capacity.drivers.limit));

  const [source, setSource] = useState<SetPlatformTenantCapacitySource>(
    capacity.source === "bootstrap" ? "manual" : capacity.source,
  );

  const [notes, setNotes] = useState(capacity.notes ?? "");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function parseAllowance(value: string): number | null {
    if (value.trim() === "") {
      return null;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  }

  const schoolLimit = parseAllowance(schools);

  const studentLimit = parseAllowance(students);

  const vehicleLimit = parseAllowance(vehicles);

  const driverLimit = parseAllowance(drivers);

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
          "Every capacity allowance must be a whole number of zero or more.",
        );
      }

      return setPlatformTenantCapacity(tenant.id, {
        schools: schoolLimit,

        students: studentLimit,

        vehicles: vehicleLimit,

        drivers: driverLimit,

        source,

        notes: notes.trim() || undefined,
      });
    },

    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);

      setSuccessMessage("Tenant operating capacity updated successfully.");
    },
  });

  return (
    <Stack spacing={2}>
      <Box>
        <Typography
          sx={{
            fontSize: 15,

            fontWeight: 850,
          }}
        >
          Operating capacity
        </Typography>

        <Typography
          sx={{
            mt: 0.5,

            color: "text.secondary",

            fontSize: 11,

            lineHeight: 1.6,
          }}
        >
          These are tenant-wide commercial limits. Schools share one total
          allowance for Students, buses and Drivers.
        </Typography>
      </Box>

      {capacity.source === "bootstrap" ? (
        <Alert severity="info">
          This tenant currently uses migration bootstrap allowances. Save
          contracted limits here before treating them as a live subscription.
        </Alert>
      ) : null}

      {[
        capacity.schools,
        capacity.students,
        capacity.vehicles,
        capacity.drivers,
      ].some((item) => item.overLimit) ? (
        <Alert severity="warning">
          This tenant is above at least one allowance. Existing operational data
          remains available, but new capacity consumption is blocked until usage
          falls below the limit or you increase the allowance.
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            md: "repeat(2, minmax(0, 1fr))",
          },

          gap: 1.5,
        }}
      >
        <CapacityMetric
          label="Schools"
          helper="Total active schools controlled by this tenant."
          used={capacity.schools.used}
          limit={schools}
          overLimit={capacity.schools.overLimit}
          onChange={setSchools}
        />

        <CapacityMetric
          label="Students"
          helper="Total active Students across every school in the tenant."
          used={capacity.students.used}
          limit={students}
          overLimit={capacity.students.overLimit}
          onChange={setStudents}
        />

        <CapacityMetric
          label="Buses / vehicles"
          helper="Active and maintenance vehicles count against this tenant-wide allowance."
          used={capacity.vehicles.used}
          limit={vehicles}
          overLimit={capacity.vehicles.overLimit}
          onChange={setVehicles}
        />

        <CapacityMetric
          label="Drivers"
          helper="Active and suspended Drivers count against the contracted allowance."
          used={capacity.drivers.used}
          limit={drivers}
          overLimit={capacity.drivers.overLimit}
          onChange={setDrivers}
        />
      </Box>

      <TextField
        select
        size="small"
        label="Capacity source"
        value={source}
        onChange={(event) => {
          setSource(event.target.value as SetPlatformTenantCapacitySource);

          setSuccessMessage(null);
        }}
        fullWidth
      >
        <MenuItem value="billing">Billing</MenuItem>

        <MenuItem value="contract">Contract</MenuItem>

        <MenuItem value="promotion">Promotion</MenuItem>

        <MenuItem value="manual">Manual</MenuItem>

        <MenuItem value="demo">Demo</MenuItem>
      </TextField>

      <TextField
        size="small"
        label="Commercial notes"
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);

          setSuccessMessage(null);
        }}
        multiline
        minRows={2}
        fullWidth
      />

      {mutation.isError ? (
        <Alert severity="error">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Unable to update tenant capacity"}
        </Alert>
      ) : null}

      {successMessage ? (
        <Alert severity="success">{successMessage}</Alert>
      ) : null}

      <Button
        variant="contained"
        startIcon={<SaveRounded />}
        disabled={!valid || mutation.isPending}
        onClick={() => {
          setSuccessMessage(null);

          mutation.mutate();
        }}
      >
        {mutation.isPending ? "Saving capacity..." : "Save capacity"}
      </Button>
    </Stack>
  );
}

export function TenantCapacityActions({ tenant }: TenantCapacityActionsProps) {
  const queryKey = ["platform", "tenant-capacity", tenant.id] as const;

  const capacityQuery = useQuery({
    queryKey,

    queryFn: () => getPlatformTenantCapacity(tenant.id),
  });

  if (capacityQuery.isLoading) {
    return (
      <Box
        sx={{
          py: 5,

          display: "grid",

          placeItems: "center",
        }}
      >
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (capacityQuery.isError) {
    return (
      <Alert severity="error">
        {capacityQuery.error instanceof Error
          ? capacityQuery.error.message
          : "Unable to load tenant capacity"}
      </Alert>
    );
  }

  if (!capacityQuery.data) {
    return <Alert severity="error">Tenant capacity is not configured.</Alert>;
  }

  return (
    <CapacityEditor
      key={[tenant.id, capacityQuery.data.updatedAt].join(":")}
      tenant={tenant}
      capacity={capacityQuery.data}
      queryKey={queryKey}
    />
  );
}
