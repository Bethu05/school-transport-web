import {
  useState,
  type ReactNode,
} from 'react';

import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  AltRouteRounded,
  BadgeRounded,
  DarkModeRounded,
  DashboardRounded,
  DirectionsBusRounded,
  FamilyRestroomRounded,
  LightModeRounded,
  LogoutRounded,
  MapRounded,
  MenuRounded,
  NotificationsRounded,
  PlaceRounded,
  SchoolRounded,
  SettingsRounded,
  ScheduleRounded,
  WarningAmberRounded,
} from '@mui/icons-material';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import {
  useAuth,
} from '../auth/AuthProvider';

import {
  useColorMode,
} from '../theme/AppThemeProvider';

const DRAWER_WIDTH = 252;

interface AppShellProps {
  children: ReactNode;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles?: string[];
}

const ALL_ROLES = [
  'owner',
  'admin',
  'transport_manager',
  'driver',
  'guardian',
];

const navigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardRounded />,
    roles: ALL_ROLES,
  },

  {
    label: 'Live Tracking',
    path: '/tracking',
    icon: <MapRounded />,
    roles: ALL_ROLES,
  },

  {
    label: 'Trips',
    path: '/trips',
    icon: <ScheduleRounded />,
    roles: [
      'owner',
      'admin',
      'transport_manager',
      'driver',
    ],
  },

  {
    label: 'Routes',
    path: '/routes',
    icon: <AltRouteRounded />,
    roles: [
      'owner',
      'admin',
      'transport_manager',
    ],
  },

  {
    label: 'Stops',
    path: '/stops',
    icon: <PlaceRounded />,
    roles: [
      'owner',
      'admin',
      'transport_manager',
    ],
  },

  {
    label: 'Vehicles',
    path: '/vehicles',
    icon: <DirectionsBusRounded />,
    roles: [
      'owner',
      'admin',
      'transport_manager',
    ],
  },

  {
    label: 'Drivers',
    path: '/drivers',
    icon: <BadgeRounded />,
    roles: [
      'owner',
      'admin',
      'transport_manager',
    ],
  },

  {
    label: 'Students',
    path: '/students',
    icon: <SchoolRounded />,
    roles: [
      'owner',
      'admin',
      'transport_manager',
    ],
  },

  {
    label: 'Guardians',
    path: '/guardians',
    icon: <FamilyRestroomRounded />,
    roles: [
      'owner',
      'admin',
    ],
  },

  {
    label: 'Incidents',
    path: '/incidents',
    icon: <WarningAmberRounded />,
    roles: [
      'owner',
      'admin',
      'transport_manager',
      'driver',
    ],
  },

  {
    label: 'Notifications',
    path: '/notifications',
    icon: <NotificationsRounded />,
    roles: ALL_ROLES,
  },

  {
    label: 'Settings',
    path: '/settings',
    icon: <SettingsRounded />,
    roles: [
      'owner',
      'admin',
    ],
  },
];

function roleLabel(
  role?: string,
): string {
  switch (role) {
    case 'owner':
      return 'Owner';

    case 'admin':
      return 'Administrator';

    case 'transport_manager':
      return 'Transport Manager';

    case 'driver':
      return 'Driver';

    case 'guardian':
      return 'Parent';

    default:
      return 'User';
  }
}

