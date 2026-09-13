import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Typography,
} from '@mui/material';

import {
  CheckCircleRounded,
  NavigationRounded,
  ShieldRounded,
} from '@mui/icons-material';

import {
  useAuth,
} from '../../auth/AuthProvider';

/**
 * Driver-specific dashboard.
 *
 * Driver data remains separate because Drivers do not
 * receive general fleet-management permissions.
 */
export function DriverDashboard() {
  const {
    user,
  } = useAuth();

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: {
            xs: 3,
            md: 4,
          },

          mb: 2,

          border:
            '1px solid',

          borderColor:
            'divider',

          background:
            `
              linear-gradient(
                135deg,
                rgba(201,165,92,0.12),
                transparent 68%
              )
            `,
        }}
      >
        <Chip
          size="small"

          label="Driver Portal"

          sx={{
            color:
              'primary.main',

            bgcolor:
              'rgba(201,165,92,0.10)',
          }}
        />

        <Typography
          sx={{
            mt: 2,

            fontSize: {
              xs: 28,
              md: 38,
            },

            fontWeight:
              900,

            letterSpacing:
              '-0.04em',
          }}
        >
          Today's journey
        </Typography>

        <Typography
          sx={{
            mt: 1,

            color:
              'text.secondary',

            fontSize:
              14,
          }}
        >
          {user?.email}
        </Typography>
      </Paper>

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            lg:
              '1.4fr 0.8fr',
          },

          gap: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 3,

            border:
              '1px solid',

            borderColor:
              'divider',
          }}
        >
          <Typography
            sx={{
              color:
                'primary.main',

              fontSize:
                11,

              fontWeight:
                800,

              textTransform:
                'uppercase',

              letterSpacing:
                '0.11em',
            }}
          >
            Morning Route
          </Typography>

          <Typography
            sx={{
              mt: 1,

              fontSize:
                25,

              fontWeight:
                850,
            }}
          >
            North Route A
          </Typography>

          <Typography
            sx={{
              mt: 0.6,

              color:
                'text.secondary',

              fontSize:
                13,
            }}
          >
            Vehicle BUS-012 · 24 students
          </Typography>

          <Divider
            sx={{
              my: 3,
            }}
          />

          <Typography
            sx={{
              color:
                'text.secondary',

              fontSize:
                11,

              textTransform:
                'uppercase',

              letterSpacing:
                '0.08em',
            }}
          >
            Next stop
          </Typography>

          <Typography
            sx={{
              mt: 0.7,

              fontSize:
                20,

              fontWeight:
                800,
            }}
          >
            Westlands Estate
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color:
                'text.secondary',

              fontSize:
                12,
            }}
          >
            6 students expected
          </Typography>

          <Button
            variant="contained"

            sx={{
              mt: 3,
            }}

            startIcon={
              <NavigationRounded />
            }
          >
            Start trip
          </Button>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,

            border:
              '1px solid',

            borderColor:
              'divider',
          }}
        >
          <ShieldRounded
            sx={{
              color:
                'primary.main',
            }}
          />

          <Typography
            sx={{
              mt: 2,

              fontWeight:
                800,

              fontSize:
                17,
            }}
          >
            Safety status
          </Typography>

          <Typography
            sx={{
              mt: 1,

              color:
                'text.secondary',

              fontSize:
                12.5,

              lineHeight:
                1.7,
            }}
          >
            Vehicle checks complete. No open safety incidents for your assigned vehicle.
          </Typography>

          <Chip
            icon={
              <CheckCircleRounded />
            }

            label="Ready to operate"

            sx={{
              mt: 2.5,

              color:
                '#5F9471',

              bgcolor:
                'rgba(95,148,113,0.10)',
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
}

/**
 * Parent / guardian dashboard.
 *
 * Guardian access will eventually be based on explicit
 * student relationships rather than general permissions.
 */
