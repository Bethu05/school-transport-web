import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from "@mui/material";

import { CheckCircleRounded, UploadFileRounded } from "@mui/icons-material";

import type {
  ImportStudentRowInput,
  ImportStudentsResult,
} from "./students.api";

interface ParsedStudentCsv {
  rows: ImportStudentRowInput[];
  errors: string[];
}

interface StudentImportDialogProps {
  open: boolean;
  schoolName: string;
  importing: boolean;
  error: string | null;
  result: ImportStudentsResult | null;
  onClose: () => void;
  onImport: (rows: ImportStudentRowInput[]) => Promise<void>;
}

const REQUIRED_HEADERS = [
  "external_ref",
  "first_name",
  "last_name",
  "grade",
] as const;

function parseCsvRecords(input: string): string[][] {
  const records: string[][] = [];

  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"') {
      quoted = true;
      continue;
    }

    if (character === ",") {
      record.push(field);
      field = "";
      continue;
    }

    if (character === "\n") {
      record.push(field);
      records.push(record);

      record = [];
      field = "";

      continue;
    }

    if (character === "\r") {
      if (input[index + 1] === "\n") {
        continue;
      }

      record.push(field);
      records.push(record);

      record = [];
      field = "";

      continue;
    }

    field += character;
  }

  if (quoted) {
    throw new Error("CSV contains an unterminated quoted value.");
  }

  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

export function parseStudentImportCsv(input: string): ParsedStudentCsv {
  const records = parseCsvRecords(input).filter((record) =>
    record.some((field) => field.trim() !== ""),
  );

  if (records.length === 0) {
    return {
      rows: [],
      errors: ["The CSV file is empty."],
    };
  }

  const headers = records[0].map((header, index) => {
    const clean = index === 0 ? header.replace(/^\uFEFF/, "") : header;

    return clean.trim().toLowerCase();
  });

  const headerIndex = new Map(headers.map((header, index) => [header, index]));

  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !headerIndex.has(header),
  );

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        `Missing required column${missingHeaders.length === 1 ? "" : "s"}: ${missingHeaders.join(
          ", ",
        )}.`,
      ],
    };
  }

  const rows: ImportStudentRowInput[] = [];
  const errors: string[] = [];
  const externalReferences = new Set<string>();

  function field(record: string[], header: string): string {
    const index = headerIndex.get(header);

    if (index === undefined) {
      return "";
    }

    return record[index]?.trim() ?? "";
  }

  for (let index = 1; index < records.length; index += 1) {
    const record = records[index];

    const rowNumber = index + 1;

    const externalRef = field(record, "external_ref");
    const firstName = field(record, "first_name");
    const lastName = field(record, "last_name");
    const grade = field(record, "grade");
    const photoUrl = field(record, "photo_url");

    const missing = [
      ["external_ref", externalRef],
      ["first_name", firstName],
      ["last_name", lastName],
      ["grade", grade],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      errors.push(`Row ${rowNumber}: missing ${missing.join(", ")}.`);

      continue;
    }

    const duplicateKey = externalRef.toLowerCase();

    if (externalReferences.has(duplicateKey)) {
      errors.push(
        `Row ${rowNumber}: duplicate external_ref "${externalRef}" in this file.`,
      );

      continue;
    }

    externalReferences.add(duplicateKey);

    rows.push({
      externalRef,
      firstName,
      lastName,
      grade,
      photoUrl: photoUrl || undefined,
    });
  }

  if (rows.length > 200) {
    errors.push(
      `This file contains ${rows.length} valid rows. A maximum of 200 students may be imported at once.`,
    );
  }

  return {
    rows,
    errors,
  };
}

