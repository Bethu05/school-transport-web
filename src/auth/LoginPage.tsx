import {
  useState,
  type FormEvent,
} from 'react';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

import {
  DirectionsBusRounded,
  LockOutlined,
  PersonOutlineRounded,
} from '@mui/icons-material';

import {
  Navigate,
  useNavigate,
} from 'react-router-dom';

import {
  useAuth,
} from './AuthProvider';

import {
  devLoginPresets,
  type DevLoginPreset,
} from './dev-login-presets';

export function LoginPage() {
  const {
    login,
    authenticated,
  } = useAuth();

  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [error, setError] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [
    devSubmitting,
    setDevSubmitting,
  ] = useState<string | null>(null);

  if (authenticated) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  async function handleDevLogin(
    preset: DevLoginPreset,
  ): Promise<void> {
    if (
      !preset.configured ||
      submitting ||
      devSubmitting
    ) {
      return;
    }

    // Keep the selected credentials visible so it is obvious
    // which development identity is being used.
    setEmail(preset.email);
    setPassword(preset.password);

    setError('');
    setDevSubmitting(preset.label);

    try {
      await login({
        email: preset.email,
        password: preset.password,
      });

      navigate('/dashboard', {
        replace: true,
      });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to sign in',
      );
    } finally {
      setDevSubmitting(null);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError('');
    setSubmitting(true);

    try {
      await login({
        email,
        password,
      });

      navigate('/dashboard', {
        replace: true,
      });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Unable to sign in',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.default',
        py: {
          xs: 2,
          md: 4,
        },
      }}
    >
      <Container maxWidth="lg">
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',

            display: 'grid',

            gridTemplateColumns: {
              xs: '1fr',
              md: '1.05fr 0.95fr',
            },

            minHeight: {
              md: 650,
            },

            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* ==================================================
              LEFT BRAND PANEL
              ================================================== */}

          <Box
            sx={{
              display: {
                xs: 'none',
                md: 'flex',
              },

              flexDirection: 'column',
              justifyContent: 'space-between',

              p: 6,

              bgcolor: '#101828',
              color: 'common.white',

              position: 'relative',
              overflow: 'hidden',

              '&::before': {
                content: '""',
                position: 'absolute',
                width: 420,
                height: 420,
                borderRadius: '50%',
                bgcolor:
                  'rgba(29, 78, 216, 0.30)',
                top: -170,
                right: -150,
              },

              '&::after': {
                content: '""',
                position: 'absolute',
                width: 300,
                height: 300,
                borderRadius: '50%',
                bgcolor:
                  'rgba(20, 184, 166, 0.12)',
                bottom: -130,
                left: -100,
              },
            }}
          >
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,

                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,

                  display: 'grid',
                  placeItems: 'center',

                  borderRadius: 2,

                  bgcolor: 'primary.main',
                }}
              >
                <DirectionsBusRounded />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  School Transport
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,
                    color: '#98A2B3',
                    fontSize: 12,
                  }}
                >
                  Operations Platform
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                maxWidth: 450,
              }}
            >
              <Typography
                component="h1"
                sx={{
                  fontSize: {
                    md: 38,
                    lg: 44,
                  },

                  fontWeight: 800,
                  lineHeight: 1.12,
                  letterSpacing: '-0.04em',
                }}
              >
                Smarter school transport operations.
              </Typography>

              <Typography
                sx={{
                  mt: 2.5,

                  color: '#D0D5DD',

                  fontSize: 16,
                  lineHeight: 1.7,
                }}
              >
                Manage vehicles, drivers,
                students, routes and journeys
                from one secure operational
                platform.
              </Typography>

              <Box
                sx={{
                  mt: 4,

                  display: 'grid',
                  gap: 1.5,
                }}
              >
                {[
                  'Realtime fleet visibility',
                  'Secure multi-tenant operations',
                  'Student journey monitoring',
                  'Incident and safety management',
                ].map(
                  (item) => (
                    <Box
                      key={item}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          flexShrink: 0,

                          borderRadius: '50%',

                          bgcolor:
                            'secondary.light',
                        }}
                      />

                      <Typography
                        sx={{
                          color: '#EAECF0',
                          fontSize: 14,
                        }}
                      >
                        {item}
                      </Typography>
                    </Box>
                  ),
                )}
              </Box>
            </Box>

            <Typography
              sx={{
                position: 'relative',
                zIndex: 1,

                color: '#667085',

                fontSize: 11,
              }}
            >
              School Transport Platform
            </Typography>
          </Box>

          {/* ==================================================
              LOGIN PANEL
              ================================================== */}

          <Box
            sx={{
              display: 'flex',

              alignItems: 'center',
              justifyContent: 'center',

              p: {
                xs: 3,
                sm: 5,
                md: 6,
              },

              bgcolor: 'background.paper',
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 420,
              }}
            >
              {/* MOBILE BRAND */}

              <Box
                sx={{
                  display: {
                    xs: 'flex',
                    md: 'none',
                  },

                  alignItems: 'center',
                  gap: 1.25,

                  mb: 5,
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,

                    display: 'grid',
                    placeItems: 'center',

                    borderRadius: 2,

                    bgcolor: 'primary.main',
                    color: 'common.white',
                  }}
                >
                  <DirectionsBusRounded />
                </Box>

                <Typography
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  School Transport
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 46,
                  height: 46,

                  display: 'grid',
                  placeItems: 'center',

                  borderRadius: 2,

                  bgcolor:
                    'rgba(29, 78, 216, 0.08)',

                  color: 'primary.main',

                  mb: 2.5,
                }}
              >
                <LockOutlined />
              </Box>

              <Typography
                component="h1"
                sx={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                }}
              >
                Welcome back
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  mb: 4,

                  color: 'text.secondary',

                  fontSize: 14,
                }}
              >
                Sign in to your transport
                operations account.
              </Typography>

              <Box
                component="form"
                onSubmit={handleSubmit}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2.25,
                  }}
                >
                  <TextField
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    autoComplete="email"
                    required
                    fullWidth
                  />

                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    autoComplete="current-password"
                    required
                    fullWidth
                  />

                  {error && (
                    <Alert severity="error">
                      {error}
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={
                      submitting ||
                      devSubmitting !== null
                    }
                    fullWidth
                    sx={{
                      minHeight: 46,
                    }}
                  >
                    {submitting ? (
                      <CircularProgress
                        size={22}
                        color="inherit"
                      />
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </Box>
              </Box>

              {/* ==================================================
                  DEVELOPMENT QUICK LOGINS
                  ================================================== */}

              {import.meta.env.DEV && (
                <Box
                  sx={{
                    mt: 4,
                  }}
                >
                  <Divider>
                    <Typography
                      sx={{
                        px: 1,
                        color: 'text.secondary',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}
                    >
                      DEVELOPMENT
                    </Typography>
                  </Divider>

                  <Typography
                    sx={{
                      mt: 2,
                      mb: 1.5,

                      color: 'text.secondary',

                      fontSize: 12,
                    }}
                  >
                    One-click sign in with a local
                    development account.
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',

                      gridTemplateColumns: {
                        xs: '1fr',
                        sm:
                          'repeat(2, minmax(0, 1fr))',
                      },

                      gap: 1,
                    }}
                  >
                    {devLoginPresets.map(
                      (preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="outlined"
                          disabled={
                            !preset.configured ||
                            submitting ||
                            devSubmitting !== null
                          }
                          startIcon={
                            devSubmitting ===
                              preset.label ? (
                              <CircularProgress
                                size={16}
                                color="inherit"
                              />
                            ) : (
                              <PersonOutlineRounded />
                            )
                          }
                          onClick={() =>
                            void handleDevLogin(
                              preset,
                            )
                          }
                          sx={{
                            justifyContent:
                              'flex-start',

                            textAlign: 'left',

                            minHeight: 54,

                            px: 1.5,
                          }}
                        >
                          <Box>
                            <Typography
                              component="span"
                              sx={{
                                display: 'block',

                                color: 'inherit',

                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {preset.label}
                            </Typography>

                            <Typography
                              component="span"
                              sx={{
                                display: 'block',

                                color:
                                  preset.configured
                                    ? 'text.secondary'
                                    : 'text.disabled',

                                fontSize: 10,
                              }}
                            >
                              {devSubmitting ===
                                preset.label
                                ? 'Signing in...'
                                : preset.configured
                                  ? preset.role
                                  : 'Not configured'}
                            </Typography>
                          </Box>
                        </Button>
                      ),
                    )}
                  </Box>

                  <Typography
                    sx={{
                      mt: 1.5,

                      color: 'text.disabled',

                      fontSize: 10,
                    }}
                  >
                    Developer shortcuts are hidden
                    automatically in production.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
