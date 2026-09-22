import { useEffect, useState, type FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import { AddRounded, EditRounded, PersonOffRounded } from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { School } from "../schools/schools.api";

import {
  STUDENT_CUSTOM_FIELD_TYPES,
  createStudentCustomField,
  deactivateStudentCustomField,
  listStudentCustomFields,
  updateStudentCustomField,
  type StudentCustomFieldDefinition,
  type StudentCustomFieldType,
} from "./student-custom-fields.api";

interface StudentCustomFieldsDialogProps {
  open: boolean;

  tenantId: string;

  schools: School[];

  onClose: () => void;
}

interface DefinitionFormState {
  label: string;

  fieldType: StudentCustomFieldType;

  isRequired: boolean;

  isUnique: boolean;

  optionsText: string;

  sortOrder: string;
}

const EMPTY_FORM: DefinitionFormState = {
  label: "",

  fieldType: "text",

  isRequired: false,

  isUnique: false,

  optionsText: "",

  sortOrder: "0",
};

const TYPE_LABELS: Record<StudentCustomFieldType, string> = {
  text: "Text",

  number: "Number",

  date: "Date",

  boolean: "Yes / No",

  select: "Selection list",
};

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The custom field operation could not be completed.";
}

function makeFieldKey(label: string): string {
  let key = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (/^[0-9]/.test(key)) {
    key = `field_${key}`;
  }

  return key.slice(0, 64);
}

