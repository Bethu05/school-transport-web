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

interface GuardianFormDialogProps {
  open: boolean;

  guardian: Guardian | null;

  submitting: boolean;

  error: string | null;

  onClose: () => void;

  onSubmit: (input: CreateGuardianInput | UpdateGuardianInput) => void;
}

interface GuardianForm {
  firstName: string;
  lastName: string;

  email: string;
  phone: string;

  notifyBoarded: boolean;
  notifyDroppedOff: boolean;
  notifyTripUpdates: boolean;
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
    field: "firstName" | "lastName" | "email" | "phone",
    value: string,
  ): void {
    setForm((current) => ({
      ...current,

      [field]: value,
    }));
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

    /*
     * The backend requires at least one contact method
     * unless a Guardian is linked directly to a user.
     *
     * User-account linking is deliberately not exposed
     * in this form yet.
     */
    if (!email && !phone) {
      setValidationError("Enter at least an email address or phone number.");

      return;
    }

    setValidationError(null);

    if (editing) {
      const input: UpdateGuardianInput = {
        firstName,
        lastName,

        /*
         * null explicitly clears an existing contact value.
         */
        email: email || null,

        phone: phone || null,

        notifyBoarded: form.notifyBoarded,

        notifyDroppedOff: form.notifyDroppedOff,

        notifyTripUpdates: form.notifyTripUpdates,
      };

      onSubmit(input);

      return;
    }

    const input: CreateGuardianInput = {
      firstName,
      lastName,

      email: email || undefined,

      phone: phone || undefined,

      notifyBoarded: form.notifyBoarded,

      notifyDroppedOff: form.notifyDroppedOff,

      notifyTripUpdates: form.notifyTripUpdates,
    };

    onSubmit(input);
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
          Keep the Guardian profile simple. Student relationships are managed
          separately.
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
        <Button
          disabled={submitting}

          onClick={onClose}
        >
          Cancel
        </Button>

        <Button
          variant="contained"

          disabled={submitting}

          onClick={submit}
        >
          {submitting ? "Saving..." : editing ? "Save changes" : "Add Guardian"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
