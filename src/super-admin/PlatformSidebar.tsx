import type { ReactNode } from "react";

import { AdminPanelSettingsRounded, LogoutRounded } from "@mui/icons-material";

import { Box, Button, Divider, Stack, Typography } from "@mui/material";

export interface PlatformSidebarItem {
  label: string;
  icon: ReactNode;
  path?: string;
}

interface PlatformSidebarProps {
  items: readonly PlatformSidebarItem[];
  activeLabel: string | null;
  userEmail?: string | null;
  onSelect: (item: PlatformSidebarItem) => void;
  onLogout: () => void;
  mobile?: boolean;
}

export function PlatformSidebar({
  items,
  activeLabel,
  userEmail,
  onSelect,
  onLogout,
  mobile = false,
}: PlatformSidebarProps) {
  return (
    <Box
      component="aside"
      data-platform-floating-sidebar
      sx={{
        display: mobile ? "flex" : { xs: "none", lg: "flex" },

        flexDirection: "column",

        alignSelf: mobile ? "stretch" : "center",

        width: mobile ? "100%" : "calc(100% - 18px)",
        height: mobile ? "100%" : "95dvh",
        minHeight: 0,

        ml: mobile ? 0 : 1.5,
        mr: mobile ? 0 : 0.75,

        overflowY: "auto",
        overflowX: "hidden",

        position: "relative",
        zIndex: 3,

        border: mobile ? "none" : "1px solid",
        borderColor: mobile ? "transparent" : "rgba(255, 255, 255, 0.10)",

        borderRadius: mobile ? 0 : 2,

        bgcolor: mobile ? "transparent" : "rgba(43, 49, 57, 0.86)",

        backdropFilter: mobile ? "none" : "blur(24px) saturate(125%)",
        WebkitBackdropFilter: mobile ? "none" : "blur(24px) saturate(125%)",

        boxShadow: mobile
          ? "none"
          : "0 0 0 1px rgba(255, 255, 255, 0.035), 0 26px 58px rgba(0, 0, 0, 0.36), 0 0 34px rgba(255, 255, 255, 0.045)",

        color: "text.primary",

        p: mobile ? 1 : 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",

          alignItems: "center",

          gap: 1,

          px: 0.75,
          py: 1.25,
        }}
      >
        <Box
          sx={{
            width: mobile ? 23 : 30,
            height: mobile ? 23 : 30,

            display: "grid",
            placeItems: "center",

            borderRadius: 1.5,

            bgcolor: "primary.main",

            boxShadow: "0 8px 22px rgba(0, 0, 0, 0.24)",
          }}
        >
          <AdminPanelSettingsRounded sx={{ fontSize: 18 }} />
        </Box>

        <Box
          sx={{
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            Platform
          </Typography>

          <Typography
            sx={{
              mt: 0.05,

              color: "text.secondary",

              fontSize: 8.5,

              textTransform: "uppercase",

              letterSpacing: "0.07em",
            }}
          >
            Command Centre
          </Typography>
        </Box>
      </Box>

      <Divider
        sx={{
          my: 1.5,

          borderColor: "rgba(255, 255, 255, 0.08)",
        }}
      />

      <Stack spacing={0.3}>
        {items.map((item) => {
          const active = activeLabel === item.label;

          return (
            <Button
              key={item.label}
              startIcon={item.icon}
              onClick={() => onSelect(item)}
              fullWidth
              sx={{
                justifyContent: "flex-start",

                minHeight: 34,

                px: 1,
                py: 0.35,

                borderRadius: 1.15,

                fontSize: 10.5,
                fontWeight: active ? 850 : 700,

                "& .MuiButton-startIcon": {
                  mr: 0.9,
                },

                "& .MuiSvgIcon-root": {
                  fontSize: 16.5,
                },

                color: active ? "common.white" : "text.secondary",

                bgcolor: active ? "rgba(255, 255, 255, 0.095)" : "transparent",

                border: "1px solid",

                borderColor: active
                  ? "rgba(255, 255, 255, 0.08)"
                  : "transparent",

                boxShadow: active
                  ? "0 7px 20px rgba(0, 0, 0, 0.20), 0 0 14px rgba(255, 255, 255, 0.025)"
                  : "none",

                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.075)",

                  color: "common.white",
                },
              }}
            >
              {item.label}
            </Button>
          );
        })}
      </Stack>

      <Box
        sx={{
          mt: "auto",

          pt: 2.5,
        }}
      >
        <Divider
          sx={{
            mb: 1.5,

            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        />

        <Typography
          sx={{
            px: 0.75,

            color: "text.secondary",

            fontSize: 9,

            wordBreak: "break-word",
          }}
        >
          {userEmail}
        </Typography>

        <Button
          onClick={onLogout}
          startIcon={<LogoutRounded />}
          fullWidth
          sx={{
            mt: 0.75,

            justifyContent: "flex-start",

            px: 1,

            color: "text.secondary",

            fontSize: 10,

            textTransform: "none",

            "& .MuiSvgIcon-root": {
              fontSize: 16,
            },

            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.065)",

              color: "common.white",
            },
          }}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  );
}
