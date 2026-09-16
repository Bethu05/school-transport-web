import { useMemo, useState } from "react";

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
  AddRounded,
  ArchiveRounded,
  EditRounded,
  LocationOnRounded,
  PlaceRounded,
  SearchRounded,
  SchoolRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { useAuth } from "../auth/AuthProvider";

import { PaginationControls } from "../components/PaginationControls";

import { listSchools, type School } from "../schools/schools.api";

import {
  createStop,
  deactivateStop,
  listStopsPage,
  updateStop,
  type CreateStopInput,
  type Stop,
  type StopStatus,
  type UpdateStopInput,
} from "./stops.api";

import { StopFormDialog } from "./StopFormDialog";

const EMPTY_STOPS: Stop[] = [];

const EMPTY_SCHOOLS: School[] = [];

type StatusFilter = "all" | StopStatus;

function statusLabel(status: StopStatus): string {
  switch (status) {
    case "active":
      return "Active";

    case "inactive":
      return "Inactive";
  }
}

function statusColor(status: StopStatus): string {
  switch (status) {
    case "active":
      return "#5F9471";

    case "inactive":
      return "#85898F";
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The operation could not be completed.";
}

export function StopsPage() {
  const { permissions, tenant } = useAuth();

  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<StatusFilter>("active");

  const [schoolId, setSchoolId] = useState("all");

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  const [formOpen, setFormOpen] = useState(false);

  const [editingStop, setEditingStop] = useState<Stop | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<Stop | null>(null);

  const [mutationError, setMutationError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const tenantId = tenant?.tenantId;

  const canCreate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.STOPS_CREATE,
  );

  const canUpdate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.STOPS_UPDATE,
  );

  const canDeactivate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.STOPS_DEACTIVATE,
  );

  const schoolsQuery = useQuery({
    queryKey: ["schools", tenantId],

    enabled: Boolean(tenantId),

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listSchools(tenantId);
    },
  });

  const stopsQuery = useQuery({
    queryKey: ["stops-page", tenantId, search, status, schoolId, page, limit],

    enabled: Boolean(tenantId),

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listStopsPage(tenantId, {
        page,

        limit,

        search: search.trim() || undefined,

        status: status === "all" ? undefined : status,

        schoolId: schoolId === "all" ? undefined : schoolId,
      });
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["stops-summary", tenantId],

    enabled: Boolean(tenantId),

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      const [all, active, inactive] = await Promise.all([
        listStopsPage(tenantId, {
          page: 1,
          limit: 1,
        }),

        listStopsPage(tenantId, {
          page: 1,
          limit: 1,
          status: "active",
        }),

        listStopsPage(tenantId, {
          page: 1,
          limit: 1,
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

  async function refreshStops(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["stops-page"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["stops-summary"],
      }),

      /**
       * RouteStopsDialog uses this compatibility query key.
       */
      queryClient.invalidateQueries({
        queryKey: ["stops"],
      }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: async (input: CreateStopInput) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return createStop(tenantId, input);
    },

    onSuccess: async () => {
      await refreshStops();

      setPage(1);

      setFormOpen(false);

      setEditingStop(null);

      setMutationError(null);

      setSuccessMessage("Stop added successfully.");
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      stopId: mutationStopId,
      input,
    }: {
      stopId: string;

      input: UpdateStopInput;
    }) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return updateStop(tenantId, mutationStopId, input);
    },

    onSuccess: async () => {
      await refreshStops();

      setFormOpen(false);

      setEditingStop(null);

      setMutationError(null);

      setSuccessMessage("Stop updated successfully.");
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (stopIdToDeactivate: string) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return deactivateStop(tenantId, stopIdToDeactivate);
    },

    onSuccess: async () => {
      await refreshStops();

      setPage(1);

      setDeactivateTarget(null);

      setSuccessMessage("Stop deactivated successfully.");
    },
  });

  const schools = schoolsQuery.data ?? EMPTY_SCHOOLS;

  const stops = stopsQuery.data?.items ?? EMPTY_STOPS;

  const schoolById = useMemo(
    () => new Map(schools.map((school) => [school.id, school])),
    [schools],
  );

  function schoolName(stop: Stop): string {
    if (stop.schoolId === null) {
      return "Shared stop";
    }

    return schoolById.get(stop.schoolId)?.name ?? "School unavailable";
  }

  const summary = summaryQuery.data ?? {
    total: 0,
    active: 0,
    inactive: 0,
  };

  function openCreate(): void {
    setMutationError(null);

    setEditingStop(null);

    setFormOpen(true);
  }

  function openEdit(stop: Stop): void {
    setMutationError(null);

    setEditingStop(stop);

    setFormOpen(true);
  }

  function closeForm(): void {
    if (createMutation.isPending || updateMutation.isPending) {
      return;
    }

    setMutationError(null);

    setFormOpen(false);

    setEditingStop(null);
  }

  async function submitStop(
    input: CreateStopInput | UpdateStopInput,
  ): Promise<void> {
    setMutationError(null);

    if (editingStop) {
      await updateMutation.mutateAsync({
        stopId: editingStop.id,

        input: input as UpdateStopInput,
      });

      return;
    }

    await createMutation.mutateAsync(input as CreateStopInput);
  }

  const formSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Box>
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
            variant="h4"

            sx={{
              fontWeight: 900,
            }}
          >
            Stops
          </Typography>

          <Typography
            sx={{
              mt: 0.75,

              color: "text.secondary",

              fontSize: 13,
            }}
          >
            Manage shared and school-specific transport stops. Active stops are
            shown by default.
          </Typography>
        </Box>

        {canCreate ? (
          <Button
            variant="contained"

            startIcon={<AddRounded />}

            onClick={openCreate}

            disabled={schoolsQuery.isLoading}
          >
            Add stop
          </Button>
        ) : null}
      </Box>

      <Box
        sx={{
          mb: 2,

          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            md: "repeat(3, minmax(0, 1fr))",
          },

          gap: 1.5,
        }}
      >
        {[
          {
            label: "Total stops",

            value: summary.total,

            icon: <PlaceRounded />,
          },

          {
            label: "Active",

            value: summary.active,

            icon: <LocationOnRounded />,
          },

          {
            label: "Inactive",

            value: summary.inactive,

            icon: <LocationOnRounded />,
          },
        ].map((item) => (
          <Paper
            key={item.label}

            elevation={0}

            sx={{
              p: 2.25,

              border: "1px solid",

              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "flex",

                alignItems: "center",

                justifyContent: "space-between",

                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 10.5,

                    fontWeight: 800,

                    textTransform: "uppercase",

                    letterSpacing: "0.08em",
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

                  bgcolor: "action.hover",

                  color: "primary.main",
                }}
              >
                {item.icon}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

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

              lg: "minmax(0, 1fr) 220px 190px",
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

            label="Search stops"

            placeholder="Name, code or address"

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
            <InputLabel id="stop-school-label">School</InputLabel>

            <Select
              labelId="stop-school-label"

              label="School"

              value={schoolId}

              onChange={(event) => {
                setSchoolId(event.target.value);

                setPage(1);
              }}
            >
              <MenuItem value="all">All schools</MenuItem>

              {schools.map((school) => (
                <MenuItem
                  key={school.id}

                  value={school.id}
                >
                  {school.name}
                  {school.code ? ` (${school.code})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel id="stop-status-label">Status</InputLabel>

            <Select
              labelId="stop-status-label"

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

      {schoolsQuery.isError ? (
        <Alert
          severity="warning"

          sx={{
            mb: 2,
          }}
        >
          School names could not be loaded. Existing stops can still be viewed,
          but a school-specific stop cannot be created until the school list is
          available.
        </Alert>
      ) : null}

      {stopsQuery.isLoading ? (
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

      {stopsQuery.isError ? (
        <Alert severity="error">{errorMessage(stopsQuery.error)}</Alert>
      ) : null}

      {!stopsQuery.isLoading && !stopsQuery.isError && stops.length === 0 ? (
        <Paper
          elevation={0}

          sx={{
            py: 8,

            px: 3,

            textAlign: "center",

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <LocationOnRounded
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
            No stops found
          </Typography>
        </Paper>
      ) : null}

      {!stopsQuery.isLoading && !stopsQuery.isError && stops.length > 0 ? (
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

              gridTemplateColumns: "1.2fr .65fr .95fr 1.4fr .65fr .65fr 90px",

              gap: 2,

              bgcolor: "action.hover",

              borderBottom: "1px solid",

              borderColor: "divider",
            }}
          >
            {[
              "Stop",
              "Code",
              "School",
              "Address",
              "Geofence",
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

          {stops.map((stop, index) => (
            <Box
              key={stop.id}

              sx={{
                px: 2.5,

                py: 2,

                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  lg: "1.2fr .65fr .95fr 1.4fr .65fr .65fr 90px",
                },

                alignItems: "center",

                gap: {
                  xs: 1.2,

                  lg: 2,
                },

                borderBottom: index === stops.length - 1 ? "none" : "1px solid",

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

                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    width: 38,

                    height: 38,

                    display: "grid",

                    placeItems: "center",

                    borderRadius: 2,

                    bgcolor: "rgba(201,165,92,0.10)",

                    color: "primary.main",
                  }}
                >
                  <LocationOnRounded />
                </Box>

                <Box
                  sx={{
                    minWidth: 0,
                  }}
                >
                  <Typography
                    noWrap

                    sx={{
                      fontSize: 12.5,

                      fontWeight: 800,
                    }}
                  >
                    {stop.name}
                  </Typography>

                  <Typography
                    noWrap

                    sx={{
                      color: "text.secondary",

                      fontSize: 10.5,
                    }}
                  >
                    {stop.latitude.toFixed(5)}
                    {", "}
                    {stop.longitude.toFixed(5)}
                  </Typography>
                </Box>
              </Box>

              <Typography
                sx={{
                  fontSize: 12,

                  fontWeight: 750,
                }}
              >
                {stop.code ?? "—"}
              </Typography>

              <Box
                sx={{
                  display: "flex",

                  alignItems: "center",

                  gap: 0.7,

                  minWidth: 0,
                }}
              >
                <SchoolRounded
                  sx={{
                    fontSize: 17,

                    color: "text.secondary",
                  }}
                />

                <Typography
                  noWrap

                  sx={{
                    fontSize: 12,
                  }}
                >
                  {schoolName(stop)}
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: 12,

                  color: stop.address ? "text.primary" : "text.secondary",
                }}
              >
                {stop.address ?? "No address recorded"}
              </Typography>

              <Typography
                sx={{
                  fontSize: 12,

                  fontWeight: 700,
                }}
              >
                {stop.geofenceRadiusMeters} m
              </Typography>

              <Chip
                size="small"

                label={statusLabel(stop.status)}

                sx={{
                  color: statusColor(stop.status),

                  bgcolor: `${statusColor(stop.status)}14`,

                  border: "1px solid",

                  borderColor: `${statusColor(stop.status)}30`,
                }}
              />

              <Box
                sx={{
                  display: "flex",
                }}
              >
                {canUpdate ? (
                  <Tooltip title="Edit stop">
                    <IconButton
                      size="small"

                      onClick={() => openEdit(stop)}
                    >
                      <EditRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}

                {canDeactivate && stop.status === "active" ? (
                  <Tooltip title="Deactivate stop">
                    <IconButton
                      size="small"

                      onClick={() => setDeactivateTarget(stop)}
                    >
                      <ArchiveRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}

                {!canUpdate && !canDeactivate ? (
                  <Typography
                    sx={{
                      color: "text.secondary",

                      fontSize: 12,
                    }}
                  >
                    —
                  </Typography>
                ) : null}
              </Box>
            </Box>
          ))}

          <PaginationControls
            page={stopsQuery.data?.page ?? page}

            limit={stopsQuery.data?.limit ?? limit}

            total={stopsQuery.data?.total ?? 0}

            totalPages={stopsQuery.data?.totalPages ?? 0}

            onPageChange={setPage}

            onLimitChange={(nextLimit) => {
              setLimit(nextLimit);

              setPage(1);
            }}
          />
        </Paper>
      ) : null}

      <StopFormDialog
        key={`${formOpen ? "open" : "closed"}:${editingStop?.id ?? "new"}`}

        open={formOpen}

        stop={editingStop}

        stopSchoolName={editingStop ? schoolName(editingStop) : ""}

        schools={schools}

        saving={formSaving}

        error={mutationError}

        onClose={closeForm}

        onSubmit={submitStop}
      />

      <Dialog
        open={deactivateTarget !== null}

        onClose={() =>
          !deactivateMutation.isPending && setDeactivateTarget(null)
        }

        maxWidth="xs"

        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 850,
          }}
        >
          Deactivate stop?
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
              ? `${deactivateTarget.name} will become inactive. Historical route and trip records remain intact.`
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
              : "Deactivate stop"}
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
