import {
  Box,
  Chip,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';

import type {
  ReactNode,
} from 'react';

import {
  tokens,
} from '../../theme/tokens';

export interface Metric {
  label: string;

  value: string;

  detail: string;

  accent: string;

  icon: ReactNode;

  source:
  | 'live'
  | 'preview';
}

interface MetricCardProps {
  metric: Metric;
}

/**
 * Standard dashboard KPI tile.
 *
 * Visual constants come from the central design-token file.
 * Business/domain code only supplies the metric content and accent.
 */
export function MetricCard({
  metric,
}: MetricCardProps) {
  const theme =
    useTheme();

  const dark =
    theme.palette.mode ===
    'dark';

  const live =
    metric.source ===
    'live';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.75,

        position:
          'relative',

        overflow:
          'hidden',

        minHeight:
          174,

        border:
          '1px solid',

        borderColor:
          dark
            ? tokens.alpha.white055
            : tokens.alpha.warmBorder10,

        background:
          dark
            ? tokens.gradients.metricCardDark
            : tokens.gradients.metricCardLight,

        transition:
          'transform 160ms ease, box-shadow 160ms ease',

        '&:hover': {
          transform:
            'translateY(-3px)',

          boxShadow:
            dark
              ? tokens.shadows.metricCardDark
              : tokens.shadows.metricCardLight,
        },
      }}
    >
      <Box
        sx={{
          position:
            'absolute',

          top: 0,
          left: 0,

          width:
            '100%',

          height: 3,

          background:
            `linear-gradient(
              90deg,
              ${metric.accent},
              transparent 75%
            )`,
        }}
      />

      <Box
        sx={{
          display:
            'flex',

          alignItems:
            'flex-start',

          justifyContent:
            'space-between',

          gap: 2,
        }}
      >
        <Box>
          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              gap: 0.8,

              flexWrap:
                'wrap',
            }}
          >
            <Typography
              sx={{
                color:
                  'text.secondary',

                fontSize:
                  11,

                fontWeight:
                  800,

                textTransform:
                  'uppercase',

                letterSpacing:
                  '0.10em',
              }}
            >
              {metric.label}
            </Typography>

            <Chip
              size="small"

              label={
                live
                  ? 'Live'
                  : 'Preview'
              }

              sx={{
                height:
                  20,

                fontSize:
                  9,

                color:
                  live
                    ? tokens.colors.status.success
                    : tokens.colors.dashboard.previewText,

                bgcolor:
                  live
                    ? tokens.alpha.success10
                    : tokens.alpha.gold09,

                border:
                  '1px solid',

                borderColor:
                  live
                    ? tokens.alpha.success20
                    : tokens.alpha.gold17,
              }}
            />
          </Box>

          <Typography
            sx={{
              mt: 1,

              fontSize:
                34,

              lineHeight:
                1,

              fontWeight:
                900,

              letterSpacing:
                '-0.045em',
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

            display:
              'grid',

            placeItems:
              'center',

            borderRadius:
              2,

            color:
              metric.accent,

            bgcolor:
              `${metric.accent}16`,

            border:
              '1px solid',

            borderColor:
              `${metric.accent}35`,
          }}
        >
          {metric.icon}
        </Box>
      </Box>

      <Typography
        sx={{
          mt: 2.5,

          color:
            'text.secondary',

          fontSize:
            12.5,
        }}
      >
        {metric.detail}
      </Typography>
    </Paper>
  );
}
