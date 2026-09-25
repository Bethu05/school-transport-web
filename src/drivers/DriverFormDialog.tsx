import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import type {
  CreateDriverInput,
  Driver,
  DriverStatus,
  UpdateDriverInput,
} from "./drivers.api";

const BUSINESS_TIME_ZONE = "Africa/Nairobi";

export interface DriverFormSubmission {
  profile: CreateDriverInput | UpdateDriverInput;
  giveDriverAppAccess: boolean;
  temporaryPassword?: string;
}

interface DriverFormDialogProps {
  open: boolean;

  driver: Driver | null;

  activeSchoolId: string;

  activeSchoolName: string;

  saving: boolean;

  canManageAppAccess: boolean;

  error: string | null;

  onClose: () => void;

  onSubmit: (submission: DriverFormSubmission) => Promise<void>;
}

type DriverAssignment = "school" | "shared";

interface DriverFormState {
  assignment: DriverAssignment;

  firstName: string;

  lastName: string;

  phone: string;

  email: string;

  licenseNumber: string;

  licenseClass: string;

  licenseExpiryDate: string;

  status: DriverStatus;

  giveDriverAppAccess: boolean;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
}

const EMPTY_FORM: DriverFormState = {
  assignment: "school",

  firstName: "",

  lastName: "",

  phone: "",

  email: "",

  licenseNumber: "",

  licenseClass: "",

  licenseExpiryDate: "",

  status: "active",

  giveDriverAppAccess: false,
  temporaryPassword: "",
  confirmTemporaryPassword: "",
};

function createDriverFormState(driver: Driver | null): DriverFormState {
  if (!driver) {
    return {
      ...EMPTY_FORM,
    };
  }

  return {
    assignment: driver.schoolId === null ? "shared" : "school",

    firstName: driver.firstName,

    lastName: driver.lastName,

    phone: driver.phone ?? "",

    email: driver.email ?? "",

    licenseNumber: driver.licenseNumber,

    licenseClass: driver.licenseClass ?? "",

    licenseExpiryDate: dateInputValue(driver.licenseExpiryDate),

    status: driver.status,

    giveDriverAppAccess: false,
    temporaryPassword: "",
    confirmTemporaryPassword: "",
  };
}

/**
 * Licence expiry is a business calendar date.
 *
 * PostgreSQL DATE values may arrive serialized as a full
 * timestamp. Convert the value back to the Nairobi calendar
 * date before putting it into an HTML date input.
 */
function dateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;

  const month = parts.find((part) => part.type === "month")?.value;

  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function optionalValue(value: string): string | undefined {
  const trimmed = value.trim();

  return trimmed || undefined;
}

