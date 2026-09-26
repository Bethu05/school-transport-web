import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Typography,
} from "@mui/material";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  importGuardians,
  type ImportGuardianRowInput,
  type ImportGuardiansResult,
} from "./guardians.api";

interface GuardianImportDialogProps {
  open: boolean;
  tenantId: string;
  onClose: () => void;
}

interface ParsedGuardianCsv {
  rows: ImportGuardianRowInput[];
  error: string | null;
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

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell);

  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function parseGuardianCsv(text: string): ParsedGuardianCsv {
  const parsed = parseCsv(text.replace(/^\uFEFF/, ""));

  if (parsed.length === 0) {
    return {
      rows: [],
      error: "The CSV file is empty.",
    };
  }

  const headers = parsed[0].map((header) => header.trim().toLowerCase());

  if (headers.includes("tenant_code") || headers.includes("tenant_id")) {
    return {
      rows: [],
      error:
        "Tenant columns are not allowed. The signed-in tenant is always used.",
    };
  }

  const requiredHeaders = ["first_name", "last_name", "email"];

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      return {
        rows: [],
        error: `Missing required CSV column: ${required}`,
      };
    }
  }

  const firstNameIndex = headers.indexOf("first_name");
  const lastNameIndex = headers.indexOf("last_name");
  const emailIndex = headers.indexOf("email");
  const phoneIndex = headers.indexOf("phone");

  const rows: ImportGuardianRowInput[] = [];
  const emails = new Set<string>();

  for (let index = 1; index < parsed.length; index += 1) {
    const source = parsed[index];

    const firstName = (source[firstNameIndex] ?? "").trim();
    const lastName = (source[lastNameIndex] ?? "").trim();
    const email = (source[emailIndex] ?? "").trim().toLowerCase();
    const phone = phoneIndex === -1 ? "" : (source[phoneIndex] ?? "").trim();

    const rowNumber = index + 1;

    if (!firstName) {
      return {
        rows: [],
        error: `Row ${rowNumber}: first_name is required.`,
      };
    }

    if (!lastName) {
      return {
        rows: [],
        error: `Row ${rowNumber}: last_name is required.`,
      };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        rows: [],
        error: `Row ${rowNumber}: a valid email is required.`,
      };
    }

    if (emails.has(email)) {
      return {
        rows: [],
        error: `Row ${rowNumber}: duplicate email ${email}.`,
      };
    }

    emails.add(email);

    rows.push({
      firstName,
      lastName,
      email,
      phone: phone || undefined,
    });
  }

  if (rows.length === 0) {
    return {
      rows: [],
      error: "The CSV contains no Guardian rows.",
    };
  }

  if (rows.length > 200) {
    return {
      rows: [],
      error: "A maximum of 200 Guardians can be imported at once.",
    };
  }

  return {
    rows,
    error: null,
  };
}

export function GuardianImportDialog({
  open,
  tenantId,
  onClose,
}: GuardianImportDialogProps) {
  const queryClient = useQueryClient();

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportGuardianRowInput[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportGuardiansResult | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      importGuardians(tenantId, {
        rows,
      }),

    onSuccess: async (response) => {
      setResult(response);

      await queryClient.invalidateQueries({
        queryKey: ["guardians"],
      });
    },
  });

  function reset(): void {
    setFileName("");
    setRows([]);
    setParseError(null);
    setResult(null);
    mutation.reset();
  }

  function handleClose(): void {
    if (mutation.isPending) {
      return;
    }

    reset();
    onClose();
  }

  async function handleFile(file: File | undefined): Promise<void> {
    setResult(null);
    mutation.reset();

    if (!file) {
      setFileName("");
      setRows([]);
      setParseError(null);
      return;
    }

    setFileName(file.name);

    const parsed = parseGuardianCsv(await file.text());

    setRows(parsed.rows);
    setParseError(parsed.error);
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Guardians from CSV</DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Guardians are imported into the currently signed-in organisation. The
          CSV cannot select another tenant.
        </Alert>

        <Button
          component="label"
          variant="outlined"
          disabled={mutation.isPending}
        >
          Select CSV
          <input
            hidden
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.currentTarget.value = "";
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
              Preview — {rows.length} Guardian
              {rows.length === 1 ? "" : "s"}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            {rows.slice(0, 20).map((row, index) => (
              <Typography
                key={`${row.email}-${index}`}
                variant="body2"
                sx={{ py: 0.3 }}
              >
                {index + 2}. {row.firstName} {row.lastName}
                {" — "}
                {row.email}
                {row.phone ? ` — ${row.phone}` : ""}
              </Typography>
            ))}

            {rows.length > 20 ? (
              <Typography variant="body2" sx={{ mt: 1 }}>
                …plus {rows.length - 20} more.
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {mutation.isPending ? <LinearProgress sx={{ mt: 3 }} /> : null}

        {mutation.isError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Guardian import failed."}
          </Alert>
        ) : null}

        {result ? (
          <Box sx={{ mt: 3 }}>
            <Alert severity={result.rejected === 0 ? "success" : "warning"}>
              Imported: {result.imported} — Rejected: {result.rejected}
            </Alert>

            {result.results
              .filter((item) => item.status === "rejected")
              .slice(0, 20)
              .map((item) => (
                <Typography
                  key={`${item.rowNumber}-${item.email}`}
                  variant="body2"
                  sx={{ mt: 1 }}
                >
                  Row {item.rowNumber}: {item.email} —{" "}
                  {item.message ?? "Rejected"}
                </Typography>
              ))}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={mutation.isPending}>
          Close
        </Button>

        <Button
          variant="contained"
          disabled={
            mutation.isPending ||
            rows.length === 0 ||
            parseError !== null ||
            !tenantId
          }
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? "Importing..."
            : `Import ${rows.length || ""} Guardians`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
