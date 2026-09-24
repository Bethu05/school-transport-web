import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";

import {
  LockResetRounded,
  ManageAccountsRounded,
  PublicRounded,
  RestartAltRounded,
  SaveRounded,
  SettingsRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

import { buildTenantPath } from "../tenancy/tenant-routing";

import { OrganisationProfilePanel } from "./OrganisationProfilePanel";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import {
  getSettings,
  updateGeneralSettings,
  type GeneralSettings,
  type SettingsDateFormat,
  type SettingsResponse,
  type SettingsTimeFormat,
  type SettingsWeekStartDay,
  type UpdateGeneralSettingsInput,
} from "./settings.api";

// ============================================================
// FORM MODEL
// ============================================================

interface SettingsFormState {
  name: string;

  timezone: string;

  locale: string;

  dateFormat: SettingsDateFormat;

  timeFormat: SettingsTimeFormat;

  weekStartDay: SettingsWeekStartDay;
}

const EMPTY_FORM: SettingsFormState = {
  name: "",

  timezone: "UTC",

  locale: "en",

  dateFormat: "DD/MM/YYYY",

  timeFormat: "24h",

  weekStartDay: "monday",
};

const WEEK_DAYS: readonly {
  value: SettingsWeekStartDay;
  label: string;
}[] = [
  {
    value: "monday",
    label: "Monday",
  },

  {
    value: "tuesday",
    label: "Tuesday",
  },

  {
    value: "wednesday",
    label: "Wednesday",
  },

  {
    value: "thursday",
    label: "Thursday",
  },

  {
    value: "friday",
    label: "Friday",
  },

  {
    value: "saturday",
    label: "Saturday",
  },

  {
    value: "sunday",
    label: "Sunday",
  },
];

function formFromSettings(settings: GeneralSettings): SettingsFormState {
  return {
    name: settings.name,

    timezone: settings.timezone,

    locale: settings.locale,

    dateFormat: settings.dateFormat,

    timeFormat: settings.timeFormat,

    weekStartDay: settings.weekStartDay,
  };
}

function formsMatch(
  form: SettingsFormState,
  settings: GeneralSettings,
): boolean {
  return (
    form.name === settings.name &&
    form.timezone === settings.timezone &&
    form.locale === settings.locale &&
    form.dateFormat === settings.dateFormat &&
    form.timeFormat === settings.timeFormat &&
    form.weekStartDay === settings.weekStartDay
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The settings operation could not be completed.";
}

function updatedAtLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

// ============================================================
// PAGE
// ============================================================

export function SettingsPage() {
  const { tenant, tenantMembership, permissions } = useAuth();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const tenantId = tenant?.tenantId;

  const canRead = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.SETTINGS_READ,
  );

  const canUpdate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.SETTINGS_UPDATE,
  );

  const canReadUsers = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_READ,
  );

  /**
   * React Query owns canonical server state.
   *
   * Local component state exists ONLY when the administrator
   * has unsaved edits.
   *
   * This avoids copying query data into state via useEffect.
   */
  const [draft, setDraft] = useState<SettingsFormState | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ==========================================================
  // LOAD
  // ==========================================================

  const settingsQuery = useQuery({
    queryKey: ["settings", tenantId],

    enabled: Boolean(tenantId) && canRead,

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return getSettings(tenantId);
    },
  });

  const general = settingsQuery.data?.general;

  const profile = settingsQuery.data?.profile;

  /**
   * No effect is needed.
   *
   * When there is no draft, render directly from canonical
   * server data.
   */
  const form = draft ?? (general ? formFromSettings(general) : EMPTY_FORM);

  const hasChanges = general ? !formsMatch(form, general) : false;

  // ==========================================================
  // UPDATE
  // ==========================================================

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateGeneralSettingsInput) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return updateGeneralSettings(tenantId, input);
    },

    onSuccess: (response: SettingsResponse) => {
      /**
       * Put the backend response directly into the cache.
       *
       * The backend remains authoritative for canonical
       * formatting and updatedAt.
       */
      queryClient.setQueryData(["settings", tenantId], response);

      /**
       * Drop local edits.
       *
       * The rendered form now comes directly from the
       * newly cached server response.
       */
      setDraft(null);

      setValidationError(null);

      setSuccessMessage("General settings saved successfully.");
    },
  });

  // ==========================================================
  // FORM HELPERS
  // ==========================================================

  function updateField<K extends keyof SettingsFormState>(
    key: K,
    value: SettingsFormState[K],
  ): void {
    setDraft((current) => ({
      ...(current ?? form),

      [key]: value,
    }));

    setValidationError(null);

    updateMutation.reset();
  }

  function resetForm(): void {
    setDraft(null);

    setValidationError(null);

    updateMutation.reset();
  }

  // ==========================================================
  // SAVE
  // ==========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setValidationError(null);

    if (!canUpdate) {
      setValidationError(
        "You do not have permission to update organisation settings.",
      );

      return;
    }

    const name = form.name.trim();

    const timezone = form.timezone.trim();

    const locale = form.locale.trim();

    if (!name) {
      setValidationError("Organisation name is required.");

      return;
    }

    if (!timezone) {
      setValidationError("Timezone is required.");

      return;
    }

    if (!locale) {
      setValidationError("Locale is required.");

      return;
    }

    await updateMutation.mutateAsync({
      name,

      timezone,

      locale,

      dateFormat: form.dateFormat,

      timeFormat: form.timeFormat,

      weekStartDay: form.weekStartDay,
    });
  }

  // ==========================================================
  // NO SETTINGS.READ
  // ==========================================================

  if (!canRead) {
    return (
      <Box>
        <Typography
          component="h1"
          sx={{
            fontSize: {
              xs: 30,
              md: 38,
            },

            fontWeight: 900,

            letterSpacing: "-0.04em",
          }}
        >
          Settings
        </Typography>

        <Alert
          severity="warning"
          sx={{
            mt: 3,

            maxWidth: 760,
          }}
        >
          You do not have permission to view organisation settings.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* ====================================================
          HEADER
          ==================================================== */}

      <Box
        sx={{
          mb: 3,

          display: "flex",

          flexDirection: {
            xs: "column",

            md: "row",
          },

          alignItems: {
            xs: "flex-start",

            md: "flex-end",
          },

          justifyContent: "space-between",

          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "primary.dark",

              fontSize: 10,

              fontWeight: 850,

              textTransform: "uppercase",

              letterSpacing: "0.14em",
            }}
          >
            Administration
          </Typography>

          <Typography
            component="h1"
            sx={{
              mt: 0.7,

              fontSize: {
                xs: 30,
                md: 38,
              },

              fontWeight: 900,

              letterSpacing: "-0.04em",
            }}
          >
            Settings
          </Typography>

          <Typography
            sx={{
              mt: 0.7,

              color: "text.secondary",

              fontSize: 13,
            }}
          >
            Configure organisation identity and regional preferences.
          </Typography>
        </Box>

        {general ? (
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 11,
            }}
          >
            Last updated {updatedAtLabel(general.updatedAt)}
          </Typography>
        ) : null}
      </Box>

      {/* ====================================================
          LOADING
          ==================================================== */}

      {settingsQuery.isLoading ? (
        <Paper
          elevation={0}
          sx={{
            minHeight: 240,

            display: "grid",

            placeItems: "center",

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <CircularProgress size={32} />
        </Paper>
      ) : null}

      {/* ====================================================
          LOAD ERROR
          ==================================================== */}

      {settingsQuery.isError ? (
        <Alert
          severity="error"
          sx={{
            maxWidth: 1080,
          }}
        >
          {errorMessage(settingsQuery.error)}
        </Alert>
      ) : null}

      {/* ====================================================
          FORM
          ==================================================== */}

      {general && !settingsQuery.isLoading && !settingsQuery.isError ? (
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            maxWidth: 1080,
          }}
        >
          {!canUpdate ? (
            <Alert
              severity="info"
              sx={{
                mb: 2,
              }}
            >
              You have read-only access to organisation settings.
            </Alert>
          ) : null}

          {validationError || updateMutation.isError ? (
            <Alert
              severity="error"
              sx={{
                mb: 2,
              }}
            >
              {validationError ?? errorMessage(updateMutation.error)}
            </Alert>
          ) : null}

          {/* ================================================
              ORGANISATION
              ================================================ */}

          <Paper
            elevation={0}
            sx={{
              p: {
                xs: 2,
                sm: 3,
              },

              border: "1px solid",

              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                mb: 3,

                display: "flex",

                alignItems: "center",

                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,

                  display: "grid",

                  placeItems: "center",

                  borderRadius: 2,

                  color: "primary.main",

                  bgcolor: "action.hover",
                }}
              >
                <SettingsRounded />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontWeight: 850,

                    fontSize: 16,
                  }}
                >
                  Organisation
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,

                    color: "text.secondary",

                    fontSize: 11.5,
                  }}
                >
                  Core tenant identity used throughout the platform.
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  md: "repeat(2, minmax(0, 1fr))",
                },

                gap: 2,
              }}
            >
              <TextField
                required

                label="Organisation name"

                value={form.name}

                disabled={!canUpdate || updateMutation.isPending}

                onChange={(event) => updateField("name", event.target.value)}

                helperText="The organisation name shown throughout the platform."

                slotProps={{
                  htmlInput: {
                    maxLength: 200,
                  },
                }}
              />

              <TextField
                required

                label="Timezone"

                value={form.timezone}

                disabled={!canUpdate || updateMutation.isPending}

                onChange={(event) =>
                  updateField("timezone", event.target.value)
                }

                helperText="For example Africa/Nairobi, Europe/London or UTC."

                slotProps={{
                  htmlInput: {
                    maxLength: 64,
                  },
                }}
              />
            </Box>
          </Paper>

          {/* ================================================
              REGIONAL PREFERENCES
              ================================================ */}

          <Paper
            elevation={0}
            sx={{
              mt: 2,

              p: {
                xs: 2,
                sm: 3,
              },

              border: "1px solid",

              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                mb: 3,

                display: "flex",

                alignItems: "center",

                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,

                  display: "grid",

                  placeItems: "center",

                  borderRadius: 2,

                  color: "primary.main",

                  bgcolor: "action.hover",
                }}
              >
                <PublicRounded />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontWeight: 850,

                    fontSize: 16,
                  }}
                >
                  Regional preferences
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,

                    color: "text.secondary",

                    fontSize: 11.5,
                  }}
                >
                  Control how dates, times and calendars are presented.
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  md: "repeat(2, minmax(0, 1fr))",
                },

                gap: 2,
              }}
            >
              <TextField
                required

                label="Locale"

                value={form.locale}

                disabled={!canUpdate || updateMutation.isPending}

                onChange={(event) => updateField("locale", event.target.value)}

                helperText="For example en, en-GB or sw-KE."

                slotProps={{
                  htmlInput: {
                    maxLength: 35,
                  },
                }}
              />

              <TextField
                select

                label="Date format"

                value={form.dateFormat}

                disabled={!canUpdate || updateMutation.isPending}

                onChange={(event) =>
                  updateField(
                    "dateFormat",
                    event.target.value as SettingsDateFormat,
                  )
                }
              >
                <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>

                <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>

                <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
              </TextField>

              <TextField
                select

                label="Time format"

                value={form.timeFormat}

                disabled={!canUpdate || updateMutation.isPending}

                onChange={(event) =>
                  updateField(
                    "timeFormat",
                    event.target.value as SettingsTimeFormat,
                  )
                }
              >
                <MenuItem value="24h">24-hour</MenuItem>

                <MenuItem value="12h">12-hour</MenuItem>
              </TextField>

              <TextField
                select

                label="Week starts on"

                value={form.weekStartDay}

                disabled={!canUpdate || updateMutation.isPending}

                onChange={(event) =>
                  updateField(
                    "weekStartDay",
                    event.target.value as SettingsWeekStartDay,
                  )
                }
              >
                {WEEK_DAYS.map((day) => (
                  <MenuItem
                    key={day.value}

                    value={day.value}
                  >
                    {day.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Paper>

          {/* ================================================
              ACTIONS
              ================================================ */}

          <Box
            sx={{
              mt: 2,

              display: "flex",

              justifyContent: "flex-end",

              gap: 1,

              flexWrap: "wrap",
            }}
          >
            <Button
              type="button"

              startIcon={<RestartAltRounded />}

              disabled={!canUpdate || !hasChanges || updateMutation.isPending}

              onClick={resetForm}
            >
              Reset
            </Button>

            <Button
              type="submit"

              variant="contained"

              startIcon={<SaveRounded />}

              disabled={!canUpdate || !hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save settings"}
            </Button>
          </Box>
        </Box>
      ) : null}

      {tenantId && profile ? (
        <OrganisationProfilePanel
          key={profile.updatedAt}
          tenantId={tenantId}
          profile={profile}
          canUpdate={canUpdate}
        />
      ) : null}

      {/* ====================================================
          ACCOUNT SECURITY
          ==================================================== */}

      <Paper
        elevation={0}
        sx={{
          mt: 3,

          p: {
            xs: 2,
            sm: 3,
          },

          maxWidth: 1080,

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "flex",

            flexDirection: {
              xs: "column",
              sm: "row",
            },

            justifyContent: "space-between",

            gap: 2,

            alignItems: {
              xs: "flex-start",
              sm: "center",
            },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 850,

                fontSize: 16,
              }}
            >
              Account security
            </Typography>

            <Typography
              sx={{
                mt: 0.5,

                color: "text.secondary",

                fontSize: 11.5,
              }}
            >
              Manage your own password and, where authorised, organisation user
              access.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",

              gap: 1,

              flexWrap: "wrap",
            }}
          >
            <Button
              variant="outlined"
              startIcon={<LockResetRounded />}
              onClick={() => navigate("/change-password")}
            >
              Change password
            </Button>

            {canReadUsers ? (
              <Button
                variant="outlined"
                startIcon={<ManageAccountsRounded />}
                onClick={() =>
                  navigate(
                    tenantMembership
                      ? buildTenantPath(tenantMembership.slug, "users-access")
                      : "/users-access",
                  )
                }
              >
                Users &amp; access
              </Button>
            ) : null}
          </Box>
        </Box>
      </Paper>

      {/* ====================================================
          SUCCESS
          ==================================================== */}

      <Snackbar
        open={successMessage !== null}

        autoHideDuration={3500}

        onClose={() => setSuccessMessage(null)}

        anchorOrigin={{
          vertical: "bottom",

          horizontal: "right",
        }}
      >
        <Alert
          severity="success"

          variant="filled"

          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
