import {
  useState,
  type FormEvent,
} from 'react';

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
} from '@mui/material';

import type {
  CreateIncidentInput,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  UpdateIncidentInput,
} from './incidents.api';

interface IncidentFormDialogProps {
  open:
    boolean;

  incident:
    | Incident
    | null;

  saving:
    boolean;

  error:
    | string
    | null;

  canUpdate:
    boolean;

  onClose:
    () => void;

  onSubmit: (
    input:
      | CreateIncidentInput
      | UpdateIncidentInput,
  ) => Promise<void>;
}

interface FormState {
  severity:
    IncidentSeverity;

  type:
    string;

  description:
    string;

  status:
    IncidentStatus;
}

function createState(
  incident:
    | Incident
    | null,
): FormState {
  return {
    severity:
      incident?.severity ??
      'medium',

    type:
      incident?.type ??
      '',

    description:
      incident?.description ??
      '',

    status:
      incident?.status ??
      'open',
  };
}

export function IncidentFormDialog({
  open,
  incident,
  saving,
  error,
  canUpdate,
  onClose,
  onSubmit,
}: IncidentFormDialogProps) {
  const editing =
    incident !==
    null;

  const [
    form,
    setForm,
  ] =
    useState<FormState>(
      () =>
        createState(
          incident,
        ),
    );

  const [
    validationError,
    setValidationError,
  ] =
    useState<
      string | null
    >(null);

  function updateField<
    K extends keyof FormState,
  >(
    key:
      K,
    value:
      FormState[K],
  ): void {
    setForm(
      (
        current,
      ) => ({
        ...current,

        [key]:
          value,
      }),
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setValidationError(
      null,
    );

    const type =
      form.type.trim();

    const description =
      form.description.trim();

    if (!type) {
      setValidationError(
        'Incident type is required.',
      );

      return;
    }

    if (!description) {
      setValidationError(
        'Description is required.',
      );

      return;
    }

    if (editing) {
      if (!canUpdate) {
        return;
      }

      await onSubmit({
        severity:
          form.severity,

        type,

        description,

        status:
          form.status,
      });

      return;
    }

    await onSubmit({
      severity:
        form.severity,

      type,

      description,
    });
  }

  return (
    <Dialog
      open={
        open
      }
      onClose={
        saving
          ? undefined
          : onClose
      }
      fullWidth
      maxWidth="sm"
    >
      <Box
        component="form"
        onSubmit={
          handleSubmit
        }
      >
        <DialogTitle
          sx={{
            fontWeight:
              850,
          }}
        >
          {editing
            ? 'Edit incident'
            : 'Report incident'}
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              mb:
                2.5,

              color:
                'text.secondary',

              fontSize:
                13,

              lineHeight:
                1.6,
            }}
          >
            {editing
              ? 'Update the incident details or lifecycle status.'
              : 'Report a safety or operational incident. The incident will initially be Open.'}
          </Typography>

          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                sm:
                  'repeat(2, minmax(0, 1fr))',
              },

              gap:
                2,
            }}
          >
            {validationError ||
            error ? (
              <Alert
                severity="error"
                sx={{
                  gridColumn:
                    '1 / -1',
                }}
              >
                {validationError ??
                  error}
              </Alert>
            ) : null}

            <TextField
              select
              required
              label="Severity"
              value={
                form.severity
              }
              onChange={(
                event,
              ) =>
                updateField(
                  'severity',
                  event.target
                    .value as
                    IncidentSeverity,
                )
              }
            >
              <MenuItem value="low">
                Low
              </MenuItem>

              <MenuItem value="medium">
                Medium
              </MenuItem>

              <MenuItem value="high">
                High
              </MenuItem>

              <MenuItem value="critical">
                Critical
              </MenuItem>
            </TextField>

            {editing ? (
              <TextField
                select
                required
                label="Status"
                value={
                  form.status
                }
                disabled={
                  !canUpdate
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    'status',
                    event.target
                      .value as
                      IncidentStatus,
                  )
                }
              >
                <MenuItem value="open">
                  Open / Reopened
                </MenuItem>

                <MenuItem value="resolved">
                  Resolved
                </MenuItem>

                <MenuItem value="closed">
                  Closed
                </MenuItem>
              </TextField>
            ) : (
              <Box />
            )}

            <TextField
              required
              label="Incident type"
              value={
                form.type
              }
              disabled={
                editing &&
                !canUpdate
              }
              onChange={(
                event,
              ) =>
                updateField(
                  'type',
                  event.target
                    .value,
                )
              }
              placeholder="e.g. Vehicle breakdown"
              sx={{
                gridColumn:
                  '1 / -1',
              }}
            />

            <TextField
              required
              label="Description"
              value={
                form.description
              }
              disabled={
                editing &&
                !canUpdate
              }
              onChange={(
                event,
              ) =>
                updateField(
                  'description',
                  event.target
                    .value,
                )
              }
              multiline
              minRows={
                5
              }
              sx={{
                gridColumn:
                  '1 / -1',
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px:
              3,

            pb:
              3,
          }}
        >
          <Button
            onClick={
              onClose
            }
            disabled={
              saving
            }
          >
            Cancel
          </Button>

          {(
            !editing ||
            canUpdate
          ) ? (
            <Button
              type="submit"
              variant="contained"
              disabled={
                saving
              }
            >
              {saving
                ? 'Saving...'
                : editing
                  ? 'Save changes'
                  : 'Report incident'}
            </Button>
          ) : null}
        </DialogActions>
      </Box>
    </Dialog>
  );
}
