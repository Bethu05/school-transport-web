import { useState, type ReactNode } from "react";

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
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  AltRouteRounded,
  BadgeRounded,
  DarkModeRounded,
  DashboardRounded,
  DirectionsBusRounded,
  DomainRounded,
  FamilyRestroomRounded,
  LightModeRounded,
  LockRounded,
  LogoutRounded,
  ManageAccountsRounded,
  MapRounded,
  MenuRounded,
  NotificationsRounded,
  PlaceRounded,
  SchoolRounded,
  SettingsRounded,
  ScheduleRounded,
  WarningAmberRounded,
} from "@mui/icons-material";

import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
  type FrontendPermission,
} from "../auth/frontend-permissions";

import { UpgradeRequiredDialog } from "../commercial/UpgradeRequiredDialog";

import { buildSchoolPath } from "../schools/school-routing";

import { buildTenantPath } from "../tenancy/tenant-routing";

import { useColorMode } from "../theme/AppThemeProvider";

const DRAWER_WIDTH = 252;

interface AppShellProps {
  children: ReactNode;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: ReactNode;

  /**
   * Standard tenant-wide page visibility.
   *
   * Effective permissions come from /auth/context.
   */
  permission?: FrontendPermission;

  /**
   * Used when either permission makes the page useful.
   *
   * Incidents is the first example:
   * some users can report incidents without broad read access.
   */
  anyPermissions?: readonly FrontendPermission[];

  /**
   * Optional tenant commercial feature required for the whole page.
   *
   * Permission determines whether the USER may use the page.
   * Feature entitlement determines whether the TENANT owns it.
   */
  feature?: string;

  /**
   * Temporary fallback for special navigation whose access is
   * role/relationship-specific rather than a simple page permission.
   */
  roles?: readonly string[];
}

const ALL_ROLES = ["owner", "admin", "transport_manager", "driver", "guardian"];

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <DashboardRounded />,
    roles: ALL_ROLES,
  },

  {
    label: "Live Tracking",
    path: "/tracking",
    icon: <MapRounded />,
    feature: "tracking.live",
    roles: ALL_ROLES,
  },

  {
    label: "Trips",
    path: "/trips",
    icon: <ScheduleRounded />,
    permission: FRONTEND_PERMISSIONS.TRIPS_READ,
  },

  {
    label: "Routes",
    path: "/routes",
    icon: <AltRouteRounded />,
    permission: FRONTEND_PERMISSIONS.ROUTES_READ,
  },

  {
    label: "Stops",
    path: "/stops",
    icon: <PlaceRounded />,
    permission: FRONTEND_PERMISSIONS.STOPS_READ,
  },

  {
    label: "Vehicles",
    path: "/vehicles",
    icon: <DirectionsBusRounded />,
    permission: FRONTEND_PERMISSIONS.VEHICLES_READ,
  },

  {
    label: "Drivers",
    path: "/drivers",
    icon: <BadgeRounded />,
    permission: FRONTEND_PERMISSIONS.DRIVERS_READ,
  },

  {
    label: "Students",
    path: "/students",
    icon: <SchoolRounded />,
    permission: FRONTEND_PERMISSIONS.STUDENTS_READ,
  },

  {
    label: "Guardians",
    path: "/guardians",
    icon: <FamilyRestroomRounded />,
    permission: FRONTEND_PERMISSIONS.GUARDIANS_READ,
  },

  {
    label: "Incidents",
    path: "/incidents",
    icon: <WarningAmberRounded />,
    anyPermissions: [
      FRONTEND_PERMISSIONS.INCIDENTS_READ,
      FRONTEND_PERMISSIONS.INCIDENTS_CREATE,
    ],
  },

  {
    label: "Notifications",
    path: "/notifications",
    icon: <NotificationsRounded />,
    roles: ALL_ROLES,
  },

  {
    label: "Schools",
    path: "/schools",
    icon: <DomainRounded />,
    permission: FRONTEND_PERMISSIONS.SCHOOLS_READ,
  },

  {
    label: "Settings",
    path: "/settings",
    icon: <SettingsRounded />,
    permission: FRONTEND_PERMISSIONS.SETTINGS_READ,
  },

  {
    label: "Users & Access",
    path: "/users-access",
    icon: <ManageAccountsRounded />,
    permission: FRONTEND_PERMISSIONS.USERS_READ,
  },
];

function roleLabel(role?: string): string {
  switch (role) {
    case "owner":
      return "Owner";

    case "admin":
      return "Administrator";

    case "transport_manager":
      return "Transport Manager";

    case "driver":
      return "Driver";

    case "guardian":
      return "Parent";

    default:
      return "User";
  }
}

function initials(email?: string): string {
  if (!email) {
    return "U";
  }

  return email.slice(0, 2).toUpperCase();
}

