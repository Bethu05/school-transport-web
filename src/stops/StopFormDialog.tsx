import { useEffect, useState, type FormEvent, type ReactNode } from "react";

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
  Typography,
} from "@mui/material";

import type { School } from "../schools/schools.api";

import type { RouteGeometryLineString } from "../tracking/route-geometry.api";

import { StopLocationMap } from "./StopLocationMap";

import type { CreateStopInput, Stop, UpdateStopInput } from "./stops.api";

interface StopFormDialogProps {
  open: boolean;

  stop: Stop | null;

  stopSchoolName: string;

  schools: School[];

  routeGeometry?: RouteGeometryLineString | null;

  saving: boolean;

  proposalMode?: boolean;

  recoveryAction?: ReactNode;

  error: string | null;

  onClose: () => void;

  onSubmit: (input: CreateStopInput | UpdateStopInput) => Promise<void>;
}

interface StopFormState {
  schoolId: string;

  name: string;

  code: string;

  address: string;

  latitude: string;

  longitude: string;

  geofenceRadiusMeters: string;

  correctionReason: string;
}

function createFormState(stop: Stop | null): StopFormState {
  if (!stop) {
    return {
      schoolId: "",
      name: "",
      code: "",
      address: "",
      latitude: "",
      longitude: "",
      geofenceRadiusMeters: "75",
      correctionReason: "",
    };
  }

  return {
    schoolId: stop.schoolId ?? "",

    name: stop.name,

    code: stop.code ?? "",

    address: stop.address ?? "",

    latitude: String(stop.latitude),

    longitude: String(stop.longitude),

    geofenceRadiusMeters: String(stop.geofenceRadiusMeters),
    correctionReason: "",
  };
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();

  return trimmed || undefined;
}

function parseCoordinate(
  value: string,
  minimum: number,
  maximum: number,
): number | null {
  if (!value.trim()) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < minimum || number > maximum) {
    return null;
  }

  return number;
}