export function StudentImportDialog({
  open,
  schoolName,
  importing,
  error,
  result,
  onClose,
  onImport,
}: StudentImportDialogProps) {
  const [fileName, setFileName] = useState<string | null>(null);

  const [rows, setRows] = useState<ImportStudentRowInput[]>([]);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  async function selectFile(file: File | undefined): Promise<void> {
    setRows([]);
    setValidationErrors([]);
    setFileName(file?.name ?? null);

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setValidationErrors(["Please select a .csv file."]);

      return;
    }

    try {
      const parsed = parseStudentImportCsv(await file.text());

      setRows(parsed.rows);
      setValidationErrors(parsed.errors);
    } catch (parseError) {
      setValidationErrors([
        parseError instanceof Error
          ? parseError.message
          : "The CSV file could not be parsed.",
      ]);
    }
  }

  const canImport =
    rows.length > 0 &&
    rows.length <= 200 &&
    validationErrors.length === 0 &&
    !importing &&
    result === null;

  return (
    <Dialog
      open={open}
      onClose={importing ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle
        sx={{
          fontWeight: 850,
        }}
      >
        Import students
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{
            mb: 2,
            color: "text.secondary",
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          Students will be imported into <strong>{schoolName}</strong>. The CSV
          cannot select another school or tenant.
        </Typography>

        <Alert
          severity="info"
          sx={{
            mb: 2,
          }}
        >
          Required columns: external_ref, first_name, last_name and grade.
          photo_url is optional. Maximum 200 students per import.
        </Alert>

        <Button
          component="label"
          variant="outlined"
          startIcon={<UploadFileRounded />}
          disabled={importing || result !== null}
        >
          Choose CSV
          <input
            hidden
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              void selectFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </Button>

        {fileName ? (
          <Typography
            sx={{
              mt: 1,
              color: "text.secondary",
              fontSize: 12,
            }}
          >
            {fileName}
          </Typography>
        ) : null}

        {validationErrors.length > 0 ? (
          <Alert
            severity="error"
            sx={{
              mt: 2,
            }}
          >
            {validationErrors.map((validationError) => (
              <Typography
                key={validationError}
                component="div"
                sx={{
                  fontSize: 12,
                }}
              >
                {validationError}
              </Typography>
            ))}
          </Alert>
        ) : null}

        {error ? (
          <Alert
            severity="error"
            sx={{
              mt: 2,
            }}
          >
            {error}
          </Alert>
        ) : null}

        {rows.length > 0 ? (
          <Box
            sx={{
              mt: 2.5,
            }}
          >
            <Box
              sx={{
                mb: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                }}
              >
                Preview
              </Typography>

              <Chip
                size="small"
                label={`${rows.length} valid student${
                  rows.length === 1 ? "" : "s"
                }`}
              />
            </Box>

            <Paper
              variant="outlined"
              sx={{
                maxHeight: 360,
                overflow: "auto",
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  display: "grid",
                  gridTemplateColumns: "1fr 1.4fr .6fr",
                  gap: 2,
                  bgcolor: "action.hover",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography sx={{ fontSize: 10, fontWeight: 800 }}>
                  Reference
                </Typography>

                <Typography sx={{ fontSize: 10, fontWeight: 800 }}>
                  Student
                </Typography>

                <Typography sx={{ fontSize: 10, fontWeight: 800 }}>
                  Grade
                </Typography>
              </Box>

              {rows.slice(0, 20).map((row) => (
                <Box
                  key={row.externalRef}
                  sx={{
                    px: 2,
                    py: 1.2,
                    display: "grid",
                    gridTemplateColumns: "1fr 1.4fr .6fr",
                    gap: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography sx={{ fontSize: 11.5 }}>
                    {row.externalRef}
                  </Typography>

                  <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                    {row.firstName} {row.lastName}
                  </Typography>

                  <Typography sx={{ fontSize: 11.5 }}>{row.grade}</Typography>
                </Box>
              ))}
            </Paper>
          </Box>
        ) : null}

        {result ? (
          <Alert
            icon={<CheckCircleRounded />}
            severity={result.rejected === 0 ? "success" : "warning"}
            sx={{
              mt: 2.5,
            }}
          >
            Imported {result.imported} of {result.total} students.
            {result.rejected > 0
              ? ` ${result.rejected} row${
                  result.rejected === 1 ? " was" : "s were"
                } rejected.`
              : ""}
          </Alert>
        ) : null}

        {result && result.rejected > 0 ? (
          <Box sx={{ mt: 2 }}>
            {result.results
              .filter((item) => item.status === "rejected")
              .map((item) => (
                <Typography
                  key={`${item.rowNumber}:${item.externalRef}`}
                  sx={{
                    mb: 0.6,
                    color: "error.main",
                    fontSize: 11.5,
                  }}
                >
                  Row {item.rowNumber} — {item.externalRef}:{" "}
                  {item.message ?? "Rejected"}
                </Typography>
              ))}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
        }}
      >
        <Button disabled={importing} onClick={onClose}>
          {result ? "Close" : "Cancel"}
        </Button>

        {!result ? (
          <Button
            variant="contained"
            startIcon={<UploadFileRounded />}
            disabled={!canImport}
            onClick={() => {
              void onImport(rows);
            }}
          >
            {importing
              ? "Importing..."
              : `Import ${rows.length || ""} student${
                  rows.length === 1 ? "" : "s"
                }`}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
