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

import { AddRounded, PersonAddRounded } from "@mui/icons-material";

import type {
  CreateTenantUserInput,
  TenantAssignableUserRole,
} from "./users.api";

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

interface CreateUserDialogProps {
  open: boolean;

  onClose: () => void;

  onSubmit: (input: CreateTenantUserInput) => Promise<void>;
}

export function CreateUserDialog({
  open,
  onClose,
  onSubmit,
}: CreateUserDialogProps) {
  const [email, setEmail] = useState("");

  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [role, setRole] = useState<TenantAssignableUserRole>("staff");

  const [temporaryPassword, setTemporaryPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  function resetForm(): void {
    setEmail("");

    setFirstName("");

    setLastName("");

    setRole("staff");

    setTemporaryPassword("");

    setConfirmPassword("");

    setError("");
  }

  function close(): void {
    if (submitting) {
      return;
    }

    resetForm();

    onClose();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError("");

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
      await onSubmit({
        email: email.trim(),

        firstName: firstName.trim(),

        lastName: lastName.trim(),

        role,

        temporaryPassword,
      });

      resetForm();

      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "User could not be added.",
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
          }}
        >
          <PersonAddRounded />
          Add user
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 12.5,

              lineHeight: 1.65,
            }}
          >
            Create access for a member of this organisation. If the email
            already belongs to an account in another school group, the existing
            account will be linked without changing its password.
          </Typography>

          <Alert
            severity="info"
            sx={{
              mt: 2,
            }}
          >
            The temporary password below is used only for a brand-new account.
            Existing account holders continue using their current password.
          </Alert>

          <TextField
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);

              setError("");
            }}
            autoComplete="off"
            required
            fullWidth
            sx={{
              mt: 3,
            }}
          />

          <Box
            sx={{
              mt: 2,

              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
              },

              gap: 2,
            }}
          >
            <TextField
              label="First name"
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value);

                setError("");
              }}
              slotProps={{
                htmlInput: {
                  maxLength: 100,
                },
              }}
              required
              fullWidth
            />

            <TextField
              label="Last name"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);

                setError("");
              }}
              slotProps={{
                htmlInput: {
                  maxLength: 100,
                },
              }}
              required
              fullWidth
            />
          </Box>

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
              mt: 2,
            }}
          >
            {ROLE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Temporary password"
            type="password"
            value={temporaryPassword}
            onChange={(event) => {
              setTemporaryPassword(event.target.value);

              setError("");
            }}
            helperText="Minimum 12 characters · used only for a new account"
            autoComplete="new-password"
            slotProps={{
              htmlInput: {
                minLength: 12,
                maxLength: 128,
              },
            }}
            required
            fullWidth
            sx={{
              mt: 2,
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
            autoComplete="new-password"
            slotProps={{
              htmlInput: {
                minLength: 12,
                maxLength: 128,
              },
            }}
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
            startIcon={<AddRounded />}
            disabled={submitting}
          >
            {submitting ? "Adding..." : "Add user"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
