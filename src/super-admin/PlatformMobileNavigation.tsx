import { useState } from "react";

import { MenuRounded } from "@mui/icons-material";

import { Box, Drawer, IconButton, Typography } from "@mui/material";

import { PlatformSidebar, type PlatformSidebarItem } from "./PlatformSidebar";

interface PlatformMobileNavigationProps {
  items: readonly PlatformSidebarItem[];
  activeLabel: string | null;
  userEmail?: string | null;
  onSelect: (item: PlatformSidebarItem) => void;
  onLogout: () => void;
}

export function PlatformMobileNavigation({
  items,
  activeLabel,
  userEmail,
  onSelect,
  onLogout,
}: PlatformMobileNavigationProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Box
        data-platform-mobile-navigation
        sx={{
          display: {
            xs: open ? "none" : "flex",
            lg: "none",
          },

          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 1250,

          alignItems: "center",
          gap: 0.8,

          px: 0.45,
          py: 0.4,

          border: "1px solid rgba(45, 212, 191, 0.12)",
          borderRadius: 2,

          bgcolor: "rgba(26, 36, 40, 0.42)",

          backdropFilter: "blur(18px) saturate(145%)",
          WebkitBackdropFilter: "blur(18px) saturate(145%)",

          boxShadow:
            "0 10px 28px rgba(0, 0, 0, 0.22), 0 0 18px rgba(45, 212, 191, 0.07)",
        }}
      >
        <IconButton
          aria-label="Open Platform navigation"
          onClick={() => setOpen(true)}
          size="small"
          sx={{
            width: 29,
            height: 29,

            border: "1px solid rgba(45, 212, 191, 0.14)",

            color: "rgba(226, 232, 240, 0.92)",

            bgcolor: "rgba(255, 255, 255, 0.035)",
          }}
        >
          <MenuRounded sx={{ fontSize: 16 }} />
        </IconButton>

        <Box
          sx={{
            pr: 0.75,
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              color: "rgba(94, 234, 212, 0.76)",
              fontSize: 7.5,
              fontWeight: 800,
              lineHeight: 1,
              textTransform: "uppercase",
              letterSpacing: "0.09em",
            }}
          >
            Platform
          </Typography>

          <Typography
            noWrap
            sx={{
              mt: 0.25,
              maxWidth: 90,
              fontSize: 8.5,
              fontWeight: 800,
              lineHeight: 1.2,
            }}
          >
            {activeLabel || "Navigation"}
          </Typography>
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{
          keepMounted: true,
        }}
        slotProps={{
          paper: {
            sx: {
              width: "55vw",
              minWidth: 145,
              maxWidth: 205,

              height: "60dvh",

              top: "20dvh",
              bottom: "auto",
              right: 8,
              left: "auto",

              border: "1px solid rgba(45, 212, 191, 0.20)",
              borderRadius: 3,

              bgcolor: "rgba(22, 34, 38, 0.48)",

              backgroundImage:
                "linear-gradient(155deg, rgba(45, 212, 191, 0.065), rgba(255, 255, 255, 0.018) 46%, rgba(12, 18, 22, 0.035))",

              backdropFilter: "blur(28px) saturate(155%)",
              WebkitBackdropFilter: "blur(28px) saturate(155%)",

              boxShadow:
                "0 24px 56px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(45, 212, 191, 0.035), 0 0 34px rgba(45, 212, 191, 0.11)",

              overflow: "hidden",
            },
          },
        }}
        sx={{
          display: {
            xs: "block",
            lg: "none",
          },
        }}
      >
        <PlatformSidebar
          mobile
          items={items}
          activeLabel={activeLabel}
          userEmail={userEmail}
          onSelect={(item) => {
            setOpen(false);
            onSelect(item);
          }}
          onLogout={() => {
            setOpen(false);
            onLogout();
          }}
        />
      </Drawer>
    </>
  );
}
