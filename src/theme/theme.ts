import {
  createTheme,
  type Theme,
} from '@mui/material/styles';

import {
  colors,
} from './tokens';

/**
 * The provider stores only an explicit rendered colour mode.
 *
 * If the application later supports a "system" preference, resolve
 * that preference inside AppThemeProvider before calling createAppTheme.
 */
export type AppColorMode =
  | 'light'
  | 'dark';

/**
 * Build the application's MUI theme from the central design tokens.
 *
 * This keeps:
 * - global palette control in one place;
 * - dark/light mode consistent;
 * - individual domain pages free from brand hex values where MUI
 *   semantic colours are sufficient.
 */
export function createAppTheme(
  mode: AppColorMode,
): Theme {
  const dark =
    mode === 'dark';

  return createTheme({
    palette: {
      mode,

      primary: {
        main:
          colors.brand.champagneGold,

        light:
          colors.brand.lightGold,

        dark:
          colors.brand.bronze,

        contrastText:
          colors.neutral.graphite900,
      },

      secondary: {
        main:
          colors.brand.bronze,

        light:
          colors.brand.lightGold,

        dark:
          colors.brand.deepBronze,
      },

      success: {
        main:
          colors.status.success,
      },

      warning: {
        main:
          colors.status.warning,
      },

      error: {
        main:
          colors.status.danger,
      },

      background: {
        default:
          dark
            ? colors.neutral.graphite950
            : colors.neutral.ivory,

        paper:
          dark
            ? colors.neutral.graphite900
            : colors.neutral.paper,
      },

      text: {
        primary:
          dark
            ? colors.neutral.ivory
            : colors.neutral.charcoal,

        secondary:
          dark
            ? '#A7ABB2'
            : '#6F716F',
      },

      divider:
        dark
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(58,49,34,0.10)',

      action: {
        hover:
          dark
            ? 'rgba(255,255,255,0.045)'
            : 'rgba(201,165,92,0.055)',

        selected:
          dark
            ? 'rgba(201,165,92,0.12)'
            : 'rgba(201,165,92,0.10)',
      },
    },

    shape: {
      borderRadius: 12,
    },

    typography: {
      fontFamily:
        '"Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',

      button: {
        textTransform:
          'none',

        fontWeight:
          750,
      },
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            margin: 0,

            backgroundColor:
              dark
                ? colors.neutral.graphite950
                : colors.neutral.ivory,
          },

          '*': {
            boxSizing:
              'border-box',
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage:
              'none',
          },
        },
      },

      MuiButton: {
        defaultProps: {
          disableElevation:
            true,
        },

        styleOverrides: {
          root: {
            borderRadius:
              10,

            fontWeight:
              750,
          },
        },
      },

      MuiTextField: {
        defaultProps: {
          size:
            'small',
        },
      },

      MuiFormControl: {
        defaultProps: {
          size:
            'small',
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight:
              700,
          },
        },
      },
    },
  });
}
