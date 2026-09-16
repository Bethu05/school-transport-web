/*
 * AppThemeProvider intentionally exports the provider and its
 * matching useColorMode() hook as one small theming API.
 */
/* oxlint-disable react/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CssBaseline } from "@mui/material";

import { ThemeProvider } from "@mui/material/styles";

import { createAppTheme, type AppColorMode } from "./theme";

interface ColorModeContextValue {
  mode: AppColorMode;

  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

const STORAGE_KEY = "school_transport_color_mode";

interface AppThemeProviderProps {
  children: ReactNode;
}

/**
 * Determine the application's initial
 * visual mode.
 *
 * A user's explicit previous selection
 * takes priority.
 */
function initialMode(): AppColorMode {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return "light";
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const [mode, setMode] = useState<AppColorMode>(initialMode);

  /**
   * Persist the selected appearance so
   * refreshing or reopening the application
   * retains the user's preference.
   */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  /**
   * Rebuild the MUI theme only when the
   * colour mode changes.
   */
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const contextValue = useMemo<ColorModeContextValue>(
    () => ({
      mode,

      toggleColorMode: () => {
        setMode((currentMode) => (currentMode === "light" ? "dark" : "light"));
      },
    }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

/**
 * Access the currently selected colour
 * mode and the light/dark toggle.
 */
export function useColorMode(): ColorModeContextValue {
  const context = useContext(ColorModeContext);

  if (!context) {
    throw new Error("useColorMode must be used inside AppThemeProvider");
  }

  return context;
}