function initials(
  email?: string,
): string {
  if (!email) {
    return 'U';
  }

  return email
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({
  children,
}: AppShellProps) {
  const {
    user,
    tenant,
    logout,
  } = useAuth();

  const {
    mode,
    toggleColorMode,
  } = useColorMode();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const role =
    tenant?.role;

  const visibleNavigation =
    navigation.filter(
      (item) =>
        !item.roles ||
        (
          role &&
          item.roles.includes(
            role,
          )
        ),
    );

  function handleLogout(): void {
    logout();

    navigate(
      '/login',
      {
        replace: true,
      },
    );
  }

  function navigateTo(
    path: string,
  ): void {
    navigate(path);

    setMobileOpen(false);
  }

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ================================================
          BRAND
          ================================================ */}

      <Box
        sx={{
          px: 2.5,
          py: 2.5,

          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,

            borderRadius: 2,

            display: 'grid',
            placeItems: 'center',

            bgcolor:
              'primary.main',

            color:
              'primary.contrastText',
          }}
        >
          <DirectionsBusRounded />
        </Box>

        <Box>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            School Transport
          </Typography>

          <Typography
            sx={{
              color:
                'text.secondary',

              fontSize: 11,
            }}
          >
            Operations Platform
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* ================================================
          ROLE-AWARE NAVIGATION
          ================================================ */}

      <List
        sx={{
          flex: 1,

          px: 1.25,
          py: 2,

          overflowY: 'auto',
        }}
      >
        {visibleNavigation.map(
          (item) => {
            const selected =
              location.pathname ===
              item.path;

            return (
              <ListItemButton
                key={item.path}
                selected={selected}
                onClick={() =>
                  navigateTo(
                    item.path,
                  )
                }
                sx={{
                  mb: 0.5,

                  borderRadius: 2,

                  minHeight: 44,

                  '&.Mui-selected':
                    {
                      bgcolor:
                        'action.selected',

                      color:
                        'primary.main',
                    },

                  '&.Mui-selected:hover':
                    {
                      bgcolor:
                        'action.selected',
                    },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 38,

                    color:
                      'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>

                <ListItemText
                  primary={
                    item.label
                  }
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: 13,

                        fontWeight:
                          selected
                            ? 700
                            : 600,
                      },
                    },
                  }}
                />
              </ListItemButton>
            );
          },
        )}
      </List>

      <Divider />

      {/* ================================================
          SIGN OUT
          ================================================ */}

      <Box
        sx={{
          p: 1.25,
        }}
      >
        <ListItemButton
          onClick={
            handleLogout
          }
          sx={{
            borderRadius: 2,

            minHeight: 44,
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 38,
            }}
          >
            <LogoutRounded />
          </ListItemIcon>

          <ListItemText
            primary="Sign out"
            slotProps={{
              primary: {
                sx: {
                  fontSize: 13,
                  fontWeight: 600,
                },
              },
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',

        display: 'flex',

        bgcolor:
          'background.default',
      }}
    >
      {/* ================================================
          DESKTOP SIDEBAR
          ================================================ */}

      <Drawer
        variant="permanent"
        sx={{
          display: {
            xs: 'none',
            md: 'block',
          },

          width:
            DRAWER_WIDTH,

          flexShrink: 0,

          '& .MuiDrawer-paper':
            {
              width:
                DRAWER_WIDTH,

              boxSizing:
                'border-box',

              borderRight:
                '1px solid',

              borderColor:
                'divider',

              bgcolor:
                'background.paper',
            },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* ================================================
          MOBILE SIDEBAR
          ================================================ */}

      <Drawer
        open={mobileOpen}
        onClose={() =>
          setMobileOpen(false)
        }
        sx={{
          display: {
            xs: 'block',
            md: 'none',
          },

          '& .MuiDrawer-paper':
            {
              width:
                DRAWER_WIDTH,

              bgcolor:
                'background.paper',
            },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* ================================================
          APPLICATION AREA
          ================================================ */}

      <Box
        sx={{
          flex: 1,

          minWidth: 0,
        }}
      >
        {/* ==============================================
            TOP BAR
            ============================================== */}

        <Box
          component="header"
          sx={{
            minHeight: 72,

            position: 'sticky',

            top: 0,

            zIndex: 10,

            px: {
              xs: 2,
              md: 3,
            },

            display: 'flex',

            alignItems: 'center',

            borderBottom:
              '1px solid',

            borderColor:
              'divider',

            bgcolor:
              'background.paper',
          }}
        >
          {/* MOBILE MENU */}

          <IconButton
            aria-label="Open navigation"
            onClick={() =>
              setMobileOpen(true)
            }
            sx={{
              display: {
                md: 'none',
              },

              mr: 1,
            }}
          >
            <MenuRounded />
          </IconButton>

          {/* ACTIVE USER INFORMATION */}

          <Box
            sx={{
              flex: 1,

              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,

                fontSize: 17,

                lineHeight: 1.25,
              }}
            >
              {roleLabel(
                role,
              )}
            </Typography>

            <Typography
              noWrap
              sx={{
                mt: 0.25,

                color:
                  'text.secondary',

                fontSize: 11,
              }}
            >
              {user?.email}
            </Typography>
          </Box>

          {/* ============================================
              LIGHT / DARK MODE
              ============================================ */}

          <Tooltip
            title={
              mode === 'light'
                ? 'Switch to dark mode'
                : 'Switch to light mode'
            }
          >
            <IconButton
              aria-label={
                mode === 'light'
                  ? 'Enable dark mode'
                  : 'Enable light mode'
              }
              onClick={
                toggleColorMode
              }
              sx={{
                mr: 1,
              }}
            >
              {mode ===
              'light' ? (
                <DarkModeRounded />
              ) : (
                <LightModeRounded />
              )}
            </IconButton>
          </Tooltip>

          {/* USER AVATAR */}

          <Avatar
            sx={{
              width: 38,
              height: 38,

              bgcolor:
                'primary.main',

              color:
                'primary.contrastText',

              fontSize: 13,

              fontWeight: 800,
            }}
          >
            {initials(
              user?.email,
            )}
          </Avatar>
        </Box>

        {/* ==============================================
            PAGE CONTENT
            ============================================== */}

        <Box
          component="main"
          sx={{
            p: {
              xs: 2,
              sm: 3,
              lg: 4,
            },

            minHeight:
              'calc(100vh - 72px)',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
