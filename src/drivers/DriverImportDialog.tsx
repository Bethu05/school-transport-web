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
  importDrivers,
  type DriverStatus,
  type ImportDriverRowInput,
  type ImportDriversResult,
} from "./drivers.api";

interface DriverImportDialogProps {
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

function optional(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function parseDriverCsv(text: string): {
  rows: ImportDriverRowInput[];
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

  const requiredHeaders = [
    "first_name",
    "last_name",
    "license_number",
    "license_expiry_date",
  ];

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      return {
        rows: [],
        error: `Missing required CSV column: ${required}`,
      };
    }
  }

  const indexOf = (name: string) => headers.indexOf(name);
  const results: ImportDriverRowInput[] = [];
  const licenses = new Set<string>();

  for (let index = 1; index < parsed.length; index += 1) {
    const source = parsed[index];
    const rowNumber = index + 1;

    const firstName = source[indexOf("first_name")]?.trim() ?? "";
    const lastName = source[indexOf("last_name")]?.trim() ?? "";
    const licenseNumber = source[indexOf("license_number")]?.trim() ?? "";
    const licenseExpiryDate =
      source[indexOf("license_expiry_date")]?.trim() ?? "";

    if (!firstName || !lastName) {
      return {
        rows: [],
        error: `Row ${rowNumber}: first_name and last_name are required.`,
      };
    }

    if (!licenseNumber) {
      return {
        rows: [],
        error: `Row ${rowNumber}: license_number is required.`,
      };
    }

    const licenseKey = licenseNumber.toLowerCase();

    if (licenses.has(licenseKey)) {
      return {
        rows: [],
        error: `Row ${rowNumber}: duplicate licence number ${licenseNumber}.`,
      };
    }

    licenses.add(licenseKey);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(licenseExpiryDate) ||
      Number.isNaN(new Date(`${licenseExpiryDate}T00:00:00Z`).getTime())
    ) {
      return {
        rows: [],
        error: `Row ${rowNumber}: license_expiry_date must be YYYY-MM-DD.`,
      };
    }

    const email = optional(source[indexOf("email")]);

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        rows: [],
        error: `Row ${rowNumber}: invalid email address.`,
      };
    }

    const status = optional(source[indexOf("status")]) ?? "active";

    if (!["active", "inactive", "suspended"].includes(status)) {
      return {
        rows: [],
        error: `Row ${rowNumber}: invalid status.`,
      };
    }

    results.push({
      firstName,
      lastName,
      phone: optional(source[indexOf("phone")]),
      email: email?.toLowerCase(),
      licenseNumber,
      licenseClass: optional(source[indexOf("license_class")]),
      licenseExpiryDate,
      photoUrl: optional(source[indexOf("photo_url")]),
      status: status as DriverStatus,
    });
  }

  if (results.length === 0) {
    return { rows: [], error: "The CSV contains no driver rows." };
  }

  if (results.length > 200) {
    return {
      rows: [],
      error: "A maximum of 200 drivers can be imported at once.",
    };
  }

  return { rows: results, error: null };
}

export function DriverImportDialog({
  open,
  tenantId,
  schoolId,
  schoolName,
  onClose,
}: DriverImportDialogProps) {
  const queryClient = useQueryClient();

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportDriverRowInput[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportDriversResult | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      importDrivers(tenantId, {
        schoolId,
        rows,
      }),

    onSuccess: async (response) => {
      setResult(response);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["drivers"] }),
        queryClient.invalidateQueries({ queryKey: ["drivers-summary"] }),
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

    const parsed = parseDriverCsv(await file.text());

    setRows(parsed.rows);
    setParseError(parsed.error);
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>Import Drivers</DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Driver profiles will be imported into {schoolName}. Login access is
          not created by this bulk import and can be provisioned separately
          through the existing Driver App access workflow.
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
              Preview — {rows.length} drivers
            </Typography>

            {rows.map((row, index) => (
              <Typography
                key={`${row.licenseNumber}-${index}`}
                variant="body2"
                sx={{ mt: 0.7 }}
              >
                {index + 2}. {row.firstName} {row.lastName} —{" "}
                {row.licenseNumber}
              </Typography>
            ))}
          </Box>
        ) : null}

        {mutation.isPending ? <LinearProgress sx={{ mt: 3 }} /> : null}

        {mutation.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Driver import failed."}
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
                  key={`${item.rowNumber}-${item.licenseNumber}`}
                  variant="body2"
                  sx={{ mt: 1, color: "error.main" }}
                >
                  Row {item.rowNumber}: {item.licenseNumber} —{" "}
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
            : `Import ${rows.length} Drivers`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