export function AppShell({ children }: AppShellProps) {
  const {
    permissions,
    features,
    user,
    tenant,
    tenantMembership,
    schools,
    activeSchool,
    selectSchool,
    logout,
  } = useAuth();

  const { mode, toggleColorMode } = useColorMode();

  const navigate = useNavigate();

  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [lockedNavigationItem, setLockedNavigationItem] =
    useState<NavigationItem | null>(null);

  const role = tenant?.role;

  const enabledFeatureKeys = new Set(
    features.filter((feature) => feature.enabled).map((feature) => feature.key),
  );

  const visibleNavigation = navigation.filter((item) => {
    if (
      item.permission &&
      !hasFrontendPermission(permissions, item.permission)
    ) {
      return false;
    }

    if (
      item.anyPermissions &&
      !item.anyPermissions.some((permission) =>
        hasFrontendPermission(permissions, permission),
      )
    ) {
      return false;
    }

    if (item.roles && !(role && item.roles.includes(role))) {
      return false;
    }

    return true;
  });

  function handleLogout(): void {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  /**
   * Resolve only modules that have actually completed their
   * school-context migration.
   *
   * Other modules deliberately retain their existing tenant-wide
   * URLs until their backend/frontend data contracts are migrated.
   */
  function navigationPath(item: NavigationItem): string {
    const schoolSection =
      item.path === "/students"
        ? "students"
        : item.path === "/trips"
          ? "trips"
          : item.path === "/routes"
            ? "routes"
            : item.path === "/stops"
              ? "stops"
              : item.path === "/vehicles"
                ? "vehicles"
                : item.path === "/drivers"
                  ? "drivers"
                  : item.path === "/incidents"
                    ? "incidents"
                    : null;

    if (schoolSection && tenantMembership && activeSchool) {
      return buildSchoolPath(
        tenantMembership.slug,
        activeSchool.slug,
        schoolSection,
      );
    }

    if (tenantMembership) {
      if (item.path === "/dashboard") {
        return buildTenantPath(tenantMembership.slug);
      }

      const tenantSection =
        item.path === "/tracking"
          ? "tracking"
          : item.path === "/guardians"
            ? "guardians"
            : item.path === "/notifications"
              ? "notifications"
              : item.path === "/schools"
                ? "schools"
                : item.path === "/settings"
                  ? "settings"
                  : item.path === "/users-access"
                    ? "users-access"
                    : null;

      if (tenantSection) {
        return buildTenantPath(tenantMembership.slug, tenantSection);
      }
    }

    return item.path;
  }

  function handleSchoolChange(schoolId: string): void {
    const school =
      schools.find((candidate) => candidate.id === schoolId) ?? null;

    if (!school) {
      return;
    }

    selectSchool(school.id);

    if (!tenantMembership) {
      return;
    }

    /**
     * Preserve the current school-scoped section when switching
     * between authorised schools.
     */
    if (location.pathname.startsWith("/school/")) {
      const segments = location.pathname.split("/").filter(Boolean);

      const section = segments[3];

      if (section) {
        navigate(buildSchoolPath(tenantMembership.slug, school.slug, section), {
          replace: true,
        });

        return;
      }
    }

    /**
     * Compatibility entries become canonical as soon as a school
     * is selected.
     */
    const compatibilitySection =
      location.pathname === "/students"
        ? "students"
        : location.pathname === "/trips"
          ? "trips"
          : location.pathname === "/routes"
            ? "routes"
            : location.pathname === "/stops"
              ? "stops"
              : location.pathname === "/vehicles"
                ? "vehicles"
                : location.pathname === "/drivers"
                  ? "drivers"
                  : location.pathname === "/incidents"
                    ? "incidents"
                    : null;

    if (compatibilitySection) {
      navigate(
        buildSchoolPath(
          tenantMembership.slug,
          school.slug,
          compatibilitySection,
        ),
        {
          replace: true,
        },
      );
    }
  }

  function navigateTo(path: string): void {
    navigate(path);

    setMobileOpen(false);
  }

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ================================================
          BRAND
          ================================================ */}

      <Box
        sx={{
          px: 2.5,
          py: 2.5,

          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,

            borderRadius: 2,

            display: "grid",
            placeItems: "center",

            bgcolor: "primary.main",

            color: "primary.contrastText",
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
              color: "text.secondary",

              fontSize: 11,
            }}
          >
            Operations Platform
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* ================================================
          PERMISSION-AWARE NAVIGATION
          ================================================ */}

      <List
        sx={{
          flex: 1,

          minHeight: 0,

          px: 1.25,
          py: 2,

          overflowY: "auto",

          overscrollBehavior: "contain",
        }}
      >
        {visibleNavigation.map((item) => {
          const resolvedPath = navigationPath(item);

          const selected = location.pathname === resolvedPath;

          const locked =
            Boolean(item.feature) && !enabledFeatureKeys.has(item.feature!);

          return (
            <ListItemButton
              key={item.path}
              selected={selected}
              onClick={() => {
                if (locked) {
                  setLockedNavigationItem(item);

                  setMobileOpen(false);

                  return;
                }

                navigateTo(resolvedPath);
              }}
              sx={{
                mb: 0.5,

                borderRadius: 2,

                minHeight: 44,

                "&.Mui-selected": {
                  bgcolor: "action.selected",

                  color: "primary.main",
                },

                "&.Mui-selected:hover": {
                  bgcolor: "action.selected",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 38,

                  color: "inherit",
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontSize: 13,

                      fontWeight: selected ? 700 : 600,
                    },
                  },
                }}
              />

              {locked ? (
                <Tooltip title="Upgrade required">
                  <LockRounded
                    sx={{
                      ml: 1,
                      fontSize: 16,
                      color: "warning.main",
                    }}
                  />
                </Tooltip>
              ) : null}
            </ListItemButton>
          );
        })}
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
          onClick={handleLogout}
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

        <Typography
          sx={{
            mt: 1.25,

            px: 1.5,

            color: "text.disabled",

            fontSize: 9.5,

            lineHeight: 1.5,

            textAlign: "center",

            letterSpacing: "0.02em",
          }}
        >
          © sirb-Technologies 2026
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",

        display: "flex",

        bgcolor: "background.default",
      }}
    >
      {/* ================================================
          DESKTOP SIDEBAR
          ================================================ */}

      <Drawer
        variant="permanent"
        sx={{
          display: {
            xs: "none",
            md: "block",
          },

          width: DRAWER_WIDTH,

          flexShrink: 0,

          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,

            boxSizing: "border-box",

            position: "fixed",

            top: 0,

            bottom: 0,

            height: "100vh",

            overflow: "hidden",

            borderRight: "1px solid",

            borderColor: "divider",

            bgcolor: "background.paper",
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
        onClose={() => setMobileOpen(false)}
        sx={{
          display: {
            xs: "block",
            md: "none",
          },

          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,

            bgcolor: "background.paper",
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

            position: "sticky",

            top: 0,

            zIndex: 10,

            px: {
              xs: 2,
              md: 3,
            },

            display: "flex",

            alignItems: "center",

            borderBottom: "1px solid",

            borderColor: "divider",

            bgcolor: "background.paper",
          }}
        >
          {/* MOBILE MENU */}

          <IconButton
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{
              display: {
                md: "none",
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
              {roleLabel(role)}
            </Typography>

            <Typography
              noWrap
              sx={{
                mt: 0.25,

                color: "text.secondary",

                fontSize: 11,
              }}
            >
              {user?.email}
            </Typography>
          </Box>

          {/* ============================================
              SCHOOL CONTEXT

              Deliberately shown only on modules that have already
              been migrated to school-scoped behaviour.
              ============================================ */}

          {(location.pathname === "/students" ||
            location.pathname === "/trips" ||
            location.pathname === "/routes" ||
            location.pathname === "/stops" ||
            location.pathname === "/vehicles" ||
            location.pathname === "/drivers" ||
            location.pathname === "/incidents" ||
            location.pathname.startsWith("/school/")) &&
          tenantMembership &&
          schools.length > 0 ? (
            <Select
              size="small"
              value={activeSchool?.id ?? ""}
              displayEmpty
              aria-label="Current school"
              onChange={(event) => {
                handleSchoolChange(event.target.value);
              }}
              sx={{
                mr: 1,

                minWidth: {
                  xs: 120,
                  sm: 180,
                },

                maxWidth: {
                  xs: 150,
                  sm: 240,
                },

                fontSize: 11.5,
              }}
            >
              <MenuItem value="" disabled>
                Select school
              </MenuItem>

              {schools.map((school) => (
                <MenuItem key={school.id} value={school.id}>
                  {school.shortName ?? school.name}
                </MenuItem>
              ))}
            </Select>
          ) : null}

          {/* ============================================
              LIGHT / DARK MODE
              ============================================ */}

          <Tooltip
            title={
              mode === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
          >
            <IconButton
              aria-label={
                mode === "light" ? "Enable dark mode" : "Enable light mode"
              }
              onClick={toggleColorMode}
              sx={{
                mr: 1,
              }}
            >
              {mode === "light" ? <DarkModeRounded /> : <LightModeRounded />}
            </IconButton>
          </Tooltip>

          {/* USER ACCOUNT SECURITY */}

          <Tooltip title="Change password">
            <IconButton
              aria-label="Change password"
              onClick={() => navigate("/change-password")}
              sx={{
                p: 0.25,
              }}
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,

                  bgcolor: "primary.main",

                  color: "primary.contrastText",

                  fontSize: 13,

                  fontWeight: 800,
                }}
              >
                {initials(user?.email)}
              </Avatar>
            </IconButton>
          </Tooltip>
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

            minHeight: "calc(100vh - 72px)",
          }}
        >
          {children}
        </Box>
      </Box>
      <UpgradeRequiredDialog
        open={lockedNavigationItem !== null}
        featureName={lockedNavigationItem?.label ?? "Feature"}
        onClose={() => setLockedNavigationItem(null)}
      />
    </Box>
  );
}
