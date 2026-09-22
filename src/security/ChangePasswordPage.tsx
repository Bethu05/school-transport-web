import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import {
  ArrowBackRounded,
  DirectionsBusRounded,
  LockResetRounded,
  LogoutRounded,
  VerifiedUserRounded,
} from "@mui/icons-material";

import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";

import { changePassword } from "../auth/auth.api";

export function ChangePasswordPage() {
  const {
    authenticated,
    loading,
    passwordChangeRequired,
    isSuperAdmin,
    access,
    user,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return null;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  function returnDestination(): string {
    if (isSuperAdmin) {
      return "/platform";
    }

    if (access && !access.operational) {
      return "/account-status";
    }

    return "/dashboard";
  }

  function handleLogout(): void {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError("");

    if (newPassword.length < 12) {
      setError("New password must contain at least 12 characters.");

      return;
    }

    if (newPassword.length > 128) {
      setError("New password must not exceed 128 characters.");

      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");

      return;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.");

      return;
    }

    setSubmitting(true);

    try {
      await changePassword({
        currentPassword,

        newPassword,
      });

      /**
       * The backend has revoked all refresh sessions.
       *
       * Clear this browser's access JWT as well and require a clean
       * login using the new credential.
       */
      logout();

      navigate("/login?passwordChanged=1", {
        replace: true,
      });
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Password could not be changed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",

        display: "flex",

        alignItems: "center",

        py: {
          xs: 3,
          md: 6,
        },

        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            overflow: "hidden",

            border: "1px solid",

            borderColor: "divider",

            borderRadius: 4,
          }}
        >
          <Box
            sx={{
              px: {
                xs: 3,
                sm: 5,
              },

              pt: {
                xs: 4,
                sm: 5,
              },

              pb: 4,
            }}
          >
            <Box
              sx={{
                display: "flex",

                alignItems: "center",

                gap: 1.25,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,

                  display: "grid",

                  placeItems: "center",

                  borderRadius: 2,

                  bgcolor: "primary.main",

                  color: "primary.contrastText",
                }}
              >
                <DirectionsBusRounded />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize: 14,

                    fontWeight: 900,
                  }}
                >
                  School Transport
                </Typography>

                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 10,
                  }}
                >
                  Account security
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 5,

                width: 56,
                height: 56,

                display: "grid",

                placeItems: "center",

                borderRadius: 3,

                bgcolor: "action.hover",

                color: "primary.main",
              }}
            >
              {passwordChangeRequired ? (
                <VerifiedUserRounded
                  sx={{
                    fontSize: 30,
                  }}
                />
              ) : (
                <LockResetRounded
                  sx={{
                    fontSize: 30,
                  }}
                />
              )}
            </Box>

            <Typography
              component="h1"
              sx={{
                mt: 2.5,

                fontSize: {
                  xs: 30,
                  sm: 36,
                },

                fontWeight: 900,

                letterSpacing: "-0.04em",
              }}
            >
              {passwordChangeRequired
                ? "Choose a new password"
                : "Change your password"}
            </Typography>

            <Typography
              sx={{
                mt: 1,

                color: "text.secondary",

                fontSize: 13,

                lineHeight: 1.7,
              }}
            >
              {passwordChangeRequired
                ? "Your administrator issued a temporary password. Replace it before continuing into the platform."
                : "Update the password used to sign in to your account."}
            </Typography>

            <Typography
              sx={{
                mt: 1,

                color: "text.disabled",

                fontSize: 10.5,
              }}
            >
              Signed in as {user?.email}
            </Typography>

            {passwordChangeRequired ? (
              <Alert
                severity="warning"
                sx={{
                  mt: 3,
                }}
              >
                Normal platform access is disabled until this temporary password
                is replaced.
              </Alert>
            ) : null}

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{
                mt: 4,

                display: "grid",

                gap: 2,
              }}
            >
              <TextField
                label={
                  passwordChangeRequired
                    ? "Temporary password"
                    : "Current password"
                }
                type="password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);

                  setError("");
                }}
                autoComplete="current-password"
                required
                fullWidth
              />

              <TextField
                label="New password"
                type="password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);

                  setError("");
                }}
                autoComplete="new-password"
                helperText="Minimum 12 characters"
                slotProps={{
                  htmlInput: {
                    minLength: 12,
                    maxLength: 128,
                  },
                }}
                required
                fullWidth
              />

              <TextField
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);

                  setError("");
                }}
                autoComplete="new-password"
                slotProps={{
                  htmlInput: {
                    minLength: 12,
                    maxLength: 128,
                  },
                }}
                required
                fullWidth
              />

              {error ? <Alert severity="error">{error}</Alert> : null}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={submitting}
                startIcon={
                  submitting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <LockResetRounded />
                  )
                }
              >
                {submitting ? "Changing password..." : "Change password"}
              </Button>

              <Box
                sx={{
                  display: "flex",

                  justifyContent: "space-between",

                  gap: 1,

                  flexWrap: "wrap",
                }}
              >
                {!passwordChangeRequired ? (
                  <Button
                    type="button"
                    color="inherit"
                    startIcon={<ArrowBackRounded />}
                    onClick={() => navigate(returnDestination())}
                  >
                    Back
                  </Button>
                ) : (
                  <Box />
                )}

                <Button
                  type="button"
                  color="inherit"
                  startIcon={<LogoutRounded />}
                  onClick={handleLogout}
                >
                  Sign out
                </Button>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              px: 3,

              py: 2,

              bgcolor: "#101828",

              color: "rgba(255,255,255,0.48)",

              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 9.5,
              }}
            >
              © sirb-Technologies 2026
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
