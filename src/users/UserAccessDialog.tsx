import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

import { CheckCircleRounded, PersonOffRounded } from "@mui/icons-material";

import type { TenantUser } from "./users.api";

export type UserAccessAction = "activate" | "deactivate";

interface UserAccessDialogProps {
  open: boolean;

  user: TenantUser | null;

  action: UserAccessAction;

  onClose: () => void;

  onConfirm: () => Promise<void>;
}

export function UserAccessDialog({
  open,
  user,
  action,
  onClose,
  onConfirm,
}: UserAccessDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const activating = action === "activate";

  function close(): void {
    if (submitting) {
      return;
    }

    setError("");

    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setSubmitting(true);

    setError("");

    try {
      await onConfirm();

      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : activating
            ? "Access could not be reactivated."
            : "Access could not be deactivated.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>
          {activating ? "Reactivate access" : "Deactivate access"}
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 12.5,

              lineHeight: 1.65,
            }}
          >
            {activating
              ? `Restore ${user?.email ?? "this user's"} access to this organisation?`
              : `Suspend ${user?.email ?? "this user's"} access to this organisation?`}
          </Typography>

          {!activating ? (
            <Alert
              severity="warning"
              sx={{
                mt: 2,
              }}
            >
              This affects only the selected school group. Access to any other
              organisations linked to the same global account is not changed.
            </Alert>
          ) : null}

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
            color={activating ? "primary" : "warning"}
            startIcon={
              activating ? <CheckCircleRounded /> : <PersonOffRounded />
            }
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : activating
                ? "Reactivate"
                : "Deactivate"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
