import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
} from '@mui/material';

import {
  DirectionsBusRounded,
  LoginRounded,
} from '@mui/icons-material';

import {
  useNavigate,
} from 'react-router-dom';

import {
  useAuth,
} from '../auth/AuthProvider';

export function HomePage() {
  const navigate =
    useNavigate();

  const {
    authenticated,
  } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',

        display: 'flex',
        alignItems: 'center',

        bgcolor:
          'background.default',
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 4,
              md: 8,
            },

            border:
              '1px solid',

            borderColor:
              'divider',

            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              maxWidth: 700,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,

                display: 'grid',
                placeItems: 'center',

                borderRadius: 2,

                bgcolor:
                  'primary.main',

                color:
                  'primary.contrastText',

                mb: 3,
              }}
            >
              <DirectionsBusRounded />
            </Box>

            <Typography
              component="h1"
              sx={{
                fontSize: {
                  xs: 38,
                  md: 58,
                },

                fontWeight: 900,

                lineHeight: 1.05,

                letterSpacing:
                  '-0.045em',
              }}
            >
              Smarter school
              transport operations.
            </Typography>

            <Typography
              sx={{
                mt: 3,

                maxWidth: 620,

                color:
                  'text.secondary',

                fontSize: {
                  xs: 16,
                  md: 18,
                },

                lineHeight: 1.75,
              }}
            >
              One platform for
              schools, transport
              teams, drivers and
              parents to manage
              safer, more visible
              student journeys.
            </Typography>

            <Button
              variant="contained"
              size="large"

              startIcon={
                <LoginRounded />
              }

              onClick={() =>
                navigate(
                  authenticated
                    ? '/dashboard'
                    : '/login',
                )
              }

              sx={{
                mt: 4,
                px: 3,
              }}
            >
              {authenticated
                ? 'Open dashboard'
                : 'Sign in'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
