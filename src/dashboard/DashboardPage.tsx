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
  DirectionsBusRounded,
  MapRounded,
  NavigationRounded,
  NotificationsRounded,
  SchoolRounded,
  ShieldRounded,
} from '@mui/icons-material';

import {
  useAuth,
} from '../auth/AuthProvider';

import {
  OperationsDashboard,
} from './operations/OperationsDashboard';

function DriverDashboard() {
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
function GuardianDashboard() {
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
                rgba(201,165,92,0.13),
                transparent 70%
              )
            `,
        }}
      >
        <Chip
          size="small"

          label="Parent Portal"

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
          Your child's journey
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
              '1.35fr 0.75fr',
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
          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,

                display:
                  'grid',

                placeItems:
                  'center',

                borderRadius:
                  '50%',

                bgcolor:
                  'rgba(201,165,92,0.12)',

                color:
                  'primary.main',
              }}
            >
              <SchoolRounded />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize:
                    18,

                  fontWeight:
                    850,
                }}
              >
                Student journey
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,

                  color:
                    'text.secondary',

                  fontSize:
                    12,
                }}
              >
                Morning school transport
              </Typography>
            </Box>
          </Box>

          <Divider
            sx={{
              my: 3,
            }}
          />

          <Box
            sx={{
              display:
                'grid',

              gap: 2,
            }}
          >
            <Box
              sx={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap: 1.2,
              }}
            >
              <CheckCircleRounded
                sx={{
                  color:
                    '#5F9471',
                }}
              />

              <Box>
                <Typography
                  sx={{
                    fontWeight:
                      750,

                    fontSize:
                      13,
                  }}
                >
                  Boarded bus
                </Typography>

                <Typography
                  sx={{
                    color:
                      'text.secondary',

                    fontSize:
                      11,
                  }}
                >
                  7:14 AM
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap: 1.2,
              }}
            >
              <DirectionsBusRounded
                sx={{
                  color:
                    'primary.main',
                }}
              />

              <Box>
                <Typography
                  sx={{
                    fontWeight:
                      750,

                    fontSize:
                      13,
                  }}
                >
                  Bus 12 · North Route A
                </Typography>

                <Typography
                  sx={{
                    color:
                      'text.secondary',

                    fontSize:
                      11,
                  }}
                >
                  Journey in progress
                </Typography>
              </Box>
            </Box>
          </Box>

          <Button
            variant="contained"

            sx={{
              mt: 3,
            }}

            startIcon={
              <MapRounded />
            }
          >
            Track bus
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
          <NotificationsRounded
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
            Journey alerts
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
            Boarding, arrival and drop-off notifications will appear here.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

/**
 * Render the dashboard appropriate to the authenticated,
 * backend-verified tenant role.
 */
export function DashboardPage() {
  const {
    tenant,
  } = useAuth();

  switch (
  tenant?.role
  ) {
    case 'driver':
      return (
        <DriverDashboard />
      );

    case 'guardian':
      return (
        <GuardianDashboard />
      );

    case 'transport_manager':
      return (
        <OperationsDashboard
          managerMode
        />
      );

    case 'owner':

    case 'admin':

    default:
      return (
        <OperationsDashboard />
      );
  }
}
