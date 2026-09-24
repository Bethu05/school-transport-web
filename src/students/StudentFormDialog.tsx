import { useMemo, useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";

import { useQuery } from "@tanstack/react-query";

import type { School } from "../schools/schools.api";

import {
  listStudentCustomFields,
  type StudentCustomFieldDefinition,
} from "./student-custom-fields.api";

import type {
  CreateStudentInput,
  Student,
  StudentCustomFieldInput,
  UpdateStudentInput,
} from "./students.api";

interface StudentFormDialogProps {
  open: boolean;

  tenantId: string | undefined;

  student: Student | null;

  schools: School[];

  /**
   * When supplied by a school-scoped page, Student creation is
   * locked to this backend-authorised school context.
   */
  fixedSchoolId?: string;

  saving: boolean;

  error: string | null;

  onClose: () => void;

  onSubmit: (input: CreateStudentInput | UpdateStudentInput) => Promise<void>;
}

interface StudentFormState {
  schoolId: string;

  externalRef: string;

  firstName: string;

  lastName: string;

  grade: string;

  photoUrl: string;

  customFields: Record<string, string>;
}

const EMPTY_FORM: StudentFormState = {
  schoolId: "",

  externalRef: "",

  firstName: "",

  lastName: "",

  grade: "",

  photoUrl: "",

  customFields: {},
};

function createFormState(student: Student | null): StudentFormState {
  if (!student) {
    return {
      ...EMPTY_FORM,

      customFields: {},
    };
  }

  return {
    schoolId: student.schoolId,

    externalRef: student.externalRef ?? "",

    firstName: student.firstName,

    lastName: student.lastName,

    grade: student.grade,

    photoUrl: student.photoUrl ?? "",

    customFields: Object.fromEntries(
      (student.customFields ?? []).map((field) => [
        field.fieldDefinitionId,
        field.value,
      ]),
    ),
  };
}

function optionalValue(value: string): string | undefined {
  const trimmed = value.trim();

  return trimmed || undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Student custom fields could not be loaded.";
}

export function StudentFormDialog({
  open,
  tenantId,
  student,
  schools,
  fixedSchoolId,
  saving,
  error,
  onClose,
  onSubmit,
}: StudentFormDialogProps) {
  const [form, setForm] = useState<StudentFormState>(() =>
    createFormState(student),
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  const editing = student !== null;

  const selectedSchoolId = editing
    ? student.schoolId
    : (fixedSchoolId ?? form.schoolId);

  const customFieldsQuery = useQuery({
    queryKey: [
      "student-custom-fields",
      "student-form",
      tenantId,
      selectedSchoolId,
    ],

    enabled: Boolean(open && tenantId && selectedSchoolId),

    queryFn: async () => {
      if (!tenantId || !selectedSchoolId) {
        throw new Error("School context is unavailable");
      }

      return listStudentCustomFields(tenantId, selectedSchoolId);
    },
  });

  const customFieldDefinitions = useMemo(
    () =>
      (customFieldsQuery.data ?? []).filter(
        (definition) => definition.status === "active",
      ),
    [customFieldsQuery.data],
  );

  function updateField<K extends keyof StudentFormState>(
    key: K,
    value: StudentFormState[K],
  ): void {
    setForm((current) => ({
      ...current,

      [key]: value,
    }));
  }

  function updateSchool(schoolId: string): void {
    setForm((current) => ({
      ...current,

      schoolId,

      /**
       * Custom-field definitions are school-specific.
       * Never carry values from School A into School B.
       */
      customFields: {},
    }));
  }

  function updateCustomField(fieldDefinitionId: string, value: string): void {
    setForm((current) => ({
      ...current,

      customFields: {
        ...current.customFields,

        [fieldDefinitionId]: value,
      },
    }));
  }

  function buildCustomFieldPayload(): StudentCustomFieldInput[] | null {
    for (const definition of customFieldDefinitions) {
      const value = form.customFields[definition.id]?.trim() ?? "";

      if (definition.isRequired && !value) {
        setValidationError(`${definition.label} is required.`);

        return null;
      }
    }

    return customFieldDefinitions.map((definition) => {
      const value = form.customFields[definition.id]?.trim() ?? "";

      return {
        fieldDefinitionId: definition.id,

        value: value || null,
      };
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setValidationError(null);

    const firstName = form.firstName.trim();

    const lastName = form.lastName.trim();

    if (!firstName) {
      setValidationError("First name is required.");

      return;
    }

    if (!lastName) {
      setValidationError("Last name is required.");

      return;
    }

    const grade = form.grade.trim();

    if (!grade) {
      setValidationError("Grade / class is required.");

      return;
    }

    if (!editing && !selectedSchoolId) {
      setValidationError("School is required.");

      return;
    }

    if (selectedSchoolId && customFieldsQuery.isLoading) {
      setValidationError("Student custom fields are still loading.");

      return;
    }

    if (customFieldsQuery.isError) {
      setValidationError(
        "Student custom fields could not be loaded. Please try again.",
      );

      return;
    }

    const customFields = buildCustomFieldPayload();

    if (customFields === null) {
      return;
    }

    if (!editing) {
      const input: CreateStudentInput = {
        schoolId: selectedSchoolId,

        externalRef: optionalValue(form.externalRef),

        firstName,

        lastName,

        grade,

        photoUrl: optionalValue(form.photoUrl),

        customFields,
      };

      await onSubmit(input);

      return;
    }

    const input: UpdateStudentInput = {
      externalRef: form.externalRef.trim(),

      firstName,

      lastName,

      grade,

      photoUrl: form.photoUrl.trim(),

      customFields,
    };

    await onSubmit(input);
  }

  function renderCustomField(definition: StudentCustomFieldDefinition) {
    const value = form.customFields[definition.id] ?? "";

    const commonProps = {
      key: definition.id,

      label: definition.label,

      required: definition.isRequired,

      value,

      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => updateCustomField(definition.id, event.target.value),

      helperText: definition.isUnique
        ? "Must be unique within this school."
        : undefined,
    };

    if (definition.fieldType === "select") {
      return (
        <TextField {...commonProps} select>
          {!definition.isRequired ? (
            <MenuItem value="">Not set</MenuItem>
          ) : null}

          {definition.options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    if (definition.fieldType === "boolean") {
      return (
        <TextField {...commonProps} select>
          {!definition.isRequired ? (
            <MenuItem value="">Not set</MenuItem>
          ) : null}

          <MenuItem value="true">Yes</MenuItem>

          <MenuItem value="false">No</MenuItem>
        </TextField>
      );
    }

    if (definition.fieldType === "date") {
      return (
        <TextField
          {...commonProps}
          type="date"
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />
      );
    }

    if (definition.fieldType === "number") {
      return <TextField {...commonProps} type="number" />;
    }

    return (
      <TextField
        {...commonProps}
        slotProps={{
          htmlInput: {
            maxLength: 1000,
          },
        }}
      />
    );
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            pb: 1,
            fontWeight: 850,
          }}
        >
          {editing ? "Edit student" : "Add student"}
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              mb: 2.5,
              color: "text.secondary",
              fontSize: 12.5,
              lineHeight: 1.6,
            }}
          >
            {editing
              ? "Update the student profile. School assignment remains locked to protect transport history and relationships."
              : "Create a student profile and assign the student to a school."}
          </Typography>

          {validationError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {validationError}
            </Alert>
          ) : null}

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          {customFieldsQuery.isError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage(customFieldsQuery.error)}
            </Alert>
          ) : null}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <TextField
              select
              label="School"
              required={!editing}
              disabled={editing || Boolean(fixedSchoolId)}
              value={selectedSchoolId}
              onChange={(event) => updateSchool(event.target.value)}
              sx={{
                gridColumn: {
                  xs: "auto",
                  sm: "1 / -1",
                },
              }}
            >
              <MenuItem value="">Select school</MenuItem>

              {schools.map((school) => (
                <MenuItem key={school.id} value={school.id}>
                  {school.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="First name"
              required
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
            />

            <TextField
              label="Last name"
              required
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
            />

            <TextField
              label="Grade / Class"
              required
              value={form.grade}
              onChange={(event) => updateField("grade", event.target.value)}
              placeholder="e.g. Grade 4, Year 7, Form 2, Class 6A"
              slotProps={{
                htmlInput: {
                  maxLength: 50,
                },
              }}
            />

            {selectedSchoolId && customFieldsQuery.isLoading ? (
              <Box
                sx={{
                  minHeight: 56,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <CircularProgress size={18} />

                <Typography
                  sx={{
                    color: "text.secondary",
                    fontSize: 11.5,
                  }}
                >
                  Loading school fields...
                </Typography>
              </Box>
            ) : null}

            {customFieldDefinitions.map(renderCustomField)}

            <TextField
              label="External reference"
              value={form.externalRef}
              onChange={(event) =>
                updateField("externalRef", event.target.value)
              }
              placeholder="Optional school / Odoo reference"
              sx={{
                gridColumn: {
                  xs: "auto",
                  sm: "1 / -1",
                },
              }}
            />

            <TextField
              label="Student photo"
              value={form.photoUrl}
              onChange={(event) => updateField("photoUrl", event.target.value)}
              placeholder="Optional photo URL"
              helperText="For now, enter an image URL. Managed photo upload will be added through the media service later."
              slotProps={{
                htmlInput: {
                  maxLength: 2048,
                },
              }}
              sx={{
                gridColumn: {
                  xs: "auto",
                  sm: "1 / -1",
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
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={
              saving || Boolean(selectedSchoolId && customFieldsQuery.isLoading)
            }
          >
            {saving ? "Saving..." : editing ? "Save changes" : "Add student"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
