import type { ReactNode } from "react";

import { Box, Typography } from "@mui/material";

interface SectionHeaderProps {
  title: string;

  subtitle?: string;

  action?: ReactNode;
}

/**
 * Shared heading for dashboard panels.
 *
 * Examples:
 *
 * Live Fleet
 * Fleet Readiness
 * Today's Trips
 * Attention Required
 *
 * Keeping this in one component ensures that
 * all dashboard sections share the same spacing,
 * typography and action positioning.
 */
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",

        alignItems: "flex-start",

        justifyContent: "space-between",

        gap: 2,

        mb: 2.5,
      }}
    >
      <Box>
        <Typography
          sx={{
            fontSize: 17,

            fontWeight: 850,

            letterSpacing: "-0.015em",
          }}
        >
          {title}
        </Typography>

        {subtitle ? (
          <Typography
            sx={{
              mt: 0.4,

              color: "text.secondary",

              fontSize: 12,
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      {action}
    </Box>
  );
}
