import { type ReactNode, useMemo } from "react";

import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";

interface SuperAdminThemeProviderProps {
  children: ReactNode;
}

/**
 * Platform Administration has its own command-centre visual environment.
 *
 * The theme remains nested beneath the ordinary application theme so:
 *
 * - /platform can use a dedicated dark-grey command-centre treatment
 * - tenant operational pages keep their existing styling
 * - dialogs opened from Super Admin inherit the same command-centre theme
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
            default: "#20252B",

            /*
             * Keep platform surfaces translucent so the whole environment
             * reads as one command centre rather than disconnected cards.
             */
            paper: "rgba(48, 55, 63, 0.76)",
          },

          text: {
            primary: "#F4F6F8",
            secondary: "rgba(216, 222, 228, 0.72)",
          },

          divider: "rgba(255, 255, 255, 0.10)",
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

                backgroundColor: "rgba(48, 55, 63, 0.72)",

                borderColor: "rgba(255, 255, 255, 0.09)",

                backdropFilter: "blur(18px) saturate(125%)",

                WebkitBackdropFilter: "blur(18px) saturate(125%)",

                boxShadow:
                  "0 18px 46px rgba(0, 0, 0, 0.22), 0 1px 0 rgba(255, 255, 255, 0.04) inset",
              },
            },
          },

          MuiDialog: {
            styleOverrides: {
              paper: {
                backgroundImage: "none",

                backgroundColor: "rgba(39, 45, 52, 0.96)",

                border: "1px solid rgba(255, 255, 255, 0.10)",

                backdropFilter: "blur(24px) saturate(130%)",

                WebkitBackdropFilter: "blur(24px) saturate(130%)",

                boxShadow:
                  "0 30px 90px rgba(0, 0, 0, 0.48), 0 1px 0 rgba(255, 255, 255, 0.05) inset",
              },
            },
          },

          MuiTableCell: {
            styleOverrides: {
              root: {
                borderColor: "rgba(255, 255, 255, 0.075)",
              },

              head: {
                color: "rgba(232, 236, 240, 0.84)",

                fontWeight: 800,
              },
            },
          },

          MuiTableRow: {
            styleOverrides: {
              root: {
                transition: "background-color 140ms ease",

                "&.MuiTableRow-hover:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.045)",
                },
              },
            },
          },

          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                backgroundColor: "rgba(15, 19, 24, 0.30)",

                backdropFilter: "blur(12px)",

                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255, 255, 255, 0.13)",
                },

                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255, 255, 255, 0.24)",
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
                borderRadius: 5,
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
