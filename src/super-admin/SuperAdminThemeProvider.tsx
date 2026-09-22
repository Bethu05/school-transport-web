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
            default: "#070B14",

            /*
             * Keep this translucent.
             *
             * Components using bgcolor="background.paper" will therefore
             * remain glass surfaces instead of becoming opaque cards.
             */
            paper: "rgba(15, 23, 42, 0.62)",
          },

          text: {
            primary: "#F8FAFC",
            secondary: "rgba(203, 213, 225, 0.76)",
          },

          divider: "rgba(148, 163, 184, 0.16)",
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

                backgroundColor: "rgba(15, 23, 42, 0.58)",

                borderColor: "rgba(148, 163, 184, 0.17)",

                backdropFilter: "blur(18px) saturate(135%)",

                WebkitBackdropFilter: "blur(18px) saturate(135%)",

                boxShadow: "0 18px 55px rgba(0, 0, 0, 0.22)",
              },
            },
          },

          MuiDialog: {
            styleOverrides: {
              paper: {
                backgroundImage: "none",

                backgroundColor: "rgba(8, 13, 26, 0.88)",

                border: "1px solid rgba(148, 163, 184, 0.18)",

                backdropFilter: "blur(24px) saturate(140%)",

                WebkitBackdropFilter: "blur(24px) saturate(140%)",

                boxShadow: "0 32px 100px rgba(0, 0, 0, 0.48)",
              },
            },
          },

          MuiTableCell: {
            styleOverrides: {
              root: {
                borderColor: "rgba(148, 163, 184, 0.12)",
              },

              head: {
                color: "rgba(226, 232, 240, 0.72)",

                fontWeight: 800,
              },
            },
          },

          MuiTableRow: {
            styleOverrides: {
              root: {
                transition: "background-color 140ms ease",

                "&.MuiTableRow-hover:hover": {
                  backgroundColor: "rgba(148, 163, 184, 0.055)",
                },
              },
            },
          },

          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                backgroundColor: "rgba(2, 6, 23, 0.28)",

                backdropFilter: "blur(10px)",

                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(148, 163, 184, 0.22)",
                },

                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(148, 163, 184, 0.40)",
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
                backdropFilter: "blur(10px)",

                WebkitBackdropFilter: "blur(10px)",
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
