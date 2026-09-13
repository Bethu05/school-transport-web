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
  NotificationsRounded,
  SchoolRounded,
} from '@mui/icons-material';

import {
  useAuth,
} from '../../auth/AuthProvider';

/**
 * Parent / guardian dashboard.
 *
 * Guardian access will eventually be based on explicit
 * student relationships rather than general permissions.
 */
export function GuardianDashboard() {
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
