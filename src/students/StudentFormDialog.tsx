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
  School,
} from '../schools/schools.api';

import type {
  CreateStudentInput,
  Student,
  UpdateStudentInput,
} from './students.api';

interface StudentFormDialogProps {
  open: boolean;

  student:
    | Student
    | null;

  schools:
    School[];

  saving: boolean;

  error:
    | string
    | null;

  onClose: () => void;

  onSubmit: (
    input:
      | CreateStudentInput
      | UpdateStudentInput,
  ) => Promise<void>;
}

interface StudentFormState {
  schoolId: string;

  externalRef: string;

  firstName: string;

  lastName: string;

  grade: string;

  photoUrl: string;
}

const EMPTY_FORM:
  StudentFormState = {
    schoolId: '',

    externalRef: '',

    firstName: '',

    lastName: '',

    grade: '',

    photoUrl: '',
  };

function createFormState(
  student:
    | Student
    | null,
): StudentFormState {
  if (!student) {
    return {
      ...EMPTY_FORM,
    };
  }

  return {
    schoolId:
      student.schoolId,

    externalRef:
      student.externalRef ??
      '',

    firstName:
      student.firstName,

    lastName:
      student.lastName,

    grade:
      student.grade,

    photoUrl:
      student.photoUrl ??
      '',
  };
}

function optionalValue(
  value: string,
): string | undefined {
  const trimmed =
    value.trim();

  return trimmed ||
    undefined;
}

export function StudentFormDialog({
  open,
  student,
  schools,
  saving,
  error,
  onClose,
  onSubmit,
}: StudentFormDialogProps) {
  const [
    form,
    setForm,
  ] =
    useState<StudentFormState>(
      () =>
        createFormState(
          student,
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
    student !== null;

  function updateField<
    K extends keyof StudentFormState,
  >(
    key: K,
    value:
      StudentFormState[K],
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

    const grade =
      form.grade.trim();

    if (!grade) {
      setValidationError(
        'Grade / class is required.',
      );

      return;
    }

    if (!editing) {
      if (!form.schoolId) {
        setValidationError(
          'School is required.',
        );

        return;
      }

      const input:
        CreateStudentInput = {
          schoolId:
            form.schoolId,

          externalRef:
            optionalValue(
              form.externalRef,
            ),

          firstName,

          lastName,

          grade,

          photoUrl:
            optionalValue(
              form.photoUrl,
            ),
        };

      await onSubmit(
        input,
      );

      return;
    }

    const input:
      UpdateStudentInput = {
        /**
         * Empty external reference deliberately clears
         * the existing value through the backend PATCH contract.
         */
        externalRef:
          form.externalRef.trim(),

        firstName,

        lastName,

        grade,

        /*
         * Empty string explicitly removes the existing photo.
         */
        photoUrl:
          form.photoUrl.trim(),
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
            pb: 1,

            fontWeight:
              850,
          }}
        >
          {editing
            ? 'Edit student'
            : 'Add student'}
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              mb: 2.5,

              color:
                'text.secondary',

              fontSize:
                12.5,

              lineHeight:
                1.6,
            }}
          >
            {editing
              ? 'Update the student profile. School assignment remains locked to protect transport history and relationships.'
              : 'Create a student profile and assign the student to a school.'}
          </Typography>

          {validationError ? (
            <Alert
              severity="error"

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
            <TextField
              select

              label="School"

              required={
                !editing
              }

              disabled={
                editing
              }

              value={
                form.schoolId
              }

              onChange={(
                event,
              ) =>
                updateField(
                  'schoolId',
                  event.target
                    .value,
                )
              }

              sx={{
                gridColumn: {
                  xs:
                    'auto',

                  sm:
                    '1 / -1',
                },
              }}
            >
              <MenuItem
                value=""
              >
                Select school
              </MenuItem>

              {schools.map(
                (school) => (
                  <MenuItem
                    key={
                      school.id
                    }

                    value={
                      school.id
                    }
                  >
                    {school.name}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="First name"

              required

              value={
                form.firstName
              }

              onChange={(
                event,
              ) =>
                updateField(
                  'firstName',
                  event.target
                    .value,
                )
              }
            />

            <TextField
              label="Last name"

              required

              value={
                form.lastName
              }

              onChange={(
                event,
              ) =>
                updateField(
                  'lastName',
                  event.target
                    .value,
                )
              }
            />

            <TextField
              label="Grade / Class"

              required

              value={
                form.grade
              }

              onChange={(
                event,
              ) =>
                updateField(
                  'grade',
                  event.target
                    .value,
                )
              }

              placeholder="e.g. Grade 4, Year 7, Form 2, Class 6A"

              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
            />

            <TextField
              label="External reference"

              value={
                form.externalRef
              }

              onChange={(
                event,
              ) =>
                updateField(
                  'externalRef',
                  event.target
                    .value,
                )
              }

              placeholder="Optional school / Odoo reference"

              sx={{
                gridColumn: {
                  xs:
                    'auto',

                  sm:
                    '1 / -1',
                },
              }}
            />

            <TextField
              label="Student photo"

              value={
                form.photoUrl
              }

              onChange={(
                event,
              ) =>
                updateField(
                  'photoUrl',
                  event.target
                    .value,
                )
              }

              placeholder="Optional photo URL"

              helperText="For now, enter an image URL. Managed photo upload will be added through the media service later."

              slotProps={{
                htmlInput: {
                  maxLength: 2048,
                },
              }}

              sx={{
                gridColumn: {
                  xs:
                    'auto',

                  sm:
                    '1 / -1',
                },
              }}
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
                : 'Add student'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
