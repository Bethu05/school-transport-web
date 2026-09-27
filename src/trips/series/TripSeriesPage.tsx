import { useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";

import {
  AddRounded,
  CalendarMonthRounded,
  DirectionsBusRounded,
  EditRounded,
  GroupRounded,
  PersonRounded,
  RouteRounded,
  ScheduleRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../../auth/frontend-permissions";

import { listDriversPage, type Driver } from "../../drivers/drivers.api";

import {
  listRouteStops,
  listRoutesPage,
  type Route,
  type RouteStop,
} from "../../routes/routes.api";

import { listStudentsPage, type Student } from "../../students/students.api";

import { scheduleTrip } from "../trips.api";

import { listVehicles, type Vehicle } from "../../vehicles/vehicles.api";

import {
  createTripSeries,
  generateTripSeriesOccurrence,
  listTripSeries,
  listTripSeriesStudents,
  removeTripSeriesStudent,
  setTripSeriesStudent,
  updateTripSeries,
  type CreateTripSeriesInput,
  type GeneratedTripSeriesOccurrence,
  type TripSeries,
  type TripSeriesStudent,
  type UpdateTripSeriesInput,
} from "./trip-series.api";

import { TripSeriesFormDialog } from "./TripSeriesFormDialog";

import { TripSeriesGenerateDialog } from "./TripSeriesGenerateDialog";

import { TripSeriesStudentsDialog } from "./TripSeriesStudentsDialog";

const DAY_LABELS: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The recurring trip operation failed.";
}

function timeLabel(value: string | null): string {
  return value ? value.slice(0, 5) : "—";
}

export function TripSeriesPage() {
  const { permissions, tenant, activeSchool } = useAuth();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const tenantId = tenant?.tenantId;

  const schoolId = activeSchool?.id;

  const canCreate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.TRIPS_CREATE,
  );

  const canUpdate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.TRIPS_UPDATE,
  );

  const canManageRiders = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.TRIPS_MANAGE_RIDERS,
  );

  const canSchedule = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.TRIPS_SCHEDULE,
  );

  const canGenerate = canCreate && canManageRiders;

  const [formOpen, setFormOpen] = useState(false);

  const [formKey, setFormKey] = useState(0);

  const [editingSeries, setEditingSeries] = useState<TripSeries | null>(null);

  const [studentsSeries, setStudentsSeries] = useState<TripSeries | null>(null);

  const [generateSeries, setGenerateSeries] = useState<TripSeries | null>(null);

  const [generateKey, setGenerateKey] = useState(0);

  const [mutationError, setMutationError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [generated, setGenerated] =
    useState<GeneratedTripSeriesOccurrence | null>(null);

  // ==========================================================
  // DATA
  // ==========================================================

  const seriesQuery = useQuery({
    queryKey: ["trip-series", tenantId, schoolId],

    enabled: Boolean(tenantId && schoolId),

    queryFn: async () => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      const items = await listTripSeries(tenantId);

      return items.filter((item) => item.schoolId === schoolId);
    },
  });

  const routesQuery = useQuery({
    queryKey: ["trip-series-routes", tenantId, schoolId],

    enabled: Boolean(tenantId && schoolId),

    queryFn: async () => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      const response = await listRoutesPage(tenantId, {
        page: 1,
        limit: 100,
        schoolId,
        status: "active",
      });

      return response.items;
    },
  });

  const driversQuery = useQuery({
    queryKey: ["trip-series-drivers", tenantId, schoolId],

    enabled: Boolean(tenantId && schoolId),

    queryFn: async () => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      const response = await listDriversPage(tenantId, {
        page: 1,
        limit: 100,
        schoolId,
        includeShared: true,
        status: "active",
      });

      return response.items;
    },
  });

  const vehiclesQuery = useQuery({
    queryKey: ["trip-series-vehicles", tenantId, schoolId],

    enabled: Boolean(tenantId && schoolId),

    queryFn: async () => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      const response = await listVehicles(tenantId, {
        page: 1,
        limit: 100,
        schoolId,
        includeShared: true,
        status: "active",
      });

      return response.items;
    },
  });

  const studentsQuery = useQuery({
    queryKey: ["trip-series-students-options", tenantId, schoolId],

    enabled: Boolean(tenantId && schoolId && studentsSeries),

    queryFn: async () => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      const response = await listStudentsPage(tenantId, {
        page: 1,
        limit: 100,
        schoolId,
        status: "active",
      });

      return response.items;
    },
  });

  const subscriptionsQuery = useQuery({
    queryKey: ["trip-series-students", tenantId, studentsSeries?.id],

    enabled: Boolean(tenantId && studentsSeries),

    queryFn: async () => {
      if (!tenantId || !studentsSeries) {
        throw new Error("Recurring trip is unavailable");
      }

      return listTripSeriesStudents(tenantId, studentsSeries.id);
    },
  });

  const routeStopsQuery = useQuery({
    queryKey: ["trip-series-route-stops", tenantId, studentsSeries?.routeId],

    enabled: Boolean(tenantId && studentsSeries),

    queryFn: async () => {
      if (!tenantId || !studentsSeries) {
        throw new Error("Recurring trip is unavailable");
      }

      return listRouteStops(tenantId, studentsSeries.routeId);
    },
  });

  const routes: Route[] = routesQuery.data ?? [];

  const drivers: Driver[] = driversQuery.data ?? [];

  const vehicles: Vehicle[] = vehiclesQuery.data ?? [];

  const students: Student[] = studentsQuery.data ?? [];

  const subscriptions: TripSeriesStudent[] = subscriptionsQuery.data ?? [];

  const routeStops: RouteStop[] = routeStopsQuery.data ?? [];

  // ==========================================================
  // MUTATIONS
  // ==========================================================

  const createMutation = useMutation({
    mutationFn: async (input: CreateTripSeriesInput) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return createTripSeries(tenantId, input);
    },

    onSuccess: async () => {
      setMutationError(null);

      setFormOpen(false);

      setEditingSeries(null);

      setSuccessMessage("Recurring trip created.");

      await queryClient.invalidateQueries({
        queryKey: ["trip-series"],
      });
    },

    onError: (error) => setMutationError(errorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      seriesId,
      input,
    }: {
      seriesId: string;

      input: UpdateTripSeriesInput;
    }) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return updateTripSeries(tenantId, seriesId, input);
    },

    onSuccess: async () => {
      setMutationError(null);

      setFormOpen(false);

      setEditingSeries(null);

      setSuccessMessage("Recurring trip updated.");

      await queryClient.invalidateQueries({
        queryKey: ["trip-series"],
      });
    },

    onError: (error) => setMutationError(errorMessage(error)),
  });

  const studentMutation = useMutation({
    mutationFn: async ({
      studentId,
      stopId,
    }: {
      studentId: string;

      stopId: string;
    }) => {
      if (!tenantId || !studentsSeries) {
        throw new Error("Recurring trip is unavailable");
      }

      return setTripSeriesStudent(tenantId, studentsSeries.id, {
        studentId,
        stopId,
        status: "active",
      });
    },

    onSuccess: async () => {
      setMutationError(null);

      setSuccessMessage("Student recurring booking saved.");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["trip-series-students"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["trip-series"],
        }),
      ]);
    },

    onError: (error) => setMutationError(errorMessage(error)),
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!tenantId || !studentsSeries) {
        throw new Error("Recurring trip is unavailable");
      }

      await removeTripSeriesStudent(tenantId, studentsSeries.id, studentId);
    },

    onSuccess: async () => {
      setMutationError(null);

      setSuccessMessage("Student removed from recurring trip.");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["trip-series-students"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["trip-series"],
        }),
      ]);
    },

    onError: (error) => setMutationError(errorMessage(error)),
  });

  const generateMutation = useMutation({
    mutationFn: async (serviceDate: string) => {
      if (!tenantId || !generateSeries) {
        throw new Error("Recurring trip is unavailable");
      }

      return generateTripSeriesOccurrence(
        tenantId,
        generateSeries.id,
        serviceDate,
      );
    },

    onSuccess: async (result) => {
      setMutationError(null);

      setGenerateSeries(null);

      setGenerated(result);

      setSuccessMessage(
        result.reused
          ? "This dated trip already existed and was reused."
          : "Dated trip and student manifest generated.",
      );

      await queryClient.invalidateQueries({
        queryKey: ["trips"],
      });
    },

    onError: (error) => setMutationError(errorMessage(error)),
  });

  const scheduleMutation = useMutation({
    mutationFn: async (tripId: string) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return scheduleTrip(tenantId, tripId);
    },

    onSuccess: async () => {
      setSuccessMessage("Generated trip scheduled.");

      setGenerated((current) =>
        current
          ? {
              ...current,
              tripStatus: "scheduled",
            }
          : current,
      );

      await queryClient.invalidateQueries({
        queryKey: ["trips"],
      });
    },

    onError: (error) => setMutationError(errorMessage(error)),
  });

  const series = seriesQuery.data ?? [];

  const resourceMap = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle] as const)),
    [vehicles],
  );

  if (!activeSchool) {
    return (
      <Alert severity="info">
        Select a school to manage recurring transport.
      </Alert>
    );
  }

  const loading =
    seriesQuery.isLoading ||
    routesQuery.isLoading ||
    driversQuery.isLoading ||
    vehiclesQuery.isLoading;

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: {
            xs: "stretch",
            md: "center",
          },
          flexDirection: {
            xs: "column",
            md: "row",
          },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: 26,
              fontWeight: 850,
              letterSpacing: "-0.03em",
            }}
          >
            Recurring Trips
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              color: "text.secondary",
              fontSize: 13,
            }}
          >
            Define the normal transport routine for {activeSchool.name}, then
            generate dated operational trips and manifests.
          </Typography>
        </Box>

        {canCreate ? (
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => {
              setMutationError(null);

              setEditingSeries(null);

              setFormKey((value) => value + 1);

              setFormOpen(true);
            }}
          >
            New recurring trip
          </Button>
        ) : null}
      </Box>

      {mutationError && !formOpen && !studentsSeries && !generateSeries ? (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setMutationError(null)}
        >
          {mutationError}
        </Alert>
      ) : null}

      {generated ? (
        <Alert
          severity={generated.tripStatus === "scheduled" ? "success" : "info"}
          sx={{ mb: 2 }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: {
                xs: "stretch",
                md: "center",
              },
              justifyContent: "space-between",
              flexDirection: {
                xs: "column",
                md: "row",
              },
            }}
          >
            <Box>
              <strong>{generated.tripSeriesName}</strong>
              {" — "}
              {generated.serviceDate}: {generated.passengerCount} students,{" "}
              {generated.availableSeats ?? "—"} seats remaining. Status:{" "}
              {generated.tripStatus}.
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              {generated.tripStatus === "draft" && canSchedule ? (
                <Button
                  size="small"
                  variant="contained"
                  disabled={scheduleMutation.isPending}
                  onClick={() => scheduleMutation.mutate(generated.tripId)}
                >
                  Schedule trip
                </Button>
              ) : null}

              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate("/trips")}
              >
                Open Trips
              </Button>
            </Box>
          </Box>
        </Alert>
      ) : null}

      <Alert severity="info" sx={{ mb: 2 }}>
        Recurring students are planning data. Once a dated trip is generated,
        its student manifest becomes an independent operational snapshot.
      </Alert>

      {loading ? (
        <Box sx={{ py: 8, display: "grid", placeItems: "center" }}>
          <CircularProgress />
        </Box>
      ) : series.length === 0 ? (
        <Alert severity="warning">
          No recurring trips are configured for this school yet.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {series.map((item) => {
            const vehicle = item.defaultVehicleId
              ? resourceMap.get(item.defaultVehicleId)
              : undefined;

            const capacity = vehicle?.seatCapacity ?? null;

            const remaining =
              capacity === null ? null : capacity - item.studentCount;

            return (
              <Paper
                key={item.id}
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
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 850,
                        fontSize: 17,
                      }}
                    >
                      {item.name}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        color: "text.secondary",
                        fontSize: 11.5,
                      }}
                    >
                      {item.code ?? "No service code"}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    color={item.status === "active" ? "success" : "default"}
                    label={item.status}
                  />
                </Box>

                <Box
                  sx={{
                    mt: 2,
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{ color: "text.secondary", fontSize: 10.5 }}
                    >
                      Route
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontWeight: 700,
                        fontSize: 12.5,
                      }}
                    >
                      <RouteRounded
                        sx={{
                          fontSize: 14,
                          mr: 0.5,
                          verticalAlign: "text-bottom",
                        }}
                      />
                      {item.routeName}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{ color: "text.secondary", fontSize: 10.5 }}
                    >
                      Routine
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontWeight: 700,
                        fontSize: 12.5,
                      }}
                    >
                      <ScheduleRounded
                        sx={{
                          fontSize: 14,
                          mr: 0.5,
                          verticalAlign: "text-bottom",
                        }}
                      />
                      {timeLabel(item.startTime)} → {timeLabel(item.endTime)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{ color: "text.secondary", fontSize: 10.5 }}
                    >
                      Driver
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontWeight: 700,
                        fontSize: 12.5,
                      }}
                    >
                      <PersonRounded
                        sx={{
                          fontSize: 14,
                          mr: 0.5,
                          verticalAlign: "text-bottom",
                        }}
                      />
                      {item.driverName ?? "Not assigned"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      sx={{ color: "text.secondary", fontSize: 10.5 }}
                    >
                      Vehicle
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.25,
                        fontWeight: 700,
                        fontSize: 12.5,
                      }}
                    >
                      <DirectionsBusRounded
                        sx={{
                          fontSize: 14,
                          mr: 0.5,
                          verticalAlign: "text-bottom",
                        }}
                      />
                      {item.vehicleRegistrationNumber ?? "Not assigned"}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.75,
                  }}
                >
                  {item.operatingDays.map((day) => (
                    <Chip
                      key={day}
                      size="small"
                      label={DAY_LABELS[day] ?? day}
                    />
                  ))}

                  <Chip
                    size="small"
                    icon={<GroupRounded />}
                    label={`${item.studentCount} students`}
                    color={
                      capacity !== null && item.studentCount > capacity
                        ? "error"
                        : "default"
                    }
                  />

                  {capacity !== null ? (
                    <Chip size="small" label={`${capacity} seats`} />
                  ) : null}

                  {remaining !== null ? (
                    <Chip
                      size="small"
                      label={`${remaining} available`}
                      color={
                        remaining < 0
                          ? "error"
                          : remaining <= 3
                            ? "warning"
                            : "success"
                      }
                    />
                  ) : null}
                </Box>

                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  {canManageRiders ? (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<GroupRounded />}
                      onClick={() => {
                        setMutationError(null);

                        setStudentsSeries(item);
                      }}
                    >
                      Students
                    </Button>
                  ) : null}

                  {canGenerate ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CalendarMonthRounded />}
                      disabled={item.status !== "active"}
                      onClick={() => {
                        setMutationError(null);

                        setGenerateKey((value) => value + 1);

                        setGenerateSeries(item);
                      }}
                    >
                      Generate Trip
                    </Button>
                  ) : null}

                  {canUpdate ? (
                    <Button
                      size="small"
                      startIcon={<EditRounded />}
                      onClick={() => {
                        setMutationError(null);

                        setEditingSeries(item);

                        setFormKey((value) => value + 1);

                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  ) : null}
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      <TripSeriesFormDialog
        key={formKey}
        open={formOpen}
        series={editingSeries}
        routes={routes}
        drivers={drivers}
        vehicles={vehicles}
        saving={createMutation.isPending || updateMutation.isPending}
        error={formOpen ? mutationError : null}
        onClose={() => {
          setFormOpen(false);

          setEditingSeries(null);

          setMutationError(null);
        }}
        onSubmit={(input) => {
          if (editingSeries) {
            updateMutation.mutate({
              seriesId: editingSeries.id,

              input,
            });

            return;
          }

          createMutation.mutate(input as CreateTripSeriesInput);
        }}
      />

      {studentsSeries ? (
        <TripSeriesStudentsDialog
          open
          series={studentsSeries}
          students={students}
          routeStops={routeStops}
          subscriptions={subscriptions}
          loading={
            studentsQuery.isLoading ||
            subscriptionsQuery.isLoading ||
            routeStopsQuery.isLoading
          }
          saving={studentMutation.isPending || removeStudentMutation.isPending}
          error={mutationError}
          onClose={() => {
            setStudentsSeries(null);

            setMutationError(null);
          }}
          onSet={(studentId, stopId) =>
            studentMutation.mutate({
              studentId,
              stopId,
            })
          }
          onRemove={(studentId) => removeStudentMutation.mutate(studentId)}
        />
      ) : null}

      {generateSeries ? (
        <TripSeriesGenerateDialog
          key={generateKey}
          open
          series={generateSeries}
          saving={generateMutation.isPending}
          error={mutationError}
          onClose={() => {
            setGenerateSeries(null);

            setMutationError(null);
          }}
          onGenerate={(serviceDate) => generateMutation.mutate(serviceDate)}
        />
      ) : null}

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3500}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  );
}