function parseOptions(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function StudentCustomFieldsDialog({
  open,
  tenantId,
  schools,
  onClose,
}: StudentCustomFieldsDialogProps) {
  const queryClient = useQueryClient();

  const [schoolId, setSchoolId] = useState("");

  const [editing, setEditing] = useState<StudentCustomFieldDefinition | null>(
    null,
  );

  const [form, setForm] = useState<DefinitionFormState>({
    ...EMPTY_FORM,
  });

  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !schoolId && schools[0]) {
      setSchoolId(schools[0].id);
    }
  }, [open, schoolId, schools]);

  const definitionsQuery = useQuery({
    queryKey: ["student-custom-fields", "manager", tenantId, schoolId],

    enabled: Boolean(open && schoolId),

    queryFn: () => listStudentCustomFields(tenantId, schoolId),
  });

  function resetForm(): void {
    setEditing(null);

    setForm({
      ...EMPTY_FORM,
    });

    setFormError(null);
  }

  function beginEdit(definition: StudentCustomFieldDefinition): void {
    setEditing(definition);

    setForm({
      label: definition.label,

      fieldType: definition.fieldType,

      isRequired: definition.isRequired,

      isUnique: definition.isUnique,

      optionsText: definition.options.join("\n"),

      sortOrder: String(definition.sortOrder),
    });

    setFormError(null);
  }

  async function refreshDefinitions(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["student-custom-fields"],
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId) {
        throw new Error("Select a school first.");
      }

      const label = form.label.trim();

      if (!label) {
        throw new Error("Field name is required.");
      }

      const sortOrder = Number(form.sortOrder);

      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        throw new Error(
          "Display order must be a whole number of zero or greater.",
        );
      }

      const options =
        form.fieldType === "select" ? parseOptions(form.optionsText) : [];

      if (form.fieldType === "select" && options.length === 0) {
        throw new Error("Selection-list fields require at least one option.");
      }

      if (editing) {
        return updateStudentCustomField(tenantId, editing.id, {
          label,

          isRequired: form.isRequired,

          isUnique: form.isUnique,

          options,

          sortOrder,
        });
      }

      const key = makeFieldKey(label);

      if (!key) {
        throw new Error(
          "Field name must contain at least one letter or number.",
        );
      }

      return createStudentCustomField(tenantId, {
        schoolId,

        key,

        label,

        fieldType: form.fieldType,

        isRequired: form.isRequired,

        isUnique: form.isUnique,

        options,

        sortOrder,
      });
    },

    onSuccess: async () => {
      await refreshDefinitions();

      resetForm();
    },

    onError: (error) => {
      setFormError(errorMessage(error));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (definition: StudentCustomFieldDefinition) =>
      deactivateStudentCustomField(tenantId, definition.id),

    onSuccess: async () => {
      await refreshDefinitions();

      resetForm();
    },

    onError: (error) => {
      setFormError(errorMessage(error));
    },
  });

  async function submitForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setFormError(null);

    await saveMutation.mutateAsync();
  }

  const definitions = definitionsQuery.data ?? [];

  const busy = saveMutation.isPending || deactivateMutation.isPending;

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle
        sx={{
          pb: 1,
          fontWeight: 850,
        }}
      >
        Student custom fields
      </DialogTitle>

      <DialogContent>
        <Typography
          sx={{
            mb: 2.5,
            color: "text.secondary",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          Configure school-specific student information such as Admission
          Number, Registration Number, House or Boarding Status.
        </Typography>

        {formError ? (
          <Alert
            severity="error"
            sx={{
              mb: 2,
            }}
          >
            {formError}
          </Alert>
        ) : null}

        {definitionsQuery.isError ? (
          <Alert
            severity="error"
            sx={{
              mb: 2,
            }}
          >
            {errorMessage(definitionsQuery.error)}
          </Alert>
        ) : null}

        <TextField
          select
          fullWidth
          label="School"
          value={schoolId}
          disabled={busy}
          onChange={(event) => {
            setSchoolId(event.target.value);

            resetForm();
          }}
          sx={{
            mb: 2.5,
          }}
        >
          {schools.map((school) => (
            <MenuItem key={school.id} value={school.id}>
              {school.name}
            </MenuItem>
          ))}
        </TextField>

        <Paper
          component="form"
          elevation={0}
          onSubmit={submitForm}
          sx={{
            p: 2,
            mb: 2.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            sx={{
              mb: 2,
              fontWeight: 800,
            }}
          >
            {editing ? `Edit ${editing.label}` : "Add custom field"}
          </Typography>

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
              label="Field name"
              required
              value={form.label}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  label: event.target.value,
                }))
              }
              placeholder="e.g. Admission Number"
            />

            <TextField
              select
              label="Field type"
              value={form.fieldType}
              disabled={editing !== null}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  fieldType: event.target.value as StudentCustomFieldType,

                  optionsText:
                    event.target.value === "select" ? current.optionsText : "",
                }))
              }
            >
              {STUDENT_CUSTOM_FIELD_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {TYPE_LABELS[type]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="number"
              label="Display order"
              value={form.sortOrder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  sortOrder: event.target.value,
                }))
              }
              slotProps={{
                htmlInput: {
                  min: 0,
                  step: 1,
                },
              }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isRequired}
                    onChange={(_event, checked) =>
                      setForm((current) => ({
                        ...current,

                        isRequired: checked,
                      }))
                    }
                  />
                }
                label="Required"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={form.isUnique}
                    onChange={(_event, checked) =>
                      setForm((current) => ({
                        ...current,

                        isUnique: checked,
                      }))
                    }
                  />
                }
                label="Unique"
              />
            </Box>

            {form.fieldType === "select" ? (
              <TextField
                multiline
                minRows={3}
                label="Options"
                required
                value={form.optionsText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    optionsText: event.target.value,
                  }))
                }
                helperText="Enter one option per line or separate options with commas."
                sx={{
                  gridColumn: {
                    xs: "auto",
                    sm: "1 / -1",
                  },
                }}
              />
            ) : null}
          </Box>

          <Box
            sx={{
              mt: 2,
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
            }}
          >
            {editing ? (
              <Button type="button" disabled={busy} onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}

            <Button
              type="submit"
              variant="contained"
              startIcon={editing ? <EditRounded /> : <AddRounded />}
              disabled={busy || !schoolId}
            >
              {saveMutation.isPending
                ? "Saving..."
                : editing
                  ? "Save field"
                  : "Add field"}
            </Button>
          </Box>
        </Paper>

        {definitionsQuery.isLoading ? (
          <Box
            sx={{
              py: 5,
              display: "grid",
              placeItems: "center",
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : null}

        {!definitionsQuery.isLoading && definitions.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              textAlign: "center",
              border: "1px dashed",
              borderColor: "divider",
            }}
          >
            <Typography
              sx={{
                fontWeight: 750,
              }}
            >
              No custom fields configured
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                color: "text.secondary",
                fontSize: 11.5,
              }}
            >
              Add Admission Number, Registration Number or another
              school-specific field above.
            </Typography>
          </Paper>
        ) : null}

        <Box
          sx={{
            display: "grid",
            gap: 1,
          }}
        >
          {definitions.map((definition) => (
            <Paper
              key={definition.id}
              elevation={0}
              sx={{
                p: 1.7,
                display: "flex",
                alignItems: {
                  xs: "flex-start",
                  sm: "center",
                },
                justifyContent: "space-between",
                flexDirection: {
                  xs: "column",
                  sm: "row",
                },
                gap: 1.5,
                border: "1px solid",
                borderColor: "divider",
                opacity: definition.status === "active" ? 1 : 0.62,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 12.5,
                    fontWeight: 800,
                  }}
                >
                  {definition.label}
                </Typography>

                <Box
                  sx={{
                    mt: 0.7,
                    display: "flex",
                    gap: 0.7,
                    flexWrap: "wrap",
                  }}
                >
                  <Chip
                    size="small"
                    label={TYPE_LABELS[definition.fieldType]}
                  />

                  {definition.isRequired ? (
                    <Chip size="small" label="Required" />
                  ) : null}

                  {definition.isUnique ? (
                    <Chip size="small" label="Unique" />
                  ) : null}

                  <Chip
                    size="small"
                    label={
                      definition.status === "active" ? "Active" : "Inactive"
                    }
                  />
                </Box>
              </Box>

              {definition.status === "active" ? (
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.5,
                  }}
                >
                  <Button
                    size="small"
                    startIcon={<EditRounded />}
                    disabled={busy}
                    onClick={() => beginEdit(definition)}
                  >
                    Edit
                  </Button>

                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<PersonOffRounded />}
                    disabled={busy}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Deactivate "${definition.label}"? Existing values will be preserved.`,
                      );

                      if (confirmed) {
                        deactivateMutation.mutate(definition);
                      }
                    }}
                  >
                    Deactivate
                  </Button>
                </Box>
              ) : null}
            </Paper>
          ))}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
        }}
      >
        <Button disabled={busy} onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
