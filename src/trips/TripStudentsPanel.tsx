import { useMemo, useState } from "react";

import {
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listStudentsPage, type Student } from "../students/students.api";

import {
  addTripRider,
  listTripRiders,
  removeTripRider,
  type Trip,
  type TripRider,
} from "./trips.api";

interface TripStudentsPanelProps {
  tenantId: string;

  trip: Trip;

  canManage: boolean;

  canReadStudents: boolean;

  disabled: boolean;

  onChanged: () => void;
}

function studentLabel(student: Student): string {
  return [student.firstName, student.lastName].filter(Boolean).join(" ");
}

function riderLabel(rider: TripRider): string {
  return [rider.studentFirstName, rider.studentLastName]
    .filter(Boolean)
    .join(" ");
}

export function TripStudentsPanel({
  tenantId,
  trip,
  canManage,
  canReadStudents,
  disabled,
  onChanged,
}: TripStudentsPanelProps) {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");

  const planningStatus = trip.status === "draft" || trip.status === "scheduled";

  const editable = canManage && canReadStudents && planningStatus && !disabled;

  const ridersQuery = useQuery({
    queryKey: ["trip-riders", tenantId, trip.id],

    enabled: Boolean(tenantId && trip.id),

    queryFn: () => listTripRiders(tenantId, trip.id),
  });

  /*
   * Only fetch the full school Student directory when this
   * operator can actually edit the manifest.
   *
   * Read-only inspection needs only GET /trips/:id/riders.
   */
  const studentsQuery = useQuery({
    queryKey: ["trip-student-candidates", tenantId, trip.schoolId],

    enabled:
      Boolean(tenantId && trip.schoolId) &&
      canManage &&
      canReadStudents &&
      planningStatus,

    queryFn: async () => {
      const students: Student[] = [];

      let page = 1;
      let totalPages = 1;

      do {
        const result = await listStudentsPage(tenantId, {
          page,

          limit: 100,

          schoolId: trip.schoolId,

          status: "active",
        });

        students.push(...result.items);

        totalPages = result.totalPages;

        page += 1;
      } while (page <= totalPages);

      return students;
    },
  });

  const activeRiders = useMemo(
    () =>
      (ridersQuery.data ?? []).filter((rider) => rider.status === "assigned"),
    [ridersQuery.data],
  );

  const activeByStudent = useMemo(
    () =>
      new Map(activeRiders.map((rider) => [rider.studentId, rider] as const)),
    [activeRiders],
  );

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    const students = studentsQuery.data ?? [];

    if (!query) {
      return students;
    }

    return students.filter((student) =>
      [
        student.firstName,
        student.lastName,
        student.externalRef ?? "",
        student.grade ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [studentsQuery.data, search]);

  const mutation = useMutation({
    mutationFn: async (studentId: string) => {
      const existing = activeByStudent.get(studentId);

      if (existing) {
        await removeTripRider(tenantId, trip.id, existing.id);

        return;
      }

      await addTripRider(tenantId, trip.id, studentId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["trip-riders", tenantId, trip.id],
      });

      onChanged();
    },
  });

  return (
    <Paper
      elevation={0}
      sx={{
        gridColumn: "1 / -1",

        p: 2,

        border: "1px solid",

        borderColor: "divider",

        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",

          alignItems: "center",

          justifyContent: "space-between",

          gap: 1,

          mb: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontWeight: 850,

              fontSize: 13.5,
            }}
          >
            Students
          </Typography>

          <Typography
            sx={{
              mt: 0.25,

              color: "text.secondary",

              fontSize: 11.5,
            }}
          >
            Dated trip passenger manifest
          </Typography>
        </Box>

        <Chip
          size="small"
          color={activeRiders.length > 0 ? "primary" : "warning"}
          label={`${activeRiders.length} assigned`}
        />
      </Box>

      {ridersQuery.isLoading ? (
        <Box
          sx={{
            py: 3,

            display: "grid",

            placeItems: "center",
          }}
        >
          <CircularProgress size={24} />
        </Box>
      ) : ridersQuery.isError ? (
        <Alert severity="error">Unable to load the Student manifest.</Alert>
      ) : null}

      {!ridersQuery.isLoading &&
      !ridersQuery.isError &&
      activeRiders.length === 0 ? (
        <Alert
          severity="warning"
          sx={{
            mb: editable ? 1.5 : 0,
          }}
        >
          No Students are assigned. Boarding cannot begin until at least one
          Student is assigned.
        </Alert>
      ) : null}

      {!planningStatus ? (
        <Box
          sx={{
            mt: activeRiders.length ? 1.5 : 0,

            display: "grid",

            gap: 1,
          }}
        >
          {activeRiders.map((rider) => (
            <Box
              key={rider.id}
              sx={{
                display: "flex",

                justifyContent: "space-between",

                gap: 2,

                py: 0.75,

                borderBottom: "1px solid",

                borderColor: "divider",

                "&:last-child": {
                  borderBottom: "none",
                },
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 13,

                    fontWeight: 750,
                  }}
                >
                  {riderLabel(rider)}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.2,

                    color: "text.secondary",

                    fontSize: 11,
                  }}
                >
                  {rider.stopName}
                </Typography>
              </Box>

              <Chip
                size="small"
                label="Assigned"
                color="success"
                variant="outlined"
              />
            </Box>
          ))}
        </Box>
      ) : null}

      {planningStatus && !canManage ? (
        <Alert
          severity="info"
          sx={{
            mt: activeRiders.length ? 1.5 : 0,
          }}
        >
          You can inspect this Student manifest, but your permissions do not
          allow changes.
        </Alert>
      ) : null}

      {planningStatus && canManage && !canReadStudents ? (
        <Alert
          severity="info"
          sx={{
            mt: activeRiders.length ? 1.5 : 0,
          }}
        >
          Student directory access is required before Students can be added or
          removed.
        </Alert>
      ) : null}

      {planningStatus && canManage && canReadStudents ? (
        <Box
          sx={{
            mt: 1.5,
          }}
        >
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Students by name, grade or reference"
            disabled={disabled || mutation.isPending}
          />

          {studentsQuery.isLoading ? (
            <Box
              sx={{
                py: 3,

                display: "grid",

                placeItems: "center",
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : studentsQuery.isError ? (
            <Alert
              severity="error"
              sx={{
                mt: 1.5,
              }}
            >
              Unable to load the school Student directory.
            </Alert>
          ) : (
            <Box
              sx={{
                mt: 1.25,

                maxHeight: 280,

                overflowY: "auto",

                border: "1px solid",

                borderColor: "divider",

                borderRadius: 1.5,
              }}
            >
              {visibleStudents.length === 0 ? (
                <Typography
                  sx={{
                    p: 2,

                    color: "text.secondary",

                    fontSize: 12,
                  }}
                >
                  No Students match this search.
                </Typography>
              ) : (
                visibleStudents.map((student) => {
                  const rider = activeByStudent.get(student.id);

                  const selected = Boolean(rider);

                  const savingThis =
                    mutation.isPending && mutation.variables === student.id;

                  return (
                    <Box
                      key={student.id}
                      sx={{
                        px: 1.25,

                        py: 0.7,

                        display: "flex",

                        alignItems: "center",

                        gap: 1,

                        borderBottom: "1px solid",

                        borderColor: "divider",

                        "&:last-child": {
                          borderBottom: "none",
                        },
                      }}
                    >
                      <Checkbox
                        checked={selected}
                        disabled={!editable || mutation.isPending}
                        onChange={() => mutation.mutate(student.id)}
                      />

                      <Box
                        sx={{
                          minWidth: 0,

                          flex: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 13,

                            fontWeight: 750,
                          }}
                        >
                          {studentLabel(student)}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.2,

                            color: "text.secondary",

                            fontSize: 10.75,
                          }}
                        >
                          {[
                            student.grade ? `Grade ${student.grade}` : null,

                            student.externalRef
                              ? `Ref ${student.externalRef}`
                              : null,

                            rider?.stopName ?? null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Active Student"}
                        </Typography>
                      </Box>

                      {savingThis ? (
                        <CircularProgress size={18} />
                      ) : selected ? (
                        <Chip
                          size="small"
                          label="Assigned"
                          color="success"
                          variant="outlined"
                        />
                      ) : null}
                    </Box>
                  );
                })
              )}
            </Box>
          )}

          {mutation.isError ? (
            <Alert
              severity="error"
              sx={{
                mt: 1.5,
              }}
            >
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Student assignment could not be changed."}
            </Alert>
          ) : null}
        </Box>
      ) : null}
    </Paper>
  );
}
