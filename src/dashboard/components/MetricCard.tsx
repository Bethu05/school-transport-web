import { Box, Chip, Paper, Typography } from "@mui/material";

import type { ReactNode } from "react";

import { tokens } from "../../theme/tokens";

export interface Metric {
  label: string;
  value: string;
  detail: string;
  accent: string;
  icon: ReactNode;
  source: "live" | "preview";
}

interface MetricCardProps {
  metric: Metric;
}

/**
 * Dashboard KPI tile.
 *
 * Operational cards deliberately use neutral surfaces.
 * Colour is reserved for the domain accent and real status.
 */
export function MetricCard({ metric }: MetricCardProps) {
  const live = metric.source === "live";

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.75,
        minHeight: 164,
        position: "relative",
        overflow: "hidden",

        border: "1px solid",
        borderColor: "divider",

        bgcolor: "background.paper",

        transition:
          "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",

        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: 4,
          bgcolor: metric.accent,
        }}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              flexWrap: "wrap",
            }}
          >
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {metric.label}
            </Typography>

            <Chip
              size="small"
              label={live ? "Live" : "Unavailable"}
              sx={{
                height: 20,
                fontSize: 9,
                fontWeight: 700,

                color: live
                  ? tokens.colors.status.success
                  : "text.secondary",

                bgcolor: live
                  ? tokens.alpha.success10
                  : "action.hover",
              }}
            />
          </Box>

          <Typography
            sx={{
              mt: 1.2,
              fontSize: 34,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "-0.045em",
            }}
          >
            {metric.value}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,

            display: "grid",
            placeItems: "center",

            borderRadius: 2,

            color: metric.accent,
            bgcolor: `${metric.accent}12`,
          }}
        >
          {metric.icon}
        </Box>
      </Box>

      <Typography
        sx={{
          mt: 2.5,
          color: "text.secondary",
          fontSize: 12.5,
        }}
      >
        {metric.detail}
      </Typography>
    </Paper>
  );
}
