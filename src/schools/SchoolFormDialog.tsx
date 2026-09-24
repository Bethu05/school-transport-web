import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

import type { School } from "./schools.api";

export interface SchoolFormValues {
  name: string;

  shortName: string | null;

  code: string;

  timezone: string;

  address: string | null;
}

interface SchoolFormDialogProps {
  open: boolean;

  school: School | null;

  saving: boolean;

  error: string | null;

  onClose: () => void;

  onSubmit: (input: SchoolFormValues) => Promise<void>;
}

interface SchoolFormState {
  name: string;

  shortName: string;

  code: string;

  timezone: string;

  address: string;
}

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function initialForm(school: School | null): SchoolFormState {
  if (school) {
    return {
      name: school.name,

      shortName: school.shortName ?? "",

      code: school.code,

      timezone: school.timezone,

      address: school.address ?? "",
    };
  }

  return {
    name: "",

    shortName: "",

    code: "",

    timezone: browserTimezone(),

    address: "",
  };
}

export function SchoolFormDialog({
  open,
  school,
  saving,
  error,
  onClose,
  onSubmit,
}: SchoolFormDialogProps) {
  const [form, setForm] = useState<SchoolFormState>(() => initialForm(school));

  const editing = Boolean(school);

  const [validationError, setValidationError] = useState<string | null>(null);

  function updateField<K extends keyof SchoolFormState>(
    key: K,
    value: SchoolFormState[K],
  ): void {
    setForm((current) => ({
      ...current,

      [key]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setValidationError(null);

    const name = form.name.trim();

    const code = form.code.trim().toUpperCase();

    const timezone = form.timezone.trim();

    if (name.length < 2) {
      setValidationError("School name must contain at least 2 characters.");

      return;
    }

    if (!code) {
      setValidationError("School code is required.");

      return;
    }

    if (!timezone) {
      setValidationError("Timezone is required.");

      return;
    }

    await onSubmit({
      name,

      shortName: form.shortName.trim() || null,

      code,

      timezone,

      address: form.address.trim() || null,
    });
  }

  return (
    <Dialog
      open={open}

      onClose={saving ? undefined : onClose}

      fullWidth

      maxWidth="sm"
    >
      <Box
        component="form"

        onSubmit={handleSubmit}
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
          }}
        >
          {editing ? "Edit school" : "Add school"}
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              mb: 2.5,

              color: "text.secondary",

              fontSize: 12,

              lineHeight: 1.65,
            }}
          >
            Add another school or campus to this organisation. Transport data
            remains within the same tenant account.
          </Typography>

          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                sm: "repeat(2, minmax(0, 1fr))",
              },

              gap: 2,
            }}
          >
            {validationError || error ? (
              <Alert
                severity="error"

                sx={{
                  gridColumn: "1 / -1",
                }}
              >
                {validationError ?? error}
              </Alert>
            ) : null}

            <TextField
              required

              label="School name"

              value={form.name}

              onChange={(event) => updateField("name", event.target.value)}

              sx={{
                gridColumn: {
                  sm: "1 / -1",
                },
              }}

              slotProps={{
                htmlInput: {
                  maxLength: 200,
                },
              }}
            />

            <TextField
              label="Short name"

              value={form.shortName}

              onChange={(event) => updateField("shortName", event.target.value)}

              helperText="Optional shorter display name"

              slotProps={{
                htmlInput: {
                  maxLength: 120,
                },
              }}
            />

            <TextField
              required

              label="School code"

              value={form.code}

              onChange={(event) =>
                updateField("code", event.target.value.toUpperCase())
              }

              helperText="A short unique code, e.g. NPS"

              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
            />

            <TextField
              required

              label="Timezone"

              value={form.timezone}

              onChange={(event) => updateField("timezone", event.target.value)}

              helperText="Example: Africa/Nairobi"

              slotProps={{
                htmlInput: {
                  maxLength: 64,
                },
              }}
            />

            <TextField
              label="Address"

              value={form.address}

              onChange={(event) => updateField("address", event.target.value)}

              multiline

              minRows={3}

              sx={{
                gridColumn: {
                  sm: "1 / -1",
                },
              }}

              slotProps={{
                htmlInput: {
                  maxLength: 1000,
                },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,

            pb: 3,
          }}
        >
          <Button
            onClick={onClose}

            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"

            variant="contained"

            disabled={saving}
          >
            {saving ? "Saving..." : editing ? "Save changes" : "Add school"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
