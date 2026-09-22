import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import type {
  CreateGuardianInput,
  Guardian,
  UpdateGuardianInput,
} from "./guardians.api";

export interface GuardianFormSubmission {
  profile: CreateGuardianInput | UpdateGuardianInput;

  /**
   * Used only while creating a Guardian.
   *
   * Existing Guardian Parent App access is managed by the
   * dedicated access workflow.
   */
  giveParentAppAccess: boolean;

  temporaryPassword?: string;
}

interface GuardianFormDialogProps {
  open: boolean;

  guardian: Guardian | null;

  submitting: boolean;

  error: string | null;

  onClose: () => void;

  onSubmit: (input: GuardianFormSubmission) => void;
}

interface GuardianForm {
  firstName: string;

  lastName: string;

  email: string;

  phone: string;

  notifyBoarded: boolean;

  notifyDroppedOff: boolean;

  notifyTripUpdates: boolean;

  giveParentAppAccess: boolean;

  temporaryPassword: string;

  confirmTemporaryPassword: string;
}

function initialForm(guardian: Guardian | null): GuardianForm {
  if (!guardian) {
    return {
      firstName: "",

      lastName: "",

      email: "",

      phone: "",

      notifyBoarded: true,

      notifyDroppedOff: true,

      notifyTripUpdates: true,

      giveParentAppAccess: false,

      temporaryPassword: "",

      confirmTemporaryPassword: "",
    };
  }

  return {
    firstName: guardian.firstName,

    lastName: guardian.lastName,

    email: guardian.email ?? "",

    phone: guardian.phone ?? "",

    notifyBoarded: guardian.notifyBoarded,

    notifyDroppedOff: guardian.notifyDroppedOff,

    notifyTripUpdates: guardian.notifyTripUpdates,

    giveParentAppAccess: guardian.userId !== null,

    temporaryPassword: "",

    confirmTemporaryPassword: "",
  };
}

