import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Typography,
} from "@mui/material";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  importVehicles,
  type ImportVehicleRowInput,
  type ImportVehiclesResult,
  type VehicleStatus,
} from "./vehicles.api";

interface VehicleImportDialogProps {
  open: boolean;
  tenantId: string;
  schoolId: string;
  schoolName: string;
  onClose: () => void;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      row.push(cell);

      if (row.some((value) => value.trim())) {
        rows.push(row);
      }

      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell);

  if (row.some((value) => value.trim())) {
    rows.push(row);
  }

  return rows;
}

function optional(source: string | undefined): string | undefined {
  return source?.trim() || undefined;
}

function parseVehicleCsv(text: string): {
  rows: ImportVehicleRowInput[];
  error: string | null;
} {
  const parsed = parseCsv(text.replace(/^\uFEFF/, ""));

  if (parsed.length === 0) {
    return { rows: [], error: "The CSV file is empty." };
  }

  const headers = parsed[0].map((value) => value.trim().toLowerCase());

  for (const forbidden of [
    "tenant_code",
    "tenant_id",
    "school_code",
    "school_id",
  ]) {
    if (headers.includes(forbidden)) {
      return {
        rows: [],
        error:
          "Tenant and school columns are not allowed. Import uses the currently selected school.",
      };
    }
  }

  for (const required of ["registration_number", "seat_capacity"]) {
    if (!headers.includes(required)) {
      return {
        rows: [],
        error: `Missing required CSV column: ${required}`,
      };
    }
  }

  const indexOf = (name: string) => headers.indexOf(name);
  const results: ImportVehicleRowInput[] = [];
  const registrations = new Set<string>();

  for (let index = 1; index < parsed.length; index += 1) {
    const source = parsed[index];
    const rowNumber = index + 1;

    const registrationNumber =
      source[indexOf("registration_number")]?.trim() ?? "";

    const seatCapacity = Number(source[indexOf("seat_capacity")]?.trim() ?? "");

    if (!registrationNumber) {
      return {
        rows: [],
        error: `Row ${rowNumber}: registration_number is required.`,
      };
    }

    const key = registrationNumber.toLowerCase();

    if (registrations.has(key)) {
      return {
        rows: [],
        error: `Row ${rowNumber}: duplicate registration number ${registrationNumber}.`,
      };
    }

    registrations.add(key);

    if (
      !Number.isInteger(seatCapacity) ||
      seatCapacity < 1 ||
      seatCapacity > 200
    ) {
      return {
        rows: [],
        error: `Row ${rowNumber}: seat_capacity must be between 1 and 200.`,
      };
    }

    const yearText = source[indexOf("manufacture_year")]?.trim() ?? "";

    const manufactureYear = yearText ? Number(yearText) : undefined;

    if (
      manufactureYear !== undefined &&
      (!Number.isInteger(manufactureYear) ||
        manufactureYear < 1900 ||
        manufactureYear > 2100)
    ) {
      return {
        rows: [],
        error: `Row ${rowNumber}: invalid manufacture_year.`,
      };
    }

    const statusText = optional(source[indexOf("status")]) ?? "active";

    if (
      !["active", "maintenance", "inactive", "retired"].includes(statusText)
    ) {
      return {
        rows: [],
        error: `Row ${rowNumber}: invalid status.`,
      };
    }

    results.push({
      registrationNumber,
      fleetNumber: optional(source[indexOf("fleet_number")]),
      make: optional(source[indexOf("make")]),
      model: optional(source[indexOf("model")]),
      manufactureYear,
      seatCapacity,
      gpsDeviceId: optional(source[indexOf("gps_device_id")]),
      status: statusText as VehicleStatus,
    });
  }

  if (results.length === 0) {
    return { rows: [], error: "The CSV contains no vehicle rows." };
  }

  if (results.length > 200) {
    return {
      rows: [],
      error: "A maximum of 200 vehicles can be imported at once.",
    };
  }

  return { rows: results, error: null };
}

export function VehicleImportDialog({
  open,
  tenantId,
  schoolId,
  schoolName,
  onClose,
}: VehicleImportDialogProps) {
  const queryClient = useQueryClient();

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportVehicleRowInput[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportVehiclesResult | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      importVehicles(tenantId, {
        schoolId,
        rows,
      }),

    onSuccess: async (response) => {
      setResult(response);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
        queryClient.invalidateQueries({ queryKey: ["fleet-summary"] }),
      ]);
    },
  });

  function reset(): void {
    setFileName("");
    setRows([]);
    setParseError(null);
    setResult(null);
    mutation.reset();
  }

  function close(): void {
    if (mutation.isPending) {
      return;
    }

    reset();
    onClose();
  }

  async function handleFile(file: File | undefined): Promise<void> {
    mutation.reset();
    setResult(null);

    if (!file) {
      setFileName("");
      setRows([]);
      setParseError(null);
      return;
    }

    setFileName(file.name);

    const parsed = parseVehicleCsv(await file.text());

    setRows(parsed.rows);
    setParseError(parsed.error);
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>Import Vehicles</DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Vehicles will be imported into {schoolName}. The CSV cannot select
          another tenant or school.
        </Alert>

        <Button component="label" variant="outlined">
          Select CSV
          <input
            hidden
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void handleFile(file);
            }}
          />
        </Button>

        {fileName ? <Typography sx={{ mt: 1 }}>{fileName}</Typography> : null}

        {parseError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {parseError}
          </Alert>
        ) : null}

        {rows.length > 0 ? (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">
              Preview — {rows.length} vehicles
            </Typography>

            {rows.map((row, index) => (
              <Typography
                key={`${row.registrationNumber}-${index}`}
                variant="body2"
                sx={{ mt: 0.7 }}
              >
                {index + 2}. {row.registrationNumber}
                {row.fleetNumber ? ` — ${row.fleetNumber}` : ""}
                {` — ${row.seatCapacity} seats`}
              </Typography>
            ))}
          </Box>
        ) : null}

        {mutation.isPending ? <LinearProgress sx={{ mt: 3 }} /> : null}

        {mutation.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Vehicle import failed."}
          </Alert>
        ) : null}

        {result ? (
          <Box sx={{ mt: 3 }}>
            <Alert severity={result.rejected === 0 ? "success" : "warning"}>
              Imported: {result.imported} — Rejected: {result.rejected}
            </Alert>

            {result.results
              .filter((item) => item.status === "rejected")
              .map((item) => (
                <Typography
                  key={`${item.rowNumber}-${item.registrationNumber}`}
                  variant="body2"
                  sx={{ mt: 1, color: "error.main" }}
                >
                  Row {item.rowNumber}: {item.registrationNumber} —{" "}
                  {item.message ?? "Rejected"}
                </Typography>
              ))}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={close} disabled={mutation.isPending}>
          Close
        </Button>

        <Button
          variant="contained"
          disabled={
            mutation.isPending ||
            rows.length === 0 ||
            parseError !== null ||
            result !== null
          }
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? "Importing..."
            : `Import ${rows.length} Vehicles`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
