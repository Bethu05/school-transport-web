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
  Typography,
} from "@mui/material";

import type { Driver } from "../drivers/drivers.api";

import type { Route } from "../routes/routes.api";

import type { Vehicle } from "../vehicles/vehicles.api";

import type { Trip, UpdateTripInput } from "./trips.api";

import { TripChaperoneField } from "./TripChaperoneField";

import { TripStudentsPanel } from "./TripStudentsPanel";

const BUSINESS_TIME_ZONE = "Africa/Nairobi";

const BUSINESS_UTC_OFFSET = "+03:00";

interface TripEditDialogProps {
  open: boolean;

  trip: Trip | null;

  tenantId: string;

  routes: readonly Route[];

  vehicles: readonly Vehicle[];

  drivers: readonly Driver[];

  saving: boolean;

  canEditTrip: boolean;

  canManageRiders: boolean;

  canReadStudents: boolean;

  canReturnToDraft: boolean;

  returningToDraft: boolean;

  error: string | null;

  onClose: () => void;

  onSave: (input: UpdateTripInput) => Promise<void>;

  onRidersChanged: () => void;

  onReturnToDraft: (reason: string) => Promise<void>;
}

interface TripEditFormState {
  routeId: string;

  serviceDate: string;

  startTime: string;

  endTime: string;

  vehicleId: string;

  driverId: string;

  notes: string;
}

function businessDateToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;

  const month = parts.find((part) => part.type === "month")?.value;

  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to determine business date");
  }

  return `${year}-${month}-${day}`;
}

function businessTimeFromTimestamp(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIME_ZONE,

    hour: "2-digit",

    minute: "2-digit",

    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "";

  const minute = parts.find((part) => part.type === "minute")?.value ?? "";

  return `${hour}:${minute}`;
}

function toBusinessIso(date: string, time: string): string {
  return `${date}T${time}:00${BUSINESS_UTC_OFFSET}`;
}

function routeLabel(route: Route): string {
  return route.code ? `${route.name} (${route.code})` : route.name;
}

function vehicleLabel(vehicle: Vehicle): string {
  const description = [vehicle.make, vehicle.model].filter(Boolean).join(" ");

  return description
    ? `${vehicle.registrationNumber} — ${description}`
    : vehicle.registrationNumber;
}

function driverLabel(driver: Driver): string {
  return [driver.firstName, driver.lastName].filter(Boolean).join(" ");
}

function createFormState(trip: Trip | null): TripEditFormState {
  if (!trip) {
    return {
      routeId: "",

      serviceDate: "",

      startTime: "",

      endTime: "",

      vehicleId: "",

      driverId: "",

      notes: "",
    };
  }

  return {
    routeId: trip.routeId,

    serviceDate: trip.serviceDate,

    startTime: businessTimeFromTimestamp(trip.scheduledStartAt),

    endTime: businessTimeFromTimestamp(trip.scheduledEndAt),

    vehicleId: trip.vehicleId ?? "",

    driverId: trip.driverId ?? "",

    notes: trip.notes ?? "",
  };
}