export function GuardianFormDialog({
  open,
  guardian,
  submitting,
  error,
  onClose,
  onSubmit,
}: GuardianFormDialogProps) {
  const [form, setForm] = useState<GuardianForm>(() => initialForm(guardian));

  const [validationError, setValidationError] = useState<string | null>(null);

  const editing = Boolean(guardian);

  function updateText(
    field:
      | "firstName"
      | "lastName"
      | "email"
      | "phone"
      | "temporaryPassword"
      | "confirmTemporaryPassword",
    value: string,
  ): void {
    setForm((current) => ({
      ...current,

      [field]: value,
    }));

    setValidationError(null);
  }

  function submit(): void {
    const firstName = form.firstName.trim();

    const lastName = form.lastName.trim();

    const email = form.email.trim();

    const phone = form.phone.trim();

    if (!firstName) {
      setValidationError("First name is required.");

      return;
    }

    if (!lastName) {
      setValidationError("Last name is required.");

      return;
    }

    if (!email && !phone) {
      setValidationError("Enter at least an email address or phone number.");

      return;
    }

    if (!editing && form.giveParentAppAccess) {
      if (!email) {
        setValidationError(
          "An email address is required for Parent App access.",
        );

        return;
      }

      if (form.temporaryPassword.length < 12) {
        setValidationError(
          "Temporary password must contain at least 12 characters.",
        );

        return;
      }

      if (form.temporaryPassword.length > 128) {
        setValidationError(
          "Temporary password must not exceed 128 characters.",
        );

        return;
      }

      if (form.temporaryPassword !== form.confirmTemporaryPassword) {
        setValidationError("Temporary password and confirmation do not match.");

        return;
      }
    }

    setValidationError(null);

    if (editing) {
      const profile: UpdateGuardianInput = {
        firstName,

        lastName,

        email: email || null,

        phone: phone || null,

        notifyBoarded: form.notifyBoarded,

        notifyDroppedOff: form.notifyDroppedOff,

        notifyTripUpdates: form.notifyTripUpdates,
      };

      onSubmit({
        profile,

        giveParentAppAccess: guardian?.userId !== null,
      });

      return;
    }

    const profile: CreateGuardianInput = {
      firstName,

      lastName,

      email: email || undefined,

      phone: phone || undefined,

      notifyBoarded: form.notifyBoarded,

      notifyDroppedOff: form.notifyDroppedOff,

      notifyTripUpdates: form.notifyTripUpdates,
    };

    onSubmit({
      profile,

      giveParentAppAccess: form.giveParentAppAccess,

      ...(form.giveParentAppAccess
        ? {
            temporaryPassword: form.temporaryPassword,
          }
        : {}),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle
        sx={{
          fontWeight: 850,
        }}
      >
        {editing ? "Edit Guardian" : "Add Guardian"}
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{
            mb: 2.5,

            color: "text.secondary",

            fontSize: 12.5,
          }}
        >
          Guardian profiles and login accounts are deliberately separate.
          Student relationships are managed independently.
        </Typography>

        {validationError ? (
          <Alert
            severity="warning"
            sx={{
              mb: 2,
            }}
          >
            {validationError}
          </Alert>
        ) : null}

        {error ? (
          <Alert
            severity="error"
            sx={{
              mb: 2,
            }}
          >
            {error}
          </Alert>
        ) : null}

        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",

              sm: "1fr 1fr",
            },

            gap: 2,
          }}
        >
          <TextField
            required
            label="First name"
            value={form.firstName}
            onChange={(event) => updateText("firstName", event.target.value)}
            slotProps={{
              htmlInput: {
                maxLength: 100,
              },
            }}
          />

          <TextField
            required
            label="Last name"
            value={form.lastName}
            onChange={(event) => updateText("lastName", event.target.value)}
            slotProps={{
              htmlInput: {
                maxLength: 100,
              },
            }}
          />

          <TextField
            type="email"
            label="Email"
            value={form.email}
            onChange={(event) => updateText("email", event.target.value)}
            placeholder="parent@example.com"
            slotProps={{
              htmlInput: {
                maxLength: 320,
              },
            }}
          />

          <TextField
            label="Phone"
            value={form.phone}
            onChange={(event) => updateText("phone", event.target.value)}
            placeholder="+254..."
            slotProps={{
              htmlInput: {
                maxLength: 50,
              },
            }}
          />
        </Box>

        {!editing ? (
          <Box
            sx={{
              mt: 3,

              p: 2,

              border: "1px solid",

              borderColor: form.giveParentAppAccess
                ? "primary.main"
                : "divider",

              borderRadius: 2.5,

              bgcolor: "action.hover",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={form.giveParentAppAccess}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,

                      giveParentAppAccess: event.target.checked,
                    }));

                    setValidationError(null);
                  }}
                />
              }
              label="Give Parent App access"
            />

            <Typography
              sx={{
                mt: 0.5,

                color: "text.secondary",

                fontSize: 11.5,

                lineHeight: 1.6,
              }}
            >
              Creates or links a secure login account for this parent. An
              existing global account keeps its existing password.
            </Typography>

            {form.giveParentAppAccess ? (
              <>
                <Alert
                  severity="info"
                  sx={{
                    mt: 2,
                  }}
                >
                  Enter a temporary password in case this is a new account. If
                  the email already belongs to an existing account, the
                  temporary password will not replace it.
                </Alert>

                <TextField
                  label="Temporary password"
                  type="password"
                  value={form.temporaryPassword}
                  onChange={(event) =>
                    updateText("temporaryPassword", event.target.value)
                  }
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
                  value={form.confirmTemporaryPassword}
                  onChange={(event) =>
                    updateText("confirmTemporaryPassword", event.target.value)
                  }
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
            ) : null}
          </Box>
        ) : (
          <Alert
            severity={guardian?.userId ? "success" : "info"}
            sx={{
              mt: 3,
            }}
          >
            {guardian?.userId
              ? "Parent App access is currently enabled. Use the Parent App action on the Guardian list to remove or manage access."
              : "Parent App access is not enabled. Use the Parent App action on the Guardian list to enable it."}
          </Alert>
        )}

        <Box
          sx={{
            mt: 3,

            p: 2,

            borderRadius: 2.5,

            bgcolor: "action.hover",
          }}
        >
          <Typography
            sx={{
              mb: 1,

              fontSize: 12,

              fontWeight: 850,
            }}
          >
            Transport notifications
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={form.notifyBoarded}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    notifyBoarded: event.target.checked,
                  }))
                }
              />
            }
            label="Notify when student boards"
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.notifyDroppedOff}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    notifyDroppedOff: event.target.checked,
                  }))
                }
              />
            }
            label="Notify when student is dropped off"
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.notifyTripUpdates}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    notifyTripUpdates: event.target.checked,
                  }))
                }
              />
            }
            label="Receive trip updates"
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,

          pb: 3,
        }}
      >
        <Button disabled={submitting} onClick={onClose}>
          Cancel
        </Button>

        <Button variant="contained" disabled={submitting} onClick={submit}>
          {submitting ? "Saving..." : editing ? "Save changes" : "Add Guardian"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
