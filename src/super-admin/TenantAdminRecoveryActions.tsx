import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { LockResetRounded } from "@mui/icons-material";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  getPlatformTenantOnboardingStatus,
  resetPlatformTenantAdminPassword,
  type PlatformTenantListItem,
} from "./platform.api";

interface TenantAdminRecoveryActionsProps {
  tenant: PlatformTenantListItem;
}

export function TenantAdminRecoveryActions({
  tenant,
}: TenantAdminRecoveryActionsProps) {
  const [open, setOpen] = useState(false);

  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onboardingQuery = useQuery({
    queryKey: ["platform", "tenant", tenant.id, "onboarding"],

    queryFn: () => getPlatformTenantOnboardingStatus(tenant.id),
  });

  const admin = onboardingQuery.data?.initialAdmin ?? null;

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!admin) {
        throw new Error("This tenant does not have an initial administrator.");
      }

      if (temporaryPassword.length < 12) {
        throw new Error(
          "Temporary password must contain at least 12 characters.",
        );
      }

      if (temporaryPassword !== confirmPassword) {
        throw new Error("Temporary password and confirmation do not match.");
      }

      await resetPlatformTenantAdminPassword(tenant.id, admin.userId, {
        temporaryPassword,
      });
    },

    onSuccess: () => {
      setSuccessMessage(
        "Password reset. Give the temporary password to the administrator securely. They will be forced to choose a new password at next sign-in.",
      );

      setOpen(false);
    },
  });

  function close(): void {
    if (resetMutation.isPending) {
      return;
    }

    setOpen(false);

    setTemporaryPassword("");

    setConfirmPassword("");
  }

  return (
    <Box>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        Administrator access
      </Typography>

      <Typography
        sx={{
          mt: 0.5,
          color: "text.secondary",
          fontSize: 10,
          lineHeight: 1.5,
        }}
      >
        Emergency account recovery until self-service email reset is introduced.
      </Typography>

      <Stack
        spacing={1.5}
        sx={{
          mt: 2,
        }}
      >
        {onboardingQuery.isLoading ? <CircularProgress size={20} /> : null}

        {onboardingQuery.isError ? (
          <Alert severity="error">
            {onboardingQuery.error instanceof Error
              ? onboardingQuery.error.message
              : "Unable to load administrator"}
          </Alert>
        ) : null}

        {admin ? (
          <>
            <Box>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {admin.firstName} {admin.lastName}
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,
                  color: "text.secondary",
                  fontSize: 10,
                  wordBreak: "break-word",
                }}
              >
                {admin.email}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              startIcon={<LockResetRounded />}
              onClick={() => {
                setSuccessMessage(null);

                setOpen(true);
              }}
              fullWidth
            >
              Reset admin password
            </Button>
          </>
        ) : !onboardingQuery.isLoading ? (
          <Alert severity="info">
            No initial administrator has been configured yet.
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert severity="success">{successMessage}</Alert>
        ) : null}
      </Stack>

      <Dialog
        open={open}
        onClose={resetMutation.isPending ? undefined : close}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reset administrator password</DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{
              pt: 1,
            }}
          >
            <Alert severity="warning">
              This replaces the user's global login password and signs out
              existing refresh sessions. The administrator must change the
              temporary password after signing in.
            </Alert>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Give the temporary password to the customer through a separate
              secure channel. Do not send it in the same message as their
              username.
            </Typography>

            <TextField
              label="Temporary password"
              type="password"
              value={temporaryPassword}
              onChange={(event) => {
                setTemporaryPassword(event.target.value);
              }}
              helperText="Minimum 12 characters"
              autoComplete="new-password"
              fullWidth
            />

            <TextField
              label="Confirm temporary password"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
              }}
              autoComplete="new-password"
              fullWidth
            />

            {resetMutation.isError ? (
              <Alert severity="error">
                {resetMutation.error instanceof Error
                  ? resetMutation.error.message
                  : "Password reset failed"}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button disabled={resetMutation.isPending} onClick={close}>
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={
              resetMutation.isPending ||
              temporaryPassword.length < 12 ||
              temporaryPassword !== confirmPassword
            }
            onClick={() => resetMutation.mutate()}
          >
            {resetMutation.isPending ? "Resetting..." : "Reset password"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
