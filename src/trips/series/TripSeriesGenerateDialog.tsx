import { useState } from "react";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

import type { TripSeries } from "./trip-series.api";

const JS_TO_ISO_DAY = [7, 1, 2, 3, 4, 5, 6];

function dateValue(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function nextOperatingDate(series: TripSeries): string {
  const start = new Date();

  for (let offset = 0; offset < 21; offset += 1) {
    const candidate = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + offset,
    );

    const isoDay = JS_TO_ISO_DAY[candidate.getDay()];

    const value = dateValue(candidate);

    if (
      series.operatingDays.includes(isoDay) &&
      value >= series.effectiveFrom &&
      (!series.effectiveTo || value <= series.effectiveTo)
    ) {
      return value;
    }
  }

  return dateValue(start);
}

interface Props {
  open: boolean;

  series: TripSeries;

  saving: boolean;

  error: string | null;

  onClose: () => void;

  onGenerate: (serviceDate: string) => void;
}

export function TripSeriesGenerateDialog({
  open,
  series,
  saving,
  error,
  onClose,
  onGenerate,
}: Props) {
  const [serviceDate, setServiceDate] = useState(nextOperatingDate(series));

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 850 }}>Generate dated trip</DialogTitle>

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
            lineHeight: 1.7,
          }}
        >
          {series.name} will produce one dated draft trip. Its route stops and
          eligible student manifest will be snapshotted at generation time.
        </Typography>

        <TextField
          fullWidth
          type="date"
          label="Service date"
          value={serviceDate}
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
          onChange={(event) => setServiceDate(event.target.value)}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button disabled={saving} onClick={onClose}>
          Cancel
        </Button>

        <Button
          variant="contained"
          disabled={saving || !serviceDate}
          onClick={() => onGenerate(serviceDate)}
        >
          {saving ? "Generating..." : "Generate trip"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
