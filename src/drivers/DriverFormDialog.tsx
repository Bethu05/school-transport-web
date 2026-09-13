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
  CreateDriverInput,
  Driver,
  DriverStatus,
  UpdateDriverInput,
} from './drivers.api';

const BUSINESS_TIME_ZONE =
  'Africa/Nairobi';

interface DriverFormDialogProps {
  open: boolean;

  driver:
  | Driver
  | null;

  saving: boolean;

  error:
  | string
  | null;

  onClose: () => void;

  onSubmit: (
    input:
      | CreateDriverInput
      | UpdateDriverInput,
  ) => Promise<void>;
}

interface DriverFormState {
  firstName: string;

  lastName: string;

  phone: string;

  licenseNumber: string;

  licenseExpiryDate: string;

  status:
  DriverStatus;
}

const EMPTY_FORM:
  DriverFormState = {
  firstName: '',

  lastName: '',

  phone: '',

  licenseNumber: '',

  licenseExpiryDate: '',

  status: 'active',
};

function createDriverFormState(
  driver:
    | Driver
    | null,
): DriverFormState {
  if (!driver) {
    return {
      ...EMPTY_FORM,
    };
  }

  return {
    firstName:
      driver.firstName,

    lastName:
      driver.lastName,

    phone:
      driver.phone ??
      '',

    licenseNumber:
      driver.licenseNumber,

    licenseExpiryDate:
      dateInputValue(
        driver.licenseExpiryDate,
      ),

    status:
      driver.status,
  };
}

/**
 * Licence expiry is a business calendar date.
 *
 * The API currently serialises PostgreSQL DATE
 * values as UTC Date strings.
 *
 * Example:
 *
 * 2031-12-31 Nairobi
 *
 * can arrive as:
 *
 * 2031-12-30T21:00:00.000Z
 *
 * Convert it back into the Nairobi calendar date
 * before putting it into an HTML date input.
 */
function dateInputValue(
  value:
    | string
    | null,
): string {
  if (!value) {
    return '';
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return value;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '';
  }

  const parts =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone:
          BUSINESS_TIME_ZONE,

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      },
    ).formatToParts(
      date,
    );

  const year =
    parts.find(
      (part) =>
        part.type ===
        'year',
    )?.value;

  const month =
    parts.find(
      (part) =>
        part.type ===
        'month',
    )?.value;

  const day =
    parts.find(
      (part) =>
        part.type ===
        'day',
    )?.value;

  if (
    !year ||
    !month ||
    !day
  ) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

export function DriverFormDialog({
  open,
  driver,
  saving,
  error,
  onClose,
  onSubmit,
}: DriverFormDialogProps) {
  const [
    form,
    setForm,
  ] =
    useState<DriverFormState>(
      () =>
        createDriverFormState(
          driver,
        ),
    );

  const [
    validationError,
    setValidationError,
  ] =
    useState<
      string | null
    >(null);

  const editing =
    driver !== null;


  function updateField<
    K extends keyof DriverFormState,
  >(
    key: K,
    value:
      DriverFormState[K],
  ): void {
    setForm(
      (current) => ({
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

    const firstName =
      form.firstName.trim();

    const lastName =
      form.lastName.trim();

    const licenseNumber =
      form.licenseNumber.trim();

    if (!firstName) {
      setValidationError(
        'First name is required.',
      );

      return;
    }

    if (!lastName) {
      setValidationError(
        'Last name is required.',
      );

      return;
    }

    if (
      !editing &&
      !licenseNumber
    ) {
      setValidationError(
        'Licence number is required.',
      );

      return;
    }

    if (
      !form.licenseExpiryDate
    ) {
      setValidationError(
        'Licence expiry date is required.',
      );

      return;
    }

    /**
     * Editing uses only the fields already
     * proven by our Drivers CRUD API test.
     */
    if (editing) {
      const input:
        UpdateDriverInput = {
        firstName,

        lastName,

        phone:
          form.phone.trim() ||
          undefined,

        licenseExpiryDate:
          form.licenseExpiryDate,

        status:
          form.status,
      };

      await onSubmit(
        input,
      );

      return;
    }

    const input:
      CreateDriverInput = {
      firstName,

      lastName,

      licenseNumber,

      licenseExpiryDate:
        form.licenseExpiryDate,

      status:
        form.status,
    };

    await onSubmit(
      input,
    );
  }

  return (
    <Dialog
      open={open}

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
            ? 'Edit driver'
            : 'Add driver'}
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              pt: 1,

              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                sm:
                  'repeat(2, minmax(0, 1fr))',
              },

              gap: 2,
            }}
          >
            {(validationError ||
              error) ? (
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
              required

              label="First name"

              value={
                form.firstName
              }

              onChange={
                (event) =>
                  updateField(
                    'firstName',
                    event.target
                      .value,
                  )
              }
            />

            <TextField
              required

              label="Last name"

              value={
                form.lastName
              }

              onChange={
                (event) =>
                  updateField(
                    'lastName',
                    event.target
                      .value,
                  )
              }
            />

            <TextField
              required

              disabled={
                editing
              }

              label="Licence number"

              value={
                form.licenseNumber
              }

              onChange={
                (event) =>
                  updateField(
                    'licenseNumber',
                    event.target
                      .value,
                  )
              }
            />

            <TextField
              required

              type="date"

              label="Licence expiry"

              value={
                form.licenseExpiryDate
              }

              onChange={
                (event) =>
                  updateField(
                    'licenseExpiryDate',
                    event.target
                      .value,
                  )
              }

              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            {editing ? (
              <TextField
                label="Phone"

                value={
                  form.phone
                }

                onChange={
                  (event) =>
                    updateField(
                      'phone',
                      event.target
                        .value,
                    )
                }

                placeholder="+254..."
              />
            ) : (
              <Box>
                <Typography
                  sx={{
                    color:
                      'text.secondary',

                    fontSize:
                      11.5,

                    lineHeight:
                      1.7,
                  }}
                >
                  Contact details can be added after the driver record has been created.
                </Typography>
              </Box>
            )}

            <TextField
              select

              label="Status"

              value={
                form.status
              }

              onChange={
                (event) =>
                  updateField(
                    'status',
                    event.target
                      .value as DriverStatus,
                  )
              }
            >
              <MenuItem value="active">
                Active
              </MenuItem>

              <MenuItem value="inactive">
                Inactive
              </MenuItem>

              <MenuItem value="suspended">
                Suspended
              </MenuItem>
            </TextField>

            {editing ? (
              <Typography
                sx={{
                  gridColumn:
                    '1 / -1',

                  color:
                    'text.secondary',

                  fontSize:
                    10.5,

                  lineHeight:
                    1.6,
                }}
              >
                The licence number is intentionally locked during editing until licence-number updates are separately verified against the backend contract.
              </Typography>
            ) : null}
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,

            pb: 3,
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
                : 'Add driver'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
