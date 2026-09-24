import { useMemo, useState } from "react";

import { AssignmentRounded, FactCheckRounded } from "@mui/icons-material";

import { Alert, Box, Paper, Stack, Typography } from "@mui/material";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PLATFORM_PERMISSIONS,
  hasFrontendPlatformPermission,
} from "../auth/platform-permissions";

import { ExecutiveSalesWorkspace } from "./ExecutiveSalesWorkspace";

import { PlatformSidebar, type PlatformSidebarItem } from "./PlatformSidebar";

import { SchoolSetupReviewPanel } from "./SchoolSetupReviewPanel";

import { ScreenTransition } from "./ScreenTransition";

import { SuperAdminThemeProvider } from "./SuperAdminThemeProvider";

export function PlatformLimitedRolePage() {
  const { user, logout, platformPermissions } = useAuth();

  const navigate = useNavigate();

  const canUseSalesWorkspace = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_READ_OWN,
  );

  const canReviewSchoolApplications =
    hasFrontendPlatformPermission(
      platformPermissions,
      FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_READ_ALL,
    ) &&
    hasFrontendPlatformPermission(
      platformPermissions,
      FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_REVIEW,
    );

  const sidebarItems = useMemo<PlatformSidebarItem[]>(
    () => [
      ...(canUseSalesWorkspace
        ? [
            {
              label: "School Applications",

              icon: <AssignmentRounded fontSize="small" />,
            },
          ]
        : []),

      ...(canReviewSchoolApplications
        ? [
            {
              label: "Application Review",

              icon: <FactCheckRounded fontSize="small" />,
            },
          ]
        : []),
    ],
    [canUseSalesWorkspace, canReviewSchoolApplications],
  );

  const [activeLabel, setActiveLabel] = useState(
    () => sidebarItems[0]?.label ?? "",
  );

  const validActiveLabel = sidebarItems.some(
    (item) => item.label === activeLabel,
  )
    ? activeLabel
    : (sidebarItems[0]?.label ?? "");

  function handleLogout(): void {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  function renderWorkspace() {
    if (validActiveLabel === "School Applications") {
      return <ExecutiveSalesWorkspace />;
    }

    if (validActiveLabel === "Application Review") {
      return (
        <Stack
          spacing={2}
          sx={{
            height: "100%",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 16,

                fontWeight: 900,
              }}
            >
              School application review
            </Typography>

            <Typography
              sx={{
                mt: 0.4,

                color: "text.secondary",

                fontSize: 10.5,
              }}
            >
              Approve or reject submitted applications. Approval creates the
              tenant and first school but does not activate it.
            </Typography>
          </Box>

          <SchoolSetupReviewPanel />
        </Stack>
      );
    }

    return (
      <Alert severity="info">
        This platform identity is active, but no frontend workspace is currently
        assigned to its permissions.
      </Alert>
    );
  }

  return (
    <SuperAdminThemeProvider>
      <Box
        sx={{
          height: "100dvh",

          minHeight: 0,

          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            lg: "216px minmax(0, 1fr)",
          },

          bgcolor: "background.default",

          color: "text.primary",
        }}
      >
        <PlatformSidebar
          items={sidebarItems}
          activeLabel={validActiveLabel || null}
          userEmail={user?.email}
          onSelect={(item) => {
            if (item.path) {
              navigate(item.path);

              return;
            }

            setActiveLabel(item.label);
          }}
          onLogout={handleLogout}
        />

        <Box
          component="main"
          sx={{
            minWidth: 0,
            minHeight: 0,

            height: "100dvh",

            display: "flex",

            flexDirection: "column",

            overflow: "hidden",

            p: {
              xs: 1.25,
              md: 1.75,
            },
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              flex: 1,

              minWidth: 0,
              minHeight: 0,

              display: "flex",

              flexDirection: "column",

              p: {
                xs: 1,
                md: 1.25,
              },

              borderRadius: 2,

              bgcolor: "rgba(9, 15, 30, 0.48)",

              overflow: "hidden",
            }}
          >
            <ScreenTransition
              transitionKey={validActiveLabel || "platform-workspace"}
            >
              {renderWorkspace()}
            </ScreenTransition>
          </Paper>
        </Box>
      </Box>
    </SuperAdminThemeProvider>
  );
}