export function StopFormDialog({
  open,
  stop,
  stopSchoolName,
  schools,
  routeGeometry = null,
  saving,
  proposalMode = false,
  recoveryAction,
  error,
  onClose,
  onSubmit,
}: StopFormDialogProps) {
  const [form, setForm] = useState<StopFormState>(() => createFormState(stop));

  const [validationError, setValidationError] = useState<string | null>(null);

  const [capturingLocation, setCapturingLocation] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(createFormState(stop));
    setValidationError(null);
  }, [open, stop]);

  const editing = stop !== null;

  const mapLatitude = parseCoordinate(form.latitude, -90, 90);
  const mapLongitude = parseCoordinate(form.longitude, -180, 180);

  function updateField<K extends keyof StopFormState>(
    key: K,
    value: StopFormState[K],
  ): void {
    setForm((current) => ({
      ...current,

      [key]: value,
    }));
  }

  function captureCurrentLocation(): void {
    if (!navigator.geolocation) {
      setValidationError("Current location is unavailable in this browser.");
      return;
    }

    setValidationError(null);
    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm((current) => ({
          ...current,
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
        }));
        setCapturingLocation(false);
      },
      () => {
        setValidationError(
          "Unable to obtain your location. Check browser permissions or select a point on the map.",
        );
        setCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setValidationError(null);

    const name = form.name.trim();

    if (!name) {
      setValidationError("Stop name is required.");

      return;
    }

    const latitude = parseCoordinate(form.latitude, -90, 90);

    if (latitude === null) {
      setValidationError("Latitude must be a number between -90 and 90.");

      return;
    }

    const longitude = parseCoordinate(form.longitude, -180, 180);

    if (longitude === null) {
      setValidationError("Longitude must be a number between -180 and 180.");

      return;
    }

    const geofenceRadius = Number(form.geofenceRadiusMeters);

    if (
      !Number.isInteger(geofenceRadius) ||
      geofenceRadius < 10 ||
      geofenceRadius > 1000
    ) {
      setValidationError(
        "Geofence radius must be a whole number between 10 and 1000 metres.",
      );

      return;
    }

    if (editing) {
      const locationChanged =
        Math.abs(latitude - stop.latitude) > 1e-10 ||
        Math.abs(longitude - stop.longitude) > 1e-10;

      if (locationChanged && !form.correctionReason.trim()) {
        setValidationError(
          "Please explain why the stop location is being corrected.",
        );

        return;
      }

      const input: UpdateStopInput = {
        name,

        code: optionalText(form.code),

        address: optionalText(form.address),

        latitude,

        longitude,

        geofenceRadiusMeters: geofenceRadius,

        correctionReason: locationChanged
          ? form.correctionReason.trim()
          : undefined,
      };

      await onSubmit(input);

      return;
    }

    const input: CreateStopInput = {
      schoolId: form.schoolId || undefined,

      name,

      code: optionalText(form.code),

      address: optionalText(form.address),

      latitude,

      longitude,

      geofenceRadiusMeters: geofenceRadius,
    };

    await onSubmit(input);
  }

  return (
    <Dialog
      open={open}

      onClose={saving ? undefined : onClose}

      fullWidth

      maxWidth="md"
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
          {editing ? "Edit stop" : proposalMode ? "Propose stop" : "Add stop"}
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
              ? "Update the stop details, map coordinates and geofence radius."
              : proposalMode
                ? "Propose a shared or school-specific stop. Another administrator or transport manager must approve it before it can be used."
                : "Create a shared or school-specific transport stop."}
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
          {recoveryAction}

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
                label="School scope"

                value={stopSchoolName}

                disabled

                helperText="School scope is fixed after creation to protect existing route relationships."
              />
            ) : (
              <TextField
                select

                label="School scope"

                value={form.schoolId}

                onChange={(event) =>
                  updateField("schoolId", event.target.value)
                }

                helperText="Choose Shared stop when the stop may be reused across schools."
              >
                <MenuItem value="">Shared stop</MenuItem>

                {schools.map((school) => (
                  <MenuItem
                    key={school.id}

                    value={school.id}
                  >
                    {school.name}
                    {school.code ? ` (${school.code})` : ""}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              label="Stop name"

              required

              value={form.name}

              onChange={(event) => updateField("name", event.target.value)}

              slotProps={{
                htmlInput: {
                  maxLength: 150,
                },
              }}
            />

            <TextField
              label="Code"

              value={form.code}

              onChange={(event) => updateField("code", event.target.value)}

              placeholder="e.g. WEST-001"

              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
            />

            <TextField
              label="Address"

              value={form.address}

              onChange={(event) => updateField("address", event.target.value)}

              placeholder="Street, estate or landmark"
            />

            {proposalMode && !editing ? (
              <Button
                type="button"
                variant="outlined"
                disabled={saving || capturingLocation}
                onClick={captureCurrentLocation}
                sx={{ gridColumn: "1 / -1", justifySelf: "start" }}
              >
                {capturingLocation
                  ? "Finding location..."
                  : "Use current location"}
              </Button>
            ) : null}
            <StopLocationMap
              latitude={mapLatitude}
              longitude={mapLongitude}
              routeGeometry={routeGeometry}
              disabled={saving}
              searchEnabled={!proposalMode}
              onChange={(nextLatitude, nextLongitude) => {
                updateField("latitude", nextLatitude.toFixed(6));
                updateField("longitude", nextLongitude.toFixed(6));
              }}
            />

            <TextField
              label="Latitude"

              required

              type="number"

              value={form.latitude}

              onChange={(event) => updateField("latitude", event.target.value)}

              slotProps={{
                htmlInput: {
                  min: -90,
                  max: 90,
                  step: "any",
                },
              }}
            />

            <TextField
              label="Longitude"

              required

              type="number"

              value={form.longitude}

              onChange={(event) => updateField("longitude", event.target.value)}

              slotProps={{
                htmlInput: {
                  min: -180,
                  max: 180,
                  step: "any",
                },
              }}
            />

            {editing ? (
              <TextField
                label="Location correction reason"
                value={form.correctionReason}
                onChange={(event) =>
                  updateField("correctionReason", event.target.value)
                }
                placeholder="e.g. Move pickup point to the school main gate"
                helperText="Required only when the latitude or longitude changes."
                multiline
                minRows={2}
                sx={{ gridColumn: "1 / -1" }}
                slotProps={{
                  htmlInput: {
                    maxLength: 500,
                  },
                }}
              />
            ) : null}

            <TextField
              label="Geofence radius (metres)"

              required

              type="number"

              value={form.geofenceRadiusMeters}

              onChange={(event) =>
                updateField("geofenceRadiusMeters", event.target.value)
              }

              slotProps={{
                htmlInput: {
                  min: 10,
                  max: 1000,
                  step: 1,
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
            {saving
              ? "Saving..."
              : editing
                ? "Save changes"
                : proposalMode
                  ? "Submit proposal"
                  : "Add stop"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
