import { Box, Chip, Paper, Typography } from "@mui/material";

import {
  AccessTimeRounded,
  NearMeRounded,
  PlaceRounded,
} from "@mui/icons-material";

import type { VehicleLocationNextStop } from "./tracking.realtime";

interface TrackingProgressPanelProps {
  label: string;

  nextStop: VehicleLocationNextStop | null;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
}

function formatEta(seconds: number | null): string {
  if (seconds === null) {
    return "Calculating";
  }

  if (seconds < 60) {
    return "< 1 min";
  }

  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function formatArrival(value: string | null): string {
  if (!value) {
    return "Calculating";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Calculating";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",

    minute: "2-digit",

    timeZone: "Africa/Nairobi",
  }).format(date);
}

export function TrackingProgressPanel({
  label,
  nextStop,
}: TrackingProgressPanelProps) {
  if (!nextStop) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <Typography
          sx={{
            fontWeight: 800,

            fontSize: 13.5,
          }}
        >
          {label}
        </Typography>

        <Typography
          sx={{
            mt: 0.5,

            color: "text.secondary",

            fontSize: 12,
          }}
        >
          No upcoming stop currently reported.
        </Typography>
      </Paper>
    );
  }

  /**
   * etaDistanceMeters is authoritative for the UI.
   *
   * The backend has already decided whether canonical
   * route_geometry can be used. Keeping that decision in one
   * place prevents the frontend from accidentally displaying
   * crow-flies distance while ETA uses road distance.
   */
  const distance = nextStop.etaDistanceMeters;

  const distanceLabel =
    nextStop.etaDistanceSource === "route_geometry"
      ? "Road distance"
      : "Direct fallback";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,

        border: "1px solid",

        borderColor: nextStop.withinGeofence ? "success.main" : "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",

          justifyContent: "space-between",

          alignItems: "flex-start",

          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 10.5,

              textTransform: "uppercase",

              letterSpacing: "0.06em",
            }}
          >
            {label}
          </Typography>

          <Box
            sx={{
              mt: 0.5,

              display: "flex",

              alignItems: "center",

              gap: 0.75,
            }}
          >
            <PlaceRounded
              sx={{
                fontSize: 18,

                color: "primary.main",
              }}
            />

            <Typography
              sx={{
                fontWeight: 850,

                fontSize: 15,
              }}
            >
              {nextStop.stopName}
            </Typography>
          </Box>

          <Typography
            sx={{
              mt: 0.4,

              color: "text.secondary",

              fontSize: 11.5,
            }}
          >
            Stop {nextStop.stopOrder}
            {nextStop.stopCode ? ` · ${nextStop.stopCode}` : ""}
          </Typography>
        </Box>

        {nextStop.withinGeofence ? (
          <Chip size="small" color="success" label="At stop" />
        ) : (
          <Chip size="small" variant="outlined" label="En route" />
        )}
      </Box>

      <Box
        sx={{
          mt: 2,

          display: "grid",

          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",

          gap: 1.25,
        }}
      >
        <Box>
          <Box
            sx={{
              display: "flex",

              alignItems: "center",

              gap: 0.4,
            }}
          >
            <NearMeRounded
              sx={{
                fontSize: 14,

                color: "text.secondary",
              }}
            />

            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 10.5,
              }}
            >
              {distanceLabel}
            </Typography>
          </Box>

          <Typography
            sx={{
              mt: 0.3,

              fontWeight: 800,

              fontSize: 13,
            }}
          >
            {formatDistance(distance)}
          </Typography>
        </Box>

        <Box>
          <Box
            sx={{
              display: "flex",

              alignItems: "center",

              gap: 0.4,
            }}
          >
            <AccessTimeRounded
              sx={{
                fontSize: 14,

                color: "text.secondary",
              }}
            />

            <Typography
              sx={{
                color: "text.secondary",

                fontSize: 10.5,
              }}
            >
              ETA
            </Typography>
          </Box>

          <Typography
            sx={{
              mt: 0.3,

              fontWeight: 800,

              fontSize: 13,
            }}
          >
            {formatEta(nextStop.etaSeconds)}
          </Typography>
        </Box>

        <Box>
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 10.5,
            }}
          >
            Arrival
          </Typography>

          <Typography
            sx={{
              mt: 0.3,

              fontWeight: 800,

              fontSize: 13,
            }}
          >
            {formatArrival(nextStop.estimatedArrivalAt)}
          </Typography>
        </Box>
      </Box>

      <Typography
        sx={{
          mt: 1.5,

          color: "text.secondary",

          fontSize: 10.5,
        }}
      >
        Distance source: {nextStop.etaDistanceSource.replace(/_/g, " ")}
        {" · "}ETA source: {nextStop.etaSource.replace(/_/g, " ")}
        {nextStop.etaSpeedKph !== null
          ? ` · ${nextStop.etaSpeedKph.toFixed(1)} km/h`
          : ""}
      </Typography>
    </Paper>
  );
}
