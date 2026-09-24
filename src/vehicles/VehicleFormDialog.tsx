import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";

import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  Vehicle,
  VehicleStatus,
} from "./vehicles.api";

interface VehicleFormDialogProps {
  open: boolean;

  vehicle: Vehicle | null;

  activeSchoolId: string;

  activeSchoolName: string;

  saving: boolean;

  error: string | null;

  onClose: () => void;

  onSubmit: (input: CreateVehicleInput | UpdateVehicleInput) => Promise<void>;
}

type VehicleAssignment = "school" | "shared";

interface VehicleFormState {
  assignment: VehicleAssignment;
  registrationNumber: string;
  fleetNumber: string;
  make: string;
  model: string;
  manufactureYear: string;
  seatCapacity: string;
  gpsDeviceId: string;
  status: VehicleStatus;
}

const EMPTY_FORM: VehicleFormState = {
  assignment: "school",
  registrationNumber: "",
  fleetNumber: "",
  make: "",
  model: "",
  manufactureYear: "",
  seatCapacity: "",
  gpsDeviceId: "",
  status: "active",
};

function createVehicleFormState(vehicle: Vehicle | null): VehicleFormState {
  if (!vehicle) {
    return {
      ...EMPTY_FORM,
    };
  }

  return {
    assignment: vehicle.schoolId === null ? "shared" : "school",

    registrationNumber: vehicle.registrationNumber,

    fleetNumber: vehicle.fleetNumber ?? "",

    make: vehicle.make ?? "",

    model: vehicle.model ?? "",

    manufactureYear: vehicle.manufactureYear
      ? String(vehicle.manufactureYear)
      : "",

    seatCapacity: String(vehicle.seatCapacity),

    gpsDeviceId: vehicle.gpsDeviceId ?? "",

    status: vehicle.status,
  };
}

export function VehicleFormDialog({
  open,
  vehicle,
  activeSchoolId,
  activeSchoolName,
  saving,
  error,
  onClose,
  onSubmit,
}: VehicleFormDialogProps) {
  const [form, setForm] = useState<VehicleFormState>(() =>
    createVehicleFormState(vehicle),
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const editing = vehicle !== null;

  function updateField<K extends keyof VehicleFormState>(
    key: K,
    value: VehicleFormState[K],
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

    const registration = form.registrationNumber.trim();

    const capacity = Number(form.seatCapacity);

    if (!registration) {
      setValidationError("Registration number is required.");

      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) {
      setValidationError(
        "Seat capacity must be a whole number between 1 and 200.",
      );

      return;
    }

    let manufactureYear: number | undefined;

    if (form.manufactureYear.trim()) {
      const parsedYear = Number(form.manufactureYear);

      if (
        !Number.isInteger(parsedYear) ||
        parsedYear < 1900 ||
        parsedYear > 2100
      ) {
        setValidationError("Manufacture year must be between 1900 and 2100.");

        return;
      }

      manufactureYear = parsedYear;
    }

    const commonInput = {
      registrationNumber: registration,

      fleetNumber: form.fleetNumber.trim() || undefined,

      make: form.make.trim() || undefined,

      model: form.model.trim() || undefined,

      manufactureYear,

      seatCapacity: capacity,

      gpsDeviceId: form.gpsDeviceId.trim() || undefined,

      status: form.status,
    };

    if (editing) {
      const input: UpdateVehicleInput = commonInput;

      await onSubmit(input);
      return;
    }

    const input: CreateVehicleInput = {
      ...commonInput,

      schoolId: form.assignment === "school" ? activeSchoolId : undefined,
    };

    await onSubmit(input);
  }

  return (
    <Dialog
      open={open}

      onClose={saving ? undefined : onClose}

      fullWidth

      maxWidth="sm"
    >
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            fontWeight: 850,
          }}
        >
          {editing ? "Edit vehicle" : "Add vehicle"}
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              pt: 1,

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

            {editing ? (
              <TextField
                disabled
                label="Assignment"
                value={
                  vehicle?.schoolId === null
                    ? "Shared across tenant"
                    : activeSchoolName
                }
                helperText="Vehicle assignment is preserved while editing."
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
                    event.target.value as VehicleAssignment,
                  )
                }
                helperText="Current school is the default. Choose Shared only for fleet resources available across the tenant."
                sx={{ gridColumn: "1 / -1" }}
              >
                <MenuItem value="school">{activeSchoolName}</MenuItem>
                <MenuItem value="shared">Shared across tenant</MenuItem>
              </TextField>
            )}

            <TextField
              required

              label="Registration number"

              value={form.registrationNumber}

              onChange={(event) =>
                updateField("registrationNumber", event.target.value)
              }

              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
            />

            <TextField
              label="Fleet number"

              value={form.fleetNumber}

              onChange={(event) =>
                updateField("fleetNumber", event.target.value)
              }

              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
            />

            <TextField
              label="Make"

              value={form.make}

              onChange={(event) => updateField("make", event.target.value)}

              slotProps={{
                htmlInput: {
                  maxLength: 100,
                },
              }}
            />

            <TextField
              label="Model"

              value={form.model}

              onChange={(event) => updateField("model", event.target.value)}

              slotProps={{
                htmlInput: {
                  maxLength: 100,
                },
              }}
            />

            <TextField
              label="Manufacture year"

              type="number"

              value={form.manufactureYear}

              onChange={(event) =>
                updateField("manufactureYear", event.target.value)
              }

              slotProps={{
                htmlInput: {
                  min: 1900,
                  max: 2100,
                },
              }}
            />

            <TextField
              required

              label="Seat capacity"

              type="number"

              value={form.seatCapacity}

              onChange={(event) =>
                updateField("seatCapacity", event.target.value)
              }

              slotProps={{
                htmlInput: {
                  min: 1,
                  max: 200,
                },
              }}
            />

            <TextField
              label="GPS device ID"

              value={form.gpsDeviceId}

              onChange={(event) =>
                updateField("gpsDeviceId", event.target.value)
              }

              slotProps={{
                htmlInput: {
                  maxLength: 100,
                },
              }}
            />

            <TextField
              select

              label="Status"

              value={form.status}

              onChange={(event) =>
                updateField("status", event.target.value as VehicleStatus)
              }
            >
              <MenuItem value="active">Active</MenuItem>

              <MenuItem value="maintenance">Maintenance</MenuItem>

              <MenuItem value="inactive">Inactive</MenuItem>

              <MenuItem value="retired">Retired</MenuItem>
            </TextField>
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
            {saving ? "Saving..." : editing ? "Save changes" : "Add vehicle"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
