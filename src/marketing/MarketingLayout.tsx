import type { ReactNode } from "react";

import { Box } from "@mui/material";

import { MarketingFooter } from "./components/MarketingFooter";

import { MarketingHeader } from "./components/MarketingHeader";

interface MarketingLayoutProps {
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <MarketingHeader />

      <Box component="main">{children}</Box>

      <MarketingFooter />
    </Box>
  );
}
