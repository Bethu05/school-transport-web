import { useState, type FormEvent } from "react";

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

import { LockResetRounded } from "@mui/icons-material";

import type { TenantUser } from "./users.api";

interface ResetUserPasswordDialogProps {
  open: boolean;

  user: TenantUser | null;

  onClose: () => void;

  onReset: (temporaryPassword: string) => Promise<void>;
}

export function ResetUserPasswordDialog({
  open,
  user,
  onClose,
  onReset,
}: ResetUserPasswordDialogProps) {
  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  function close(): void {
    if (submitting) {
      return;
    }

    setTemporaryPassword("");

    setConfirmPassword("");

    setError("");

    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError("");

    if (!user) {
      setError("No user was selected.");

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

    if (temporaryPassword !== confirmPassword) {
      setError("Temporary password and confirmation do not match.");

      return;
    }

    setSubmitting(true);

    try {
      await onReset(temporaryPassword);

      setTemporaryPassword("");

      setConfirmPassword("");

      onClose();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Password could not be reset.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <BoxForm onSubmit={handleSubmit}>
        <DialogTitle>Reset user password</DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 12.5,

              lineHeight: 1.65,
            }}
          >
            Set a temporary password for {user?.email ?? "this user"}. Existing
            refresh sessions will be revoked and the user will be required to
            choose a new permanent password after signing in.
          </Typography>

          <Alert
            severity="warning"
            sx={{
              mt: 2,
            }}
          >
            Communicate the temporary password securely. Do not send permanent
            passwords by email.
          </Alert>

          <TextField
            label="Temporary password"
            type="password"
            value={temporaryPassword}
            onChange={(event) => {
              setTemporaryPassword(event.target.value);

              setError("");
            }}
            helperText="Minimum 12 characters"
            slotProps={{
              htmlInput: {
                minLength: 12,
                maxLength: 128,
              },
            }}
            autoComplete="new-password"
            required
            fullWidth
            sx={{
              mt: 3,
            }}
          />

          <TextField
            label="Confirm temporary password"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);

              setError("");
            }}
            slotProps={{
              htmlInput: {
                minLength: 12,
                maxLength: 128,
              },
            }}
            autoComplete="new-password"
            required
            fullWidth
            sx={{
              mt: 2,
            }}
          />

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

        <DialogActions>
          <Button type="button" onClick={close} disabled={submitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            startIcon={<LockResetRounded />}
            disabled={submitting}
          >
            {submitting ? "Resetting..." : "Set temporary password"}
          </Button>
        </DialogActions>
      </BoxForm>
    </Dialog>
  );
}

/**
 * Small semantic form wrapper avoids placing form behaviour on the
 * MUI Dialog itself.
 */
function BoxForm({
  children,
  onSubmit,
}: {
  children: React.ReactNode;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <form onSubmit={onSubmit}>{children}</form>;
}