export function DriverFormDialog({
  open,
  driver,
  activeSchoolId,
  activeSchoolName,
  saving,
  canManageAppAccess,
  error,
  onClose,
  onSubmit,
}: DriverFormDialogProps) {
  const [form, setForm] = useState<DriverFormState>(() =>
    createDriverFormState(driver),
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const editing = driver !== null;

  function updateField<K extends keyof DriverFormState>(
    key: K,
    value: DriverFormState[K],
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

    const firstName = form.firstName.trim();

    const lastName = form.lastName.trim();

    const licenseNumber = form.licenseNumber.trim();

    if (!firstName) {
      setValidationError("First name is required.");

      return;
    }

    if (!lastName) {
      setValidationError("Last name is required.");

      return;
    }

    if (!licenseNumber) {
      setValidationError("Licence number is required.");

      return;
    }

    if (!form.licenseExpiryDate) {
      setValidationError("Licence expiry date is required.");

      return;
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      setValidationError("Enter a valid email address.");

      return;
    }

    if (!editing && form.giveDriverAppAccess) {
      if (!canManageAppAccess) {
        setValidationError("You cannot grant driver app access.");
        return;
      }
      if (!form.email.trim()) {
        setValidationError("An email is required for driver app access.");
        return;
      }
      if (form.temporaryPassword.length < 12 ||
          form.temporaryPassword.length > 128) {
        setValidationError("Temporary password must be 12–128 characters.");
        return;
      }
      if (form.temporaryPassword !== form.confirmTemporaryPassword) {
        setValidationError("Passwords do not match.");
        return;
      }
    }

    if (editing) {
      const input: UpdateDriverInput = {
        firstName,

        lastName,

        phone: optionalValue(form.phone),

        email: optionalValue(form.email),

        licenseNumber,

        licenseClass: optionalValue(form.licenseClass),

        licenseExpiryDate: form.licenseExpiryDate,

        status: form.status,
      };

      await onSubmit({
        profile: input,
        giveDriverAppAccess: false,
      });

      return;
    }

    const input: CreateDriverInput = {
      schoolId: form.assignment === "school" ? activeSchoolId : undefined,

      firstName,

      lastName,

      phone: optionalValue(form.phone),

      email: optionalValue(form.email),

      licenseNumber,

      licenseClass: optionalValue(form.licenseClass),

      licenseExpiryDate: form.licenseExpiryDate,

      status: form.status,
    };

    await onSubmit({
      profile: input,
      giveDriverAppAccess: form.giveDriverAppAccess,
      ...(form.giveDriverAppAccess
        ? { temporaryPassword: form.temporaryPassword }
        : {}),
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
            pb: 1,

            fontWeight: 850,
          }}
        >
          {editing ? "Edit driver" : "Add driver"}
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              mb: 2.5,

              color: "text.secondary",

              fontSize: 12.5,

              lineHeight: 1.6,
            }}
          >
            {editing
              ? "Update the driver profile, contact details and licence information."
              : "Create a driver profile with the information required for transport operations."}
          </Typography>

          {validationError ? (
            <Alert
              severity="error"

              sx={{
                mb: 2,
              }}
            >
              {validationError}
            </Alert>
          ) : null}

          {error ? (
            <Alert
              severity="error"

              sx={{
                mb: 2,
              }}
            >
              {error}
            </Alert>
          ) : null}

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
            {editing ? (
              <TextField
                disabled
                label="Assignment"
                value={
                  driver?.schoolId === null
                    ? "Shared across tenant"
                    : activeSchoolName
                }
                helperText="Driver assignment is preserved while editing."
                sx={{ gridColumn: "1 / -1" }}
              />
            ) : (
              <TextField
                select
                label="Assignment"
                value={form.assignment}
                onChange={(event) =>
                  updateField(
                    "assignment",
                    event.target.value as DriverAssignment,
                  )
                }
                helperText="Current school is the default. Choose Shared only for drivers available across the tenant."
                sx={{ gridColumn: "1 / -1" }}
              >
                <MenuItem value="school">{activeSchoolName}</MenuItem>
                <MenuItem value="shared">Shared across tenant</MenuItem>
              </TextField>
            )}

            <TextField
              label="First name"

              required

              value={form.firstName}

              onChange={(event) => updateField("firstName", event.target.value)}
            />

            <TextField
              label="Last name"

              required

              value={form.lastName}

              onChange={(event) => updateField("lastName", event.target.value)}
            />

            <TextField
              label="Phone"

              value={form.phone}

              onChange={(event) => updateField("phone", event.target.value)}

              placeholder="+254..."
            />

            <TextField
              label="Email"

              type="email"

              value={form.email}

              onChange={(event) => updateField("email", event.target.value)}

              placeholder="driver@example.com"
            />

            <TextField
              label="Licence number"

              required

              value={form.licenseNumber}

              onChange={(event) =>
                updateField("licenseNumber", event.target.value)
              }
            />

            <TextField
              label="Licence class"

              value={form.licenseClass}

              onChange={(event) =>
                updateField("licenseClass", event.target.value)
              }

              placeholder="e.g. D"
            />

            <TextField
              label="Licence expiry"

              type="date"

              required

              value={form.licenseExpiryDate}

              onChange={(event) =>
                updateField("licenseExpiryDate", event.target.value)
              }

              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              select

              label="Status"

              disabled={!editing && form.giveDriverAppAccess}

              value={form.status}

              onChange={(event) =>
                updateField("status", event.target.value as DriverStatus)
              }
            >
              <MenuItem value="active">Active</MenuItem>

              <MenuItem value="inactive">Inactive</MenuItem>

              <MenuItem value="suspended">Suspended</MenuItem>
            </TextField>
          </Box>

          {!editing && canManageAppAccess ? (
            <Box sx={{ mt: 3, p: 2, border: "1px solid",
              borderColor: form.giveDriverAppAccess ? "primary.main" : "divider",
              borderRadius: 2.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.giveDriverAppAccess}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        giveDriverAppAccess: event.target.checked,
                        status: event.target.checked ? "active" : current.status,
                      }));
                      setValidationError(null);
                    }}
                  />
                }
                label="Give driver app access"
              />
              <Typography sx={{ color: "text.secondary", fontSize: 12 }}>
                Creates a driver login. An existing account needs an active
                driver membership in this organisation; its password is preserved.
              </Typography>

              {form.giveDriverAppAccess ? (
                <>
                  <TextField
                    label="Temporary password"
                    type="password"
                    autoComplete="new-password"
                    value={form.temporaryPassword}
                    onChange={(event) =>
                      updateField("temporaryPassword", event.target.value)
                    }
                    required
                    fullWidth
                    sx={{ mt: 2 }}
                    helperText="12–128 characters"
                    slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }}
                  />
                  <TextField
                    label="Confirm temporary password"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmTemporaryPassword}
                    onChange={(event) =>
                      updateField("confirmTemporaryPassword", event.target.value)
                    }
                    required
                    fullWidth
                    sx={{ mt: 2 }}
                  />
                </>
              ) : null}
            </Box>
          ) : null}
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
            {saving ? "Saving..." : editing ? "Save changes" : "Add driver"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
