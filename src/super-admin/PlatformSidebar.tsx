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
}

export function PlatformSidebar({
  items,
  activeLabel,
  userEmail,
  onSelect,
  onLogout,
}: PlatformSidebarProps) {
  return (
    <Box
      component="aside"
      sx={{
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        height: "100dvh",
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        zIndex: 1,
        borderRight: "1px solid",
        borderColor: "rgba(148, 163, 184, 0.14)",
        bgcolor: "rgba(5, 9, 20, 0.70)",
        backdropFilter: "blur(24px) saturate(130%)",
        WebkitBackdropFilter: "blur(24px) saturate(130%)",
        color: "common.white",
        p: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 1,
          py: 1.5,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            display: "grid",
            placeItems: "center",
            borderRadius: 2,
            bgcolor: "primary.main",
          }}
        >
          <AdminPanelSettingsRounded />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 850 }}>
            Platform
          </Typography>

          <Typography sx={{ color: "#98A2B3", fontSize: 9 }}>
            Administration
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.08)" }} />

      <Stack spacing={0.35}>
        {items.map((item) => (
          <Button
            key={item.label}
            startIcon={item.icon}
            onClick={() => onSelect(item)}
            fullWidth
            sx={{
              justifyContent: "flex-start",
              minHeight: 34,
              px: 1.25,
              py: 0.35,
              borderRadius: 1.5,
              fontSize: 10.75,
              fontWeight: 700,
              "& .MuiButton-startIcon": { mr: 1 },
              "& .MuiSvgIcon-root": { fontSize: 17 },
              color: activeLabel === item.label ? "common.white" : "#98A2B3",
              bgcolor:
                activeLabel === item.label
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.08)",
                color: "common.white",
              },
            }}
          >
            {item.label}
          </Button>
        ))}
      </Stack>

      <Box sx={{ mt: "auto", pt: 3 }}>
        <Divider sx={{ mb: 2, borderColor: "rgba(255,255,255,0.08)" }} />

        <Typography
          sx={{
            px: 1,
            color: "#98A2B3",
            fontSize: 10,
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
            mt: 1,
            justifyContent: "flex-start",
            color: "#D0D5DD",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.08)",
            },
          }}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  );
}
