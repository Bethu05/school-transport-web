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
  importTransportManagers,
  type ImportTransportManagerRowInput,
  type ImportTransportManagersResult,
} from "./users.api";

interface TransportManagerImportDialogProps {
  open: boolean;
  tenantId: string;
  onClose: () => void;
}

interface ParsedCsv {
  rows: ImportTransportManagerRowInput[];
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

function parseTransportManagerCsv(text: string): ParsedCsv {
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
        "Tenant columns are not allowed. Transport Managers are imported into the currently selected organisation.",
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

  const rows: ImportTransportManagerRowInput[] = [];

  const emails = new Set<string>();

  for (let index = 1; index < parsed.length; index += 1) {
    const source = parsed[index];

    const firstName = (source[firstNameIndex] ?? "").trim();

    const lastName = (source[lastNameIndex] ?? "").trim();

    const email = (source[emailIndex] ?? "").trim().toLowerCase();

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
    });
  }

  if (rows.length === 0) {
    return {
      rows: [],
      error: "The CSV contains no Transport Manager rows.",
    };
  }

  if (rows.length > 100) {
    return {
      rows: [],
      error: "A maximum of 100 Transport Managers can be imported at once.",
    };
  }

  return {
    rows,
    error: null,
  };
}

export function TransportManagerImportDialog({
  open,
  tenantId,
  onClose,
}: TransportManagerImportDialogProps) {
  const queryClient = useQueryClient();

  const [fileName, setFileName] = useState("");

  const [rows, setRows] = useState<ImportTransportManagerRowInput[]>([]);

  const [parseError, setParseError] = useState<string | null>(null);

  const [result, setResult] = useState<ImportTransportManagersResult | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: () =>
      importTransportManagers(tenantId, {
        rows,
      }),

    onSuccess: async (response) => {
      setResult(response);

      await queryClient.invalidateQueries({
        queryKey: ["tenant-users", tenantId],
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

    const parsed = parseTransportManagerCsv(await file.text());

    setRows(parsed.rows);

    setParseError(parsed.error);
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle>Import Transport Managers</DialogTitle>

      <DialogContent>
        <Alert
          severity="info"
          sx={{
            mb: 2,
          }}
        >
          Every imported account receives the Transport Manager role. Tenant and
          role cannot be selected by the CSV.
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

        {fileName ? (
          <Typography
            sx={{
              mt: 1,
            }}
          >
            {fileName}
          </Typography>
        ) : null}

        {parseError ? (
          <Alert
            severity="error"
            sx={{
              mt: 2,
            }}
          >
            {parseError}
          </Alert>
        ) : null}

        {rows.length > 0 ? (
          <Box
            sx={{
              mt: 3,
            }}
          >
            <Typography variant="h6">
              Preview — {rows.length} Transport Manager
              {rows.length === 1 ? "" : "s"}
            </Typography>

            <Divider
              sx={{
                my: 1.5,
              }}
            />

            {rows.map((row, index) => (
              <Typography
                key={row.email}
                variant="body2"
                sx={{
                  py: 0.3,
                }}
              >
                {index + 2}. {row.firstName} {row.lastName}
                {" — "}
                {row.email}
              </Typography>
            ))}
          </Box>
        ) : null}

        {mutation.isPending ? (
          <LinearProgress
            sx={{
              mt: 3,
            }}
          />
        ) : null}

        {mutation.isError ? (
          <Alert
            severity="error"
            sx={{
              mt: 2,
            }}
          >
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Transport Manager import failed."}
          </Alert>
        ) : null}

        {result ? (
          <Box
            sx={{
              mt: 3,
            }}
          >
            <Alert severity={result.rejected === 0 ? "success" : "warning"}>
              Imported: {result.imported} — Rejected: {result.rejected}
            </Alert>

            {result.imported > 0 ? (
              <Alert
                severity="warning"
                sx={{
                  mt: 2,
                }}
              >
                Temporary passwords are shown below only for this import result.
                Record them securely before closing this dialog.
              </Alert>
            ) : null}

            {result.results.map((item) => (
              <Box
                key={`${item.rowNumber}-${item.email}`}
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  Row {item.rowNumber}: {item.email}
                </Typography>

                {item.status === "imported" && item.temporaryPassword ? (
                  <Typography
                    component="div"
                    variant="body2"
                    sx={{
                      mt: 0.75,
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                    }}
                  >
                    Temporary password: {item.temporaryPassword}
                  </Typography>
                ) : null}

                {item.status === "rejected" ? (
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.75,
                      color: "error.main",
                    }}
                  >
                    {item.message ?? "Rejected"}
                  </Typography>
                ) : null}
              </Box>
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
            !tenantId ||
            result !== null
          }
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending
            ? "Importing..."
            : `Import ${rows.length || ""} Transport Managers`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
