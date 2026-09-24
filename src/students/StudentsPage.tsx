import { useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  FamilyRestroomRounded,
  AddRounded,
  EditRounded,
  PersonOffRounded,
  PersonRounded,
  PlaceRounded,
  SchoolRounded,
  SearchRounded,
  LockRounded,
  TuneRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import { UpgradeRequiredDialog } from "../commercial/UpgradeRequiredDialog";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { PaginationControls } from "../components/PaginationControls";

import {
  createStudent,
  deactivateStudent,
  listStudentsPage,
  updateStudent,
  type CreateStudentInput,
  type Student,
  type StudentStatus,
  type UpdateStudentInput,
} from "./students.api";

import { StudentFormDialog } from "./StudentFormDialog";

import { StudentCustomFieldsDialog } from "./StudentCustomFieldsDialog";

import { StudentGuardiansDialog } from "./StudentGuardiansDialog";

import { StudentStopsDialog } from "./StudentStopsDialog";

type StatusFilter = "all" | StudentStatus;

function studentName(student: Student): string {
  return [student.firstName, student.lastName].filter(Boolean).join(" ");
}

function statusLabel(status: StudentStatus): string {
  return status === "active" ? "Active" : "Inactive";
}

function statusColor(status: StudentStatus): string {
  return status === "active" ? "#5F9471" : "#85898F";
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The operation could not be completed.";
}

export function StudentsPage() {
  const { permissions, tenant, features, activeSchool } = useAuth();

  const queryClient = useQueryClient();

  const [guardiansStudent, setGuardiansStudent] = useState<Student | null>(
    null,
  );

  /**
   * Reading and managing Guardian relationships are separate
   * capabilities.
   *
   * This keeps the UI compatible with future per-user permission
   * overrides rather than assuming permissions from role names.
   */
  const canReadGuardians = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_READ,
  );

  const canManageGuardians = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_MANAGE_STUDENTS,
  );

  const tenantId = tenant?.tenantId;

  const schoolId = activeSchool?.id;

  const canReadStudents = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.STUDENTS_READ,
  );

  const canCreateStudents = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.STUDENTS_CREATE,
  );

  const canUpdateStudents = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.STUDENTS_UPDATE,
  );

  const canDeactivateStudents = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.STUDENTS_DEACTIVATE,
  );

  const canManageStudentStops = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.STUDENTS_MANAGE_STOPS,
  );

  const canManageStudentCustomFields = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.STUDENTS_MANAGE_CUSTOM_FIELDS,
  );

  const studentCustomFieldsEnabled = features.some(
    (feature) => feature.key === "students.custom_fields" && feature.enabled,
  );

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<StatusFilter>("active");

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  const [formOpen, setFormOpen] = useState(false);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<Student | null>(
    null,
  );

  const [stopsStudent, setStopsStudent] = useState<Student | null>(null);

  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);

  const [customFieldsUpgradeOpen, setCustomFieldsUpgradeOpen] = useState(false);

  const [mutationError, setMutationError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const studentsQuery = useQuery({
    queryKey: ["students", tenantId, schoolId, search, status, page, limit],

    enabled: Boolean(tenantId && schoolId && canReadStudents),

    queryFn: async () => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      return listStudentsPage(tenantId, {
        page,

        limit,

        search: search.trim() || undefined,

        schoolId,

        status: status === "all" ? undefined : status,
      });
    },
  });

  /**
   * Small summary requests use the minimum supported
   * page size (10). We only need the `total` metadata.
   */
  const studentSummaryQuery = useQuery({
    queryKey: ["students-summary", tenantId, schoolId],

    enabled: Boolean(tenantId && schoolId && canReadStudents),

    queryFn: async () => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      const [all, active, inactive] = await Promise.all([
        listStudentsPage(tenantId, {
          page: 1,
          limit: 10,
          schoolId,
        }),

        listStudentsPage(tenantId, {
          page: 1,
          limit: 10,
          schoolId,
          status: "active",
        }),

        listStudentsPage(tenantId, {
          page: 1,
          limit: 10,
          schoolId,
          status: "inactive",
        }),
      ]);

      return {
        total: all.total,

        active: active.total,

        inactive: inactive.total,
      };
    },
  });

  async function refreshStudents(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["students"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["students-summary"],
      }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: async (input: CreateStudentInput) => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      /**
       * The current school comes from authenticated application
       * context, not from a freely selectable Student form value.
       */
      return createStudent(tenantId, {
        ...input,
        schoolId,
      });
    },

    onSuccess: async () => {
      await refreshStudents();

      setPage(1);

      setFormOpen(false);

      setEditingStudent(null);

      setMutationError(null);

      setSuccessMessage("Student added successfully.");
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      studentId: targetStudentId,
      input,
    }: {
      studentId: string;

      input: UpdateStudentInput;
    }) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return updateStudent(tenantId, targetStudentId, input);
    },

    onSuccess: async () => {
      await refreshStudents();

      setFormOpen(false);

      setEditingStudent(null);

      setMutationError(null);

      setSuccessMessage("Student updated successfully.");
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (targetStudentId: string) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return deactivateStudent(tenantId, targetStudentId);
    },

    onSuccess: async () => {
      await refreshStudents();

      setDeactivateTarget(null);

      setSuccessMessage("Student deactivated successfully.");
    },
  });

  const students = studentsQuery.data?.items ?? [];

  /**
   * School-scoped Students exposes only the verified current
   * school to child dialogs.
   */
  const schools = activeSchool ? [activeSchool] : [];

  const schoolById = new Map(schools.map((school) => [school.id, school]));

  const summary = studentSummaryQuery.data ?? {
    total: 0,
    active: 0,
    inactive: 0,
  };

  function openCreate(): void {
    setMutationError(null);

    setEditingStudent(null);

    setFormOpen(true);
  }

  function openEdit(student: Student): void {
    setMutationError(null);

    setEditingStudent(student);

    setFormOpen(true);
  }

  function closeForm(): void {
    if (createMutation.isPending || updateMutation.isPending) {
      return;
    }

    setMutationError(null);

    setEditingStudent(null);

    setFormOpen(false);
  }

  async function submitStudent(
    input: CreateStudentInput | UpdateStudentInput,
  ): Promise<void> {
    setMutationError(null);

    if (editingStudent) {
      await updateMutation.mutateAsync({
        studentId: editingStudent.id,

        input: input as UpdateStudentInput,
      });

      return;
    }

    await createMutation.mutateAsync(input as CreateStudentInput);
  }

  if (!canReadStudents) {
    return (
      <Alert severity="warning">
        You do not have permission to view Students for this tenant.
      </Alert>
    );
  }

  if (!activeSchool) {
    return <Alert severity="info">Select a school to view Students.</Alert>;
  }

  return (
    <Box>
      {/* HEADER */}

      <Box
        sx={{
          mb: 3,

          display: "flex",

          flexDirection: {
            xs: "column",

            md: "row",
          },

          alignItems: {
            xs: "flex-start",

            md: "flex-end",
          },

          justifyContent: "space-between",

          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "primary.dark",

              fontSize: 10,

              fontWeight: 850,

              textTransform: "uppercase",

              letterSpacing: "0.14em",
            }}
          >
            School Operations
          </Typography>

          <Typography
            component="h1"

            sx={{
              mt: 0.7,

              fontSize: {
                xs: 30,

                md: 38,
              },

              fontWeight: 900,

              letterSpacing: "-0.04em",
            }}
          >
            Students
          </Typography>

          <Typography
            sx={{
              mt: 0.7,

              color: "text.secondary",

              fontSize: 13,
            }}
          >
            Manage student profiles, identifiers and transport eligibility for{" "}
            {activeSchool.name}.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",

            alignItems: "center",

            gap: 1,

            flexWrap: "wrap",
          }}
        >
          <Chip
            icon={<PersonRounded />}

            label={`${summary.total} students`}

            sx={{
              color: "primary.main",

              bgcolor: "rgba(201,165,92,0.10)",

              border: "1px solid",

              borderColor: "rgba(201,165,92,0.22)",
            }}
          />

          {canManageStudentCustomFields ? (
            <Button
              variant="outlined"

              color={studentCustomFieldsEnabled ? "primary" : "warning"}

              startIcon={
                studentCustomFieldsEnabled ? <TuneRounded /> : <LockRounded />
              }

              disabled={studentCustomFieldsEnabled && schools.length === 0}

              onClick={() => {
                if (!studentCustomFieldsEnabled) {
                  setCustomFieldsUpgradeOpen(true);

                  return;
                }

                setCustomFieldsOpen(true);
              }}
            >
              Custom fields
            </Button>
          ) : null}

          <Button
            variant="contained"

            startIcon={<AddRounded />}

            disabled={schools.length === 0 || !canCreateStudents}

            sx={{
              display: canCreateStudents ? "inline-flex" : "none",
            }}

            onClick={openCreate}
          >
            Add student
          </Button>
        </Box>
      </Box>

      {/* SUMMARY */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            sm: "repeat(3, minmax(0, 1fr))",
          },

          gap: 2,

          mb: 2,
        }}
      >
        {[
          {
            label: "Total Students",

            value: summary.total,

            icon: <PersonRounded />,

            accent: "#C9A55C",
          },

          {
            label: "Active",

            value: summary.active,

            icon: <PersonRounded />,

            accent: "#5F9471",
          },

          {
            label: "Inactive",

            value: summary.inactive,

            icon: <PersonOffRounded />,

            accent: "#85898F",
          },
        ].map((item) => (
          <Paper
            key={item.label}

            elevation={0}

            sx={{
              p: 2.5,

              border: "1px solid",

              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "flex",

                alignItems: "center",

                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 10.5,

                    fontWeight: 800,

                    textTransform: "uppercase",

                    letterSpacing: "0.09em",
                  }}
                >
                  {item.label}
                </Typography>

                <Typography
                  sx={{
                    mt: 1,

                    fontSize: 30,

                    lineHeight: 1,

                    fontWeight: 900,
                  }}
                >
                  {item.value}
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 42,

                  height: 42,

                  display: "grid",

                  placeItems: "center",

                  borderRadius: 2,

                  color: item.accent,

                  bgcolor: `${item.accent}15`,
                }}
              >
                {item.icon}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* FILTERS */}

      <Paper
        elevation={0}

        sx={{
          p: 2,

          mb: 2,

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",

              md: "minmax(0, 1fr) 180px",
            },

            gap: 1.5,
          }}
        >
          <TextField
            value={search}

            onChange={(event) => {
              setSearch(event.target.value);

              setPage(1);
            }}

            label="Search students"

            placeholder="Name, reference or custom field"

            slotProps={{
              input: {
                startAdornment: (
                  <SearchRounded
                    sx={{
                      mr: 1,

                      color: "text.secondary",

                      fontSize: 20,
                    }}
                  />
                ),
              },
            }}
          />

          <FormControl>
            <InputLabel id="student-status-label">Status</InputLabel>

            <Select
              labelId="student-status-label"

              label="Status"

              value={status}

              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);

                setPage(1);
              }}
            >
              <MenuItem value="all">All statuses</MenuItem>

              <MenuItem value="active">Active</MenuItem>

              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {studentsQuery.isLoading ? (
        <Paper
          elevation={0}

          sx={{
            py: 8,

            display: "grid",

            placeItems: "center",

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <CircularProgress size={32} />
        </Paper>
      ) : null}

      {studentsQuery.isError ? (
        <Alert severity="error">{errorMessage(studentsQuery.error)}</Alert>
      ) : null}

      {!studentsQuery.isLoading &&
      !studentsQuery.isError &&
      students.length === 0 ? (
        <Paper
          elevation={0}

          sx={{
            py: 8,

            textAlign: "center",

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <PersonRounded
            sx={{
              fontSize: 42,

              color: "primary.main",
            }}
          />

          <Typography
            sx={{
              mt: 2,

              fontWeight: 800,
            }}
          >
            No students found
          </Typography>
        </Paper>
      ) : null}

      {!studentsQuery.isLoading &&
      !studentsQuery.isError &&
      students.length > 0 ? (
        <Paper
          elevation={0}

          sx={{
            overflow: "hidden",

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              px: 2.5,

              py: 1.5,

              display: {
                xs: "none",

                lg: "grid",
              },

              gridTemplateColumns: "1.4fr 1.2fr .75fr 1fr .7fr 130px",

              gap: 2,

              bgcolor: "action.hover",

              borderBottom: "1px solid",

              borderColor: "divider",
            }}
          >
            {[
              "Student",
              "School",
              "Grade / Class",
              "Identifiers",
              "Status",
              "Actions",
            ].map((heading) => (
              <Typography
                key={heading}

                sx={{
                  color: "text.secondary",

                  fontSize: 10,

                  fontWeight: 800,

                  textTransform: "uppercase",

                  letterSpacing: "0.08em",
                }}
              >
                {heading}
              </Typography>
            ))}
          </Box>

          {students.map((student, index) => {
            const school = schoolById.get(student.schoolId);

            return (
              <Box
                key={student.id}

                sx={{
                  px: 2.5,

                  py: 2,

                  display: "grid",

                  gridTemplateColumns: {
                    xs: "1fr",

                    lg: "1.4fr 1.2fr .75fr 1fr .7fr 130px",
                  },

                  alignItems: "center",

                  gap: 2,

                  borderBottom:
                    index === students.length - 1 ? "none" : "1px solid",

                  borderColor: "divider",

                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",

                    alignItems: "center",

                    gap: 1.3,
                  }}
                >
                  <Avatar
                    src={student.photoUrl ?? undefined}

                    alt={studentName(student)}

                    sx={{
                      width: 38,

                      height: 38,

                      bgcolor: "rgba(201,165,92,0.14)",

                      color: "primary.main",

                      fontSize: 12,

                      fontWeight: 800,
                    }}
                  >
                    {student.firstName.slice(0, 1).toUpperCase()}
                    {student.lastName.slice(0, 1).toUpperCase()}
                  </Avatar>

                  <Typography
                    sx={{
                      fontSize: 12.5,

                      fontWeight: 800,
                    }}
                  >
                    {studentName(student)}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",

                    alignItems: "center",

                    gap: 0.7,
                  }}
                >
                  <SchoolRounded
                    sx={{
                      fontSize: 16,

                      color: "text.secondary",
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 11.5,
                    }}
                  >
                    {school?.name ?? "School unavailable"}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: 11.5,

                    fontWeight: 700,
                  }}
                >
                  {student.grade}
                </Typography>

                <Box>
                  {(student.customFields ?? []).slice(0, 2).map((field) => (
                    <Typography
                      key={field.fieldDefinitionId}

                      sx={{
                        fontSize: 11,

                        fontWeight: 700,
                      }}
                    >
                      {field.label}: {field.value}
                    </Typography>
                  ))}

                  {student.externalRef ? (
                    <Typography
                      sx={{
                        mt: student.customFields?.length ? 0.3 : 0,

                        color: "text.secondary",

                        fontSize: 10.5,
                      }}
                    >
                      External: {student.externalRef}
                    </Typography>
                  ) : (student.customFields?.length ?? 0) === 0 ? (
                    <Typography
                      sx={{
                        color: "text.secondary",

                        fontSize: 11.5,
                      }}
                    >
                      Not set
                    </Typography>
                  ) : null}
                </Box>

                <Chip
                  size="small"

                  label={statusLabel(student.status)}

                  sx={{
                    color: statusColor(student.status),

                    bgcolor: `${statusColor(student.status)}14`,

                    border: "1px solid",

                    borderColor: `${statusColor(student.status)}30`,
                  }}
                />

                <Box
                  sx={{
                    display: "flex",
                  }}
                >
                  <Tooltip title="Edit student">
                    <IconButton
                      size="small"

                      disabled={!canUpdateStudents}

                      sx={{
                        display: canUpdateStudents ? "inline-flex" : "none",
                      }}

                      onClick={() => openEdit(student)}
                    >
                      <EditRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip
                    title={
                      student.status === "inactive"
                        ? "Inactive Students cannot change transport stops"
                        : "Manage transport stops"
                    }
                  >
                    <span>
                      <IconButton
                        size="small"

                        disabled={
                          !canManageStudentStops ||
                          student.status === "inactive"
                        }

                        sx={{
                          display: canManageStudentStops
                            ? "inline-flex"
                            : "none",
                        }}

                        onClick={() => setStopsStudent(student)}
                      >
                        <PlaceRounded fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  {canReadGuardians ? (
                    <Tooltip
                      title={
                        canManageGuardians
                          ? "Manage guardians"
                          : "View guardians"
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={() => setGuardiansStudent(student)}
                      >
                        <FamilyRestroomRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}

                  <Tooltip
                    title={
                      student.status === "inactive"
                        ? "Already inactive"
                        : "Deactivate student"
                    }
                  >
                    <span>
                      <IconButton
                        size="small"

                        disabled={
                          !canDeactivateStudents ||
                          student.status === "inactive"
                        }

                        sx={{
                          display: canDeactivateStudents
                            ? "inline-flex"
                            : "none",
                        }}

                        onClick={() => setDeactivateTarget(student)}
                      >
                        <PersonOffRounded fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}

          <PaginationControls
            page={studentsQuery.data?.page ?? page}

            limit={studentsQuery.data?.limit ?? limit}

            total={studentsQuery.data?.total ?? 0}

            totalPages={studentsQuery.data?.totalPages ?? 0}

            onPageChange={setPage}

            onLimitChange={(nextLimit) => {
              setLimit(nextLimit);

              setPage(1);
            }}
          />
        </Paper>
      ) : null}

      <StudentFormDialog
        key={`${formOpen ? "open" : "closed"}:${editingStudent?.id ?? "new"}`}

        open={formOpen}

        tenantId={tenantId}

        student={editingStudent}

        schools={schools}

        fixedSchoolId={activeSchool.id}

        saving={createMutation.isPending || updateMutation.isPending}

        error={mutationError}

        onClose={closeForm}

        onSubmit={submitStudent}
      />

      {tenantId ? (
        <>
          <UpgradeRequiredDialog
            open={customFieldsUpgradeOpen}
            featureName="Student Custom Fields"
            onClose={() => setCustomFieldsUpgradeOpen(false)}
          />

          <StudentCustomFieldsDialog
            open={customFieldsOpen}

            tenantId={tenantId}

            schools={schools}

            onClose={() => setCustomFieldsOpen(false)}
          />

          <StudentStopsDialog
            key={stopsStudent?.id ?? "no-student"}

            open={stopsStudent !== null}

            tenantId={tenantId}

            student={stopsStudent}

            onClose={() => setStopsStudent(null)}

            onSaved={() =>
              setSuccessMessage("Student transport stops updated successfully.")
            }
          />

          <StudentGuardiansDialog
            key={`student-guardians:${guardiansStudent?.id ?? "closed"}`}

            open={guardiansStudent !== null}

            tenantId={tenantId}

            student={guardiansStudent}

            canManage={canManageGuardians}

            onClose={() => setGuardiansStudent(null)}
          />
        </>
      ) : null}

      <Dialog
        open={deactivateTarget !== null}

        onClose={() => {
          if (!deactivateMutation.isPending) {
            setDeactivateTarget(null);
          }
        }}

        fullWidth

        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            fontWeight: 850,
          }}
        >
          Deactivate student?
        </DialogTitle>

        <DialogContent>
          {deactivateMutation.isError ? (
            <Alert
              severity="error"

              sx={{
                mb: 2,
              }}
            >
              {errorMessage(deactivateMutation.error)}
            </Alert>
          ) : null}

          <Typography
            sx={{
              color: "text.secondary",

              fontSize: 13,

              lineHeight: 1.7,
            }}
          >
            {deactivateTarget
              ? `${studentName(
                  deactivateTarget,
                )} will become inactive, but the student record will remain available for historical guardian, route and trip records.`
              : ""}
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,

            pb: 3,
          }}
        >
          <Button
            disabled={deactivateMutation.isPending}

            onClick={() => setDeactivateTarget(null)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"

            disabled={deactivateMutation.isPending || !deactivateTarget}

            onClick={() => {
              if (deactivateTarget) {
                deactivateMutation.mutate(deactivateTarget.id);
              }
            }}
          >
            {deactivateMutation.isPending
              ? "Deactivating..."
              : "Deactivate student"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={successMessage !== null}

        autoHideDuration={3500}

        onClose={() => setSuccessMessage(null)}

        anchorOrigin={{
          vertical: "bottom",

          horizontal: "right",
        }}
      >
        <Alert
          severity="success"

          variant="filled"

          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