export function TripEditDialog({
  open,
  trip,
  tenantId,
  routes,
  vehicles,
  drivers,
  saving,
  canEditTrip,
  canManageRiders,
  canReadStudents,
  canReturnToDraft,
  returningToDraft,
  error,
  onClose,
  onSave,
  onRidersChanged,
  onReturnToDraft,
}: TripEditDialogProps) {
  const [form, setForm] = useState<TripEditFormState>(() =>
    createFormState(trip),
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const [returnReason, setReturnReason] = useState("");

  if (!trip) {
    return null;
  }

  /**
   * Capture the non-null trip after the guard.
   *
   * TypeScript does not retain prop narrowing inside nested
   * callbacks because props can theoretically change between
   * renders.
   */
  const currentTrip = trip;

  const planningStatus =
    currentTrip.status === "draft" || currentTrip.status === "scheduled";

  const detailsEditable = canEditTrip && planningStatus;

  const routeEditable = detailsEditable && currentTrip.status === "draft";

  const routeOptions = routes.filter(
    (route) =>
      route.schoolId === currentTrip.schoolId &&
      (route.id === currentTrip.routeId ||
        (route.status === "active" && route.stopCount > 0)),
  );

  const vehicleOptions = vehicles.filter(
    (vehicle) =>
      vehicle.status === "active" || vehicle.id === currentTrip.vehicleId,
  );

  const driverOptions = drivers.filter(
    (driver) =>
      driver.status === "active" || driver.id === currentTrip.driverId,
  );

  function updateField<K extends keyof TripEditFormState>(
    key: K,
    value: TripEditFormState[K],
  ): void {
    setForm((current) => ({
      ...current,

      [key]: value,
    }));
  }

  async function handleReturnToDraft(): Promise<void> {
    const reason = returnReason.trim();

    setValidationError(null);

    if (!reason) {
      setValidationError(
        "Please provide a reason for returning this trip to draft.",
      );

      return;
    }

    try {
      await onReturnToDraft(reason);
    } catch {
      /*
       * Parent mutation renders the server error through
       * the existing error prop.
       */
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!detailsEditable) {
      return;
    }

    setValidationError(null);

    if (routeEditable && !form.routeId) {
      setValidationError("Please select a route.");

      return;
    }

    if (!form.serviceDate) {
      setValidationError("Service date is required.");

      return;
    }

    if (form.serviceDate < businessDateToday()) {
      setValidationError("The service date cannot be in the past.");

      return;
    }

    if (!form.startTime) {
      setValidationError("Departure time is required.");

      return;
    }

    if (form.endTime && form.endTime <= form.startTime) {
      setValidationError("Finish time must be later than departure time.");

      return;
    }

    const notes = form.notes.trim();

    const input: UpdateTripInput = {
      ...(routeEditable && form.routeId !== currentTrip.routeId
        ? {
            routeId: form.routeId,
          }
        : {}),

      vehicleId: form.vehicleId || null,

      driverId: form.driverId || null,

      serviceDate: form.serviceDate,

      scheduledStartAt: toBusinessIso(form.serviceDate, form.startTime),

      scheduledEndAt: form.endTime
        ? toBusinessIso(form.serviceDate, form.endTime)
        : null,

      notes: notes || null,
    };

    await onSave(input);
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
          {planningStatus ? "Configure trip" : "Inspect trip"}
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

            <TextField
              select
              label="Route"
              value={form.routeId}
              disabled={!routeEditable || saving}
              onChange={(event) => updateField("routeId", event.target.value)}
              helperText={
                routeEditable
                  ? "Route can be changed while this trip remains a draft."
                  : "Route is locked once the trip has been scheduled."
              }
              sx={{
                gridColumn: "1 / -1",
              }}
            >
              {routeOptions.map((route) => (
                <MenuItem key={route.id} value={route.id}>
                  {routeLabel(route)}
                </MenuItem>
              ))}
            </TextField>

            {currentTrip.status === "scheduled" && canReturnToDraft ? (
              <Box
                sx={{
                  gridColumn: "1 / -1",

                  display: "grid",

                  gap: 1.25,

                  p: 1.5,

                  borderRadius: 2,

                  border: "1px solid",

                  borderColor: "warning.light",
                }}
              >
                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 12,

                    lineHeight: 1.6,
                  }}
                >
                  Need to change the route? Return this scheduled trip to draft
                  first. Driver, Vehicle, Chaperone, Students and other
                  assignments will be preserved.
                </Typography>

                <TextField
                  label="Reason for returning to draft"
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                  multiline
                  minRows={2}
                  disabled={saving}
                  slotProps={{
                    htmlInput: {
                      maxLength: 500,
                    },
                  }}
                />

                <Box>
                  <Button
                    type="button"
                    variant="outlined"
                    color="warning"
                    disabled={
                      saving || returningToDraft || !returnReason.trim()
                    }
                    onClick={() => {
                      void handleReturnToDraft();
                    }}
                  >
                    {returningToDraft
                      ? "Returning to draft..."
                      : "Return to draft"}
                  </Button>
                </Box>
              </Box>
            ) : null}

            <TextField
              type="date"
              label="Service date"
              value={form.serviceDate}
              disabled={!detailsEditable || saving}
              onChange={(event) =>
                updateField("serviceDate", event.target.value)
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },

                htmlInput: {
                  min: businessDateToday(),
                },
              }}
            />

            <TextField
              type="time"
              label="Departure"
              value={form.startTime}
              disabled={!detailsEditable || saving}
              onChange={(event) => updateField("startTime", event.target.value)}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              type="time"
              label="Finish"
              value={form.endTime}
              disabled={!detailsEditable || saving}
              onChange={(event) => updateField("endTime", event.target.value)}
              helperText={
                currentTrip.status === "draft"
                  ? "Required before scheduling."
                  : undefined
              }
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              select
              label="Vehicle"
              value={form.vehicleId}
              disabled={!detailsEditable || saving}
              onChange={(event) => updateField("vehicleId", event.target.value)}
            >
              <MenuItem value="">Unassigned</MenuItem>

              {vehicleOptions.map((vehicle) => (
                <MenuItem key={vehicle.id} value={vehicle.id}>
                  {vehicleLabel(vehicle)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Driver"
              value={form.driverId}
              disabled={!detailsEditable || saving}
              onChange={(event) => updateField("driverId", event.target.value)}
            >
              <MenuItem value="">Unassigned</MenuItem>

              {driverOptions.map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driverLabel(driver)}
                </MenuItem>
              ))}
            </TextField>

            <TripChaperoneField
              trip={currentTrip}
              disabled={saving || !planningStatus}
            />

            <TripStudentsPanel
              tenantId={tenantId}
              trip={currentTrip}
              canManage={canManageRiders}
              canReadStudents={canReadStudents}
              disabled={saving}
              onChanged={onRidersChanged}
            />

            <TextField
              label="Notes"
              value={form.notes}
              disabled={!detailsEditable || saving}
              onChange={(event) => updateField("notes", event.target.value)}
              multiline
              minRows={3}
              sx={{
                gridColumn: "1 / -1",
              }}
            />

            <Typography
              sx={{
                gridColumn: "1 / -1",

                color: "text.secondary",

                fontSize: 11.5,
              }}
            >
              {currentTrip.status === "draft"
                ? "Draft Trip configuration is editable, including Route."
                : currentTrip.status === "scheduled"
                  ? "This Trip is scheduled. Planning assignments may still be adjusted, but Route remains locked until Return to Draft."
                  : "Operational and historical Trip configuration is read-only."}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,

            pb: 3,
          }}
        >
          <Button onClick={onClose} disabled={saving}>
            {detailsEditable ? "Cancel" : "Close"}
          </Button>

          {detailsEditable ? (
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          ) : null}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
