import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

import { LinkOffRounded, SmartphoneRounded } from "@mui/icons-material";

import type {
  Guardian,
  GuardianParentAppAccessResult,
  SetGuardianParentAppAccessInput,
} from "./guardians.api";

interface GuardianParentAppAccessDialogProps {
  open: boolean;

  guardian: Guardian | null;

  onClose: () => void;

  onSubmit: (
    input: SetGuardianParentAppAccessInput,
  ) => Promise<GuardianParentAppAccessResult>;
}

export function GuardianParentAppAccessDialog({
  open,
  guardian,
  onClose,
  onSubmit,
}: GuardianParentAppAccessDialogProps) {
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [confirmTemporaryPassword, setConfirmTemporaryPassword] = useState("");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const enabled = guardian?.userId !== null && guardian?.userId !== undefined;

  function close(): void {
    if (submitting) {
      return;
    }

    setError("");

    setTemporaryPassword("");

    setConfirmTemporaryPassword("");

    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!guardian) {
      setError("No Guardian was selected.");

      return;
    }

    if (!enabled) {
      if (!guardian.email) {
        setError(
          "Add an email address to the Guardian profile before enabling Parent App access.",
        );

        return;
      }

      if (temporaryPassword.length < 12) {
        setError("Temporary password must contain at least 12 characters.");

        return;
      }

      if (temporaryPassword.length > 128) {
        setError("Temporary password must not exceed 128 characters.");

        return;
      }

      if (temporaryPassword !== confirmTemporaryPassword) {
        setError("Temporary password and confirmation do not match.");

        return;
      }
    }

    setSubmitting(true);

    setError("");

    try {
      await onSubmit(
        enabled
          ? {
              enabled: false,
            }
          : {
              enabled: true,

              temporaryPassword,
            },
      );

      close();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Parent App access could not be changed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            display: "flex",

            alignItems: "center",

            gap: 1.25,

            fontWeight: 850,
          }}
        >
          {enabled ? <LinkOffRounded /> : <SmartphoneRounded />}

          {enabled ? "Remove Parent App access" : "Give Parent App access"}
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 12.5,

              lineHeight: 1.7,
            }}
          >
            {guardian
              ? `${guardian.firstName} ${guardian.lastName} · ${guardian.email ?? "No email"}`
              : ""}
          </Typography>

          {enabled ? (
            <>
              <Alert
                severity="warning"
                sx={{
                  mt: 2,
                }}
              >
                This removes the Guardian-to-login link for this organisation.
              </Alert>

              <Typography
                sx={{
                  mt: 2,

                  color: "text.secondary",

                  fontSize: 12.5,

                  lineHeight: 1.7,
                }}
              >
                If this person has only a Parent membership here, that
                membership will be suspended. If they also work for the
                organisation as Staff, Driver, Dispatcher, Transport Manager,
                Administrator or Owner, their existing work access is preserved.
              </Typography>
            </>
          ) : (
            <>
              {!guardian?.email ? (
                <Alert
                  severity="warning"
                  sx={{
                    mt: 2,
                  }}
                >
                  This Guardian has no email address. Edit the Guardian profile
                  and add an email before enabling Parent App access.
                </Alert>
              ) : (
                <>
                  <Alert
                    severity="info"
                    sx={{
                      mt: 2,
                    }}
                  >
                    If this email already belongs to an existing account, that
                    account will be linked and its current password will be
                    preserved.
                  </Alert>

                  <Typography
                    sx={{
                      mt: 2,

                      color: "text.secondary",

                      fontSize: 12,

                      lineHeight: 1.65,
                    }}
                  >
                    Enter a temporary password in case this is a new global
                    account. New accounts must change it at first login.
                    Existing accounts ignore the temporary password.
                  </Typography>

                  <TextField
                    label="Temporary password"
                    type="password"
                    value={temporaryPassword}
                    onChange={(event) => {
                      setTemporaryPassword(event.target.value);

                      setError("");
                    }}
                    autoComplete="new-password"
                    required
                    fullWidth
                    helperText="Minimum 12 characters"
                    slotProps={{
                      htmlInput: {
                        minLength: 12,
                        maxLength: 128,
                      },
                    }}
                    sx={{
                      mt: 2,
                    }}
                  />

                  <TextField
                    label="Confirm temporary password"
                    type="password"
                    value={confirmTemporaryPassword}
                    onChange={(event) => {
                      setConfirmTemporaryPassword(event.target.value);

                      setError("");
                    }}
                    autoComplete="new-password"
                    required
                    fullWidth
                    slotProps={{
                      htmlInput: {
                        minLength: 12,
                        maxLength: 128,
                      },
                    }}
                    sx={{
                      mt: 2,
                    }}
                  />
                </>
              )}
            </>
          )}

          {error ? (
            <Alert
              severity="error"
              sx={{
                mt: 2,
              }}
            >
              {error}
            </Alert>
          ) : null}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,

            pb: 3,
          }}
        >
          <Button type="button" onClick={close} disabled={submitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            color={enabled ? "warning" : "primary"}
            disabled={submitting || (!enabled && !guardian?.email)}
            startIcon={enabled ? <LinkOffRounded /> : <SmartphoneRounded />}
          >
            {submitting
              ? "Saving..."
              : enabled
                ? "Remove access"
                : "Enable Parent App"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
