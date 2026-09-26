import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import type { Driver } from "../../drivers/drivers.api";

import type { Route } from "../../routes/routes.api";

import type { Vehicle } from "../../vehicles/vehicles.api";

import type {
  CreateTripSeriesInput,
  TripSeries,
  UpdateTripSeriesInput,
} from "./trip-series.api";

const DAYS = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [7, "Sunday"],
] as const;

function today(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

interface Props {
  open: boolean;

  series: TripSeries | null;

  routes: readonly Route[];

  drivers: readonly Driver[];

  vehicles: readonly Vehicle[];

  saving: boolean;

  error: string | null;

  onClose: () => void;

  onSubmit: (input: CreateTripSeriesInput | UpdateTripSeriesInput) => void;
}

export function TripSeriesFormDialog({
  open,
  series,
  routes,
  drivers,
  vehicles,
  saving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const editing = Boolean(series);

  const [name, setName] = useState(series?.name ?? "");

  const [code, setCode] = useState(series?.code ?? "");

  const [routeId, setRouteId] = useState(series?.routeId ?? "");

  const [driverId, setDriverId] = useState(series?.defaultDriverId ?? "");

  const [vehicleId, setVehicleId] = useState(series?.defaultVehicleId ?? "");

  const [startTime, setStartTime] = useState(
    series?.startTime?.slice(0, 5) ?? "06:00",
  );

  const [endTime, setEndTime] = useState(
    series?.endTime?.slice(0, 5) ?? "07:30",
  );

  const [operatingDays, setOperatingDays] = useState<number[]>(
    series?.operatingDays ?? [1, 2, 3, 4, 5],
  );

  const [effectiveFrom, setEffectiveFrom] = useState(
    series?.effectiveFrom ?? today(),
  );

  const [effectiveTo, setEffectiveTo] = useState(series?.effectiveTo ?? "");

  const [status, setStatus] = useState<"active" | "inactive">(
    series?.status ?? "active",
  );

  const selectedRoute = routes.find((route) => route.id === routeId) ?? null;

  const compatibleDrivers = drivers.filter(
    (driver) =>
      !selectedRoute ||
      driver.schoolId === null ||
      driver.schoolId === selectedRoute.schoolId,
  );

  const compatibleVehicles = vehicles.filter(
    (vehicle) =>
      !selectedRoute ||
      vehicle.schoolId === null ||
      vehicle.schoolId === selectedRoute.schoolId,
  );

  function submit(event: FormEvent) {
    event.preventDefault();

    onSubmit({
      name: name.trim(),

      code: code.trim() || undefined,

      routeId,

      defaultDriverId: driverId,

      defaultVehicleId: vehicleId,

      startTime,

      endTime,

      operatingDays,

      effectiveFrom,

      effectiveTo: effectiveTo || undefined,

      status,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <Box component="form" onSubmit={submit}>
        <DialogTitle sx={{ fontWeight: 850 }}>
          {editing ? "Edit recurring trip" : "Create recurring trip"}
        </DialogTitle>

        <DialogContent>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Typography
            sx={{
              mb: 2,
              color: "text.secondary",
              fontSize: 13,
            }}
          >
            This defines the routine. Actual dated trips and manifests are
            generated from it.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "1fr 1fr",
              },
              gap: 2,
            }}
          >
            <TextField
              label="Service name"
              value={name}
              required
              onChange={(event) => setName(event.target.value)}
              placeholder="Morning 06:00 Service"
            />

            <TextField
              label="Code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="AM-0600"
            />

            <TextField
              select
              label="Route"
              value={routeId}
              required
              onChange={(event) => {
                setRouteId(event.target.value);

                setDriverId("");

                setVehicleId("");
              }}
            >
              {routes.map((route) => (
                <MenuItem key={route.id} value={route.id}>
                  {route.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Default driver"
              value={driverId}
              required
              disabled={!routeId}
              onChange={(event) => setDriverId(event.target.value)}
            >
              {compatibleDrivers.map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driver.firstName} {driver.lastName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Default vehicle"
              value={vehicleId}
              required
              disabled={!routeId}
              onChange={(event) => setVehicleId(event.target.value)}
            >
              {compatibleVehicles.map((vehicle) => (
                <MenuItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.registrationNumber} — {vehicle.seatCapacity} seats
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Start time"
              type="time"
              value={startTime}
              required
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              onChange={(event) => setStartTime(event.target.value)}
            />

            <TextField
              label="End time"
              type="time"
              value={endTime}
              required
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              onChange={(event) => setEndTime(event.target.value)}
            />

            <TextField
              select
              label="Operating days"
              value={operatingDays.map(String)}
              required
              slotProps={{
                select: {
                  multiple: true,

                  renderValue: (selected) =>
                    (selected as string[])
                      .map((value) => {
                        const day = DAYS.find(
                          ([number]) => number === Number(value),
                        );

                        return day?.[1].slice(0, 3) ?? value;
                      })
                      .join(", "),
                },
              }}
              onChange={(event) => {
                const raw = event.target.value;

                const values = typeof raw === "string" ? raw.split(",") : raw;

                setOperatingDays(values.map((value) => Number(value)).sort());
              }}
            >
              {DAYS.map(([value, label]) => (
                <MenuItem key={value} value={String(value)}>
                  <Checkbox checked={operatingDays.includes(value)} />
                  <ListItemText primary={label} />
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Effective from"
              type="date"
              value={effectiveFrom}
              required
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />

            <TextField
              label="Effective to"
              type="date"
              value={effectiveTo}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              onChange={(event) => setEffectiveTo(event.target.value)}
            />

            <TextField
              select
              label="Status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "active" | "inactive")
              }
            >
              <MenuItem value="active">Active</MenuItem>

              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button disabled={saving} onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={
              saving ||
              !name.trim() ||
              !routeId ||
              !driverId ||
              !vehicleId ||
              !startTime ||
              !endTime ||
              operatingDays.length === 0
            }
          >
            {saving
              ? "Saving..."
              : editing
                ? "Save recurring trip"
                : "Create recurring trip"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
