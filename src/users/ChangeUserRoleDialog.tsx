import { useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import { ManageAccountsRounded } from "@mui/icons-material";

import type { TenantAssignableUserRole, TenantUser } from "./users.api";

const ROLE_OPTIONS: Array<{
  value: TenantAssignableUserRole;
  label: string;
}> = [
  {
    value: "admin",
    label: "Administrator",
  },

  {
    value: "transport_manager",
    label: "Transport Manager",
  },

  {
    value: "dispatcher",
    label: "Dispatcher",
  },

  {
    value: "staff",
    label: "Staff",
  },
];

interface ChangeUserRoleDialogProps {
  open: boolean;

  user: TenantUser | null;

  onClose: () => void;

  onSubmit: (role: TenantAssignableUserRole) => Promise<void>;
}

export function ChangeUserRoleDialog({
  open,
  user,
  onClose,
  onSubmit,
}: ChangeUserRoleDialogProps) {
  const initialRole = ROLE_OPTIONS.some((option) => option.value === user?.role)
    ? (user?.role as TenantAssignableUserRole)
    : "staff";

  const [role, setRole] = useState<TenantAssignableUserRole>(initialRole);

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

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

    if (!user) {
      setError("No user was selected.");

      return;
    }

    setSubmitting(true);

    setError("");

    try {
      await onSubmit(role);

      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Role could not be changed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>Change role</DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 12.5,

              lineHeight: 1.65,
            }}
          >
            Update the role for {user?.email ?? "this user"} in this
            organisation only.
          </Typography>

          <TextField
            select
            label="Role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as TenantAssignableUserRole);

              setError("");
            }}
            fullWidth
            sx={{
              mt: 3,
            }}
          >
            {ROLE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

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
            startIcon={<ManageAccountsRounded />}
            disabled={submitting || role === user?.role}
          >
            {submitting ? "Saving..." : "Save role"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
