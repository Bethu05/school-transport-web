import type { ReactNode } from "react";

import { keyframes } from "@emotion/react";

import { Box } from "@mui/material";

const screenEnter = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
`;

interface ScreenTransitionProps {
  transitionKey: string;

  children: ReactNode;
}

export function ScreenTransition({
  transitionKey,
  children,
}: ScreenTransitionProps) {
  return (
    <Box
      key={transitionKey}
      sx={{
        flex: 1,

        width: "100%",
        height: "100%",

        minWidth: 0,
        minHeight: 0,

        display: "flex",
        flexDirection: "column",

        animation: `${screenEnter} 190ms cubic-bezier(0.22, 1, 0.36, 1) both`,

        willChange: "opacity, transform",

        "@media (prefers-reduced-motion: reduce)": {
          animation: "none",

          transform: "none",
        },
      }}
    >
      {children}
    </Box>
  );
}
