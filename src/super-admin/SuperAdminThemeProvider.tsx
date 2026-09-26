import { type ReactNode, useMemo } from "react";

import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";

interface SuperAdminThemeProviderProps {
  children: ReactNode;
}

/**
 * Platform Super Admin has its own visual environment.
 *
 * This theme is deliberately nested beneath the application theme so:
 *
 * - /platform can use a dark glass UI
 * - tenant operational pages keep their existing styling
 * - dialogs opened from Super Admin retain the same dark theme even
 *   though MUI renders them through a portal
 */
export function SuperAdminThemeProvider({
  children,
}: SuperAdminThemeProviderProps) {
  const baseTheme = useTheme();

  const adminTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark",

          primary: {
            main: baseTheme.palette.primary.main,
          },

          background: {
            // Deep navy-indigo, not pure black
            default: "#0B1220",

            /*
             * Keep this translucent.
             *
             * Components using bgcolor="background.paper" will therefore
             * remain glass surfaces instead of becoming opaque cards.
             */
            paper: "rgba(17, 28, 52, 0.68)",
          },

          text: {
            primary: "#F1F5F9",
            secondary: "rgba(186, 199, 216, 0.78)",
          },

          divider: "rgba(148, 163, 184, 0.14)",
        },

        typography: {
          fontFamily: baseTheme.typography.fontFamily,
        },

        shape: {
          borderRadius: baseTheme.shape.borderRadius,
        },

        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",

                backgroundColor: "rgba(17, 28, 52, 0.62)",

                borderColor: "rgba(148, 163, 184, 0.15)",

                backdropFilter: "blur(20px) saturate(140%)",

                WebkitBackdropFilter: "blur(20px) saturate(140%)",

                boxShadow:
                  "0 20px 60px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(148, 163, 184, 0.06)",
              },
            },
          },

          MuiDialog: {
            styleOverrides: {
              paper: {
                backgroundImage: "none",

                backgroundColor: "rgba(11, 18, 36, 0.92)",

                border: "1px solid rgba(148, 163, 184, 0.16)",

                backdropFilter: "blur(28px) saturate(145%)",

                WebkitBackdropFilter: "blur(28px) saturate(145%)",

                boxShadow:
                  "0 36px 110px rgba(0, 0, 0, 0.52), 0 0 0 1px rgba(148, 163, 184, 0.08)",
              },
            },
          },

          MuiTableCell: {
            styleOverrides: {
              root: {
                borderColor: "rgba(148, 163, 184, 0.11)",
              },

              head: {
                color: "rgba(226, 232, 240, 0.78)",

                fontWeight: 800,
              },
            },
          },

          MuiTableRow: {
            styleOverrides: {
              root: {
                transition: "background-color 140ms ease",

                "&.MuiTableRow-hover:hover": {
                  backgroundColor: "rgba(148, 163, 184, 0.06)",
                },
              },
            },
          },

          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                backgroundColor: "rgba(8, 14, 28, 0.42)",

                backdropFilter: "blur(12px)",

                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(148, 163, 184, 0.20)",
                },

                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(148, 163, 184, 0.38)",
                },

                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: baseTheme.palette.primary.main,
                },
              },
            },
          },

          MuiChip: {
            styleOverrides: {
              root: {
                backdropFilter: "blur(12px)",

                WebkitBackdropFilter: "blur(12px)",
              },
            },
          },

          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 9,
              },
            },
          },
        },
      }),
    [
      baseTheme.palette.primary.main,
      baseTheme.shape.borderRadius,
      baseTheme.typography.fontFamily,
    ],
  );

  return <ThemeProvider theme={adminTheme}>{children}</ThemeProvider>;
}
