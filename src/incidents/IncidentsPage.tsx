import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";

import {
  AddRounded,
  EditRounded,
  WarningAmberRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { IncidentFormDialog } from "./IncidentFormDialog";

import {
  createIncident,
  listIncidents,
  updateIncident,
  type CreateIncidentInput,
  type Incident,
  type IncidentSeverity,
  type IncidentStatus,
  type UpdateIncidentInput,
} from "./incidents.api";

type StatusFilter = "all" | IncidentStatus;

type SeverityFilter = "all" | IncidentSeverity;

const PAGE_SIZES = [10, 25, 50, 100] as const;

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The operation could not be completed.";
}

function severityLabel(severity: IncidentSeverity): string {
  switch (severity) {
    case "low":
      return "Low";

    case "medium":
      return "Medium";

    case "high":
      return "High";

    case "critical":
      return "Critical";
  }
}

function severityColor(
  severity: IncidentSeverity,
): "default" | "info" | "warning" | "error" {
  switch (severity) {
    case "low":
      return "default";

    case "medium":
      return "info";

    case "high":
      return "warning";

    case "critical":
      return "error";
  }
}

function statusLabel(status: IncidentStatus): string {
  switch (status) {
    case "open":
      return "Open";

    case "resolved":
      return "Resolved";

    case "closed":
      return "Closed";
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",

    timeStyle: "short",

    timeZone: "Africa/Nairobi",
  }).format(date);
}

export function IncidentsPage() {
  const { permissions, tenant, activeSchool } = useAuth();

  const queryClient = useQueryClient();

  const tenantId = tenant?.tenantId;

  const schoolId = activeSchool?.id;

  const canRead = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.INCIDENTS_READ,
  );

  const canCreate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.INCIDENTS_CREATE,
  );

  const canUpdate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.INCIDENTS_UPDATE,
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  const [limit, setLimit] = useState<number>(25);

  const [cursor, setCursor] = useState<string | null>(null);

  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);

  const [createOpen, setCreateOpen] = useState(false);

  const [createKey, setCreateKey] = useState(0);

  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  const [mutationError, setMutationError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function resetPaging(): void {
    setCursor(null);

    setCursorHistory([]);
  }

  const incidentsQuery = useQuery({
    queryKey: [
      "incidents",
      tenantId,
      schoolId,
      statusFilter,
      severityFilter,
      limit,
      cursor,
    ],

    enabled: Boolean(tenantId && schoolId && canRead),

    queryFn: async () => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      return listIncidents(tenantId, {
        schoolId,

        status: statusFilter === "all" ? undefined : statusFilter,

        severity: severityFilter === "all" ? undefined : severityFilter,

        limit,

        cursor: cursor ?? undefined,
      });
    },
  });

  async function refreshIncidents(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["incidents"],
    });
  }

  const createMutation = useMutation({
    mutationFn: async (input: CreateIncidentInput) => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      /**
       * Incidents reported from a school-scoped screen always
       * belong to the verified current school.
       */
      return createIncident(
        tenantId,
        {
          ...input,
          schoolId,
        },
        crypto.randomUUID(),
      );
    },

    onSuccess: async () => {
      await refreshIncidents();

      setCreateOpen(false);

      setMutationError(null);

      resetPaging();

      setSuccessMessage("Incident reported successfully.");
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      incidentId,
      input,
    }: {
      incidentId: string;

      input: UpdateIncidentInput;
    }) => {
      if (!tenantId || !schoolId) {
        throw new Error("School context is unavailable");
      }

      return updateIncident(tenantId, incidentId, input);
    },

    onSuccess: async () => {
      await refreshIncidents();

      setEditingIncident(null);

      setMutationError(null);

      setSuccessMessage("Incident updated successfully.");
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  const incidents = incidentsQuery.data?.items ?? [];

  const openCount = incidents.filter(
    (incident) => incident.status === "open",
  ).length;

  const criticalCount = incidents.filter(
    (incident) =>
      incident.severity === "critical" && incident.status === "open",
  ).length;

  if (!activeSchool) {
    return (
      <Alert severity="info">
        Select a school to view or report Incidents.
      </Alert>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          mb: 3,

          display: "flex",

          justifyContent: "space-between",

          alignItems: {
            xs: "stretch",

            sm: "center",
          },

          flexDirection: {
            xs: "column",

            sm: "row",
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
            Incidents
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",

              fontSize: 13.5,
            }}
          >
            Report, investigate and manage safety and operational incidents for{" "}
            {activeSchool.name}.
          </Typography>
        </Box>

        {canCreate ? (
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => {
              setMutationError(null);

              setCreateKey((value) => value + 1);

              setCreateOpen(true);
            }}
          >
            Report incident
          </Button>
        ) : null}
      </Box>

      {!canRead ? (
        <Paper
          elevation={0}
          sx={{
            p: 3,

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <WarningAmberRounded />

          <Typography
            sx={{
              mt: 1,

              fontWeight: 800,
            }}
          >
            Incident reporting
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",

              fontSize: 13,
            }}
          >
            You can report incidents for {activeSchool.name}, but your current
            permissions do not allow access to this school's incident register.
          </Typography>
        </Paper>
      ) : (
        <>
          <Box
            sx={{
              mb: 2,

              display: "grid",

              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",

                md: "repeat(3, minmax(0, 1fr))",
              },

              gap: 1.5,
            }}
          >
            {[
              {
                label: "Shown",
                value: incidents.length,
              },
              {
                label: "Open",
                value: openCount,
              },
              {
                label: "Critical open",
                value: criticalCount,
              },
            ].map((item) => (
              <Paper
                key={item.label}
                elevation={0}
                sx={{
                  p: 2,

                  border: "1px solid",

                  borderColor: "divider",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 22,

                    fontWeight: 850,
                  }}
                >
                  {item.value}
                </Typography>

                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 11.5,
                  }}
                >
                  {item.label}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Paper
            elevation={0}
            sx={{
              mb: 2,

              p: 2,

              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                sm: "repeat(3, minmax(0, 1fr))",
              },

              gap: 1.5,

              border: "1px solid",

              borderColor: "divider",
            }}
          >
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);

                resetPaging();
              }}
            >
              <MenuItem value="all">All</MenuItem>

              <MenuItem value="open">Open</MenuItem>

              <MenuItem value="resolved">Resolved</MenuItem>

              <MenuItem value="closed">Closed</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Severity"
              value={severityFilter}
              onChange={(event) => {
                setSeverityFilter(event.target.value as SeverityFilter);

                resetPaging();
              }}
            >
              <MenuItem value="all">All</MenuItem>

              <MenuItem value="low">Low</MenuItem>

              <MenuItem value="medium">Medium</MenuItem>

              <MenuItem value="high">High</MenuItem>

              <MenuItem value="critical">Critical</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Rows"
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));

                resetPaging();
              }}
            >
              {PAGE_SIZES.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </TextField>
          </Paper>

          {incidentsQuery.isLoading ? (
            <Box
              sx={{
                py: 6,

                display: "grid",

                placeItems: "center",
              }}
            >
              <CircularProgress size={28} />
            </Box>
          ) : null}

          {incidentsQuery.isError ? (
            <Alert
              severity="error"
              sx={{
                mb: 2,
              }}
            >
              {errorMessage(incidentsQuery.error)}
            </Alert>
          ) : null}

          {!incidentsQuery.isLoading &&
          !incidentsQuery.isError &&
          incidents.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 3,

                textAlign: "center",

                border: "1px solid",

                borderColor: "divider",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 750,
                }}
              >
                No incidents found
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,

                  color: "text.secondary",

                  fontSize: 12.5,
                }}
              >
                Try changing the filters or report a new incident.
              </Typography>
            </Paper>
          ) : null}

          {incidents.map((incident) => (
            <Paper
              key={incident.id}
              elevation={0}
              sx={{
                mb: 1.5,

                p: 2.25,

                border: "1px solid",

                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "flex",

                  justifyContent: "space-between",

                  alignItems: {
                    xs: "flex-start",

                    sm: "center",
                  },

                  flexDirection: {
                    xs: "column",

                    sm: "row",
                  },

                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",

                      alignItems: "center",

                      flexWrap: "wrap",

                      gap: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 850,

                        fontSize: 15,
                      }}
                    >
                      {incident.type}
                    </Typography>

                    <Chip
                      size="small"
                      label={severityLabel(incident.severity)}
                      color={severityColor(incident.severity)}
                    />

                    <Chip
                      size="small"
                      variant="outlined"
                      label={statusLabel(incident.status)}
                    />
                  </Box>

                  <Typography
                    sx={{
                      mt: 1,

                      color: "text.secondary",

                      fontSize: 13,

                      lineHeight: 1.6,

                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {incident.description}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,

                      color: "text.secondary",

                      fontSize: 11.5,
                    }}
                  >
                    Reported {formatDateTime(incident.createdAt)}
                  </Typography>
                </Box>

                {canUpdate ? (
                  <Button
                    size="small"
                    startIcon={<EditRounded />}
                    onClick={() => {
                      setMutationError(null);

                      setEditingIncident(incident);
                    }}
                  >
                    Edit
                  </Button>
                ) : null}
              </Box>
            </Paper>
          ))}

          {!incidentsQuery.isLoading && !incidentsQuery.isError ? (
            <Box
              sx={{
                mt: 2,

                display: "flex",

                justifyContent: "space-between",

                alignItems: "center",

                gap: 1,
              }}
            >
              <Button
                disabled={cursorHistory.length === 0}
                onClick={() => {
                  const previous =
                    cursorHistory[cursorHistory.length - 1] ?? null;

                  setCursorHistory((history) => history.slice(0, -1));

                  setCursor(previous);
                }}
              >
                Previous
              </Button>

              <Button
                disabled={!incidentsQuery.data?.nextCursor}
                onClick={() => {
                  const next = incidentsQuery.data?.nextCursor;

                  if (!next) {
                    return;
                  }

                  setCursorHistory((history) => [...history, cursor]);

                  setCursor(next);
                }}
              >
                Next
              </Button>
            </Box>
          ) : null}
        </>
      )}

      <IncidentFormDialog
        key={`create-${createKey}`}
        open={createOpen}
        incident={null}
        saving={createMutation.isPending}
        error={createOpen ? mutationError : null}
        canUpdate={false}
        onClose={() => {
          if (!createMutation.isPending) {
            setCreateOpen(false);

            setMutationError(null);
          }
        }}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input as CreateIncidentInput);
        }}
      />

      <IncidentFormDialog
        key={editingIncident?.id ?? "incident-edit"}
        open={editingIncident !== null}
        incident={editingIncident}
        saving={updateMutation.isPending}
        error={editingIncident ? mutationError : null}
        canUpdate={canUpdate}
        onClose={() => {
          if (!updateMutation.isPending) {
            setEditingIncident(null);

            setMutationError(null);
          }
        }}
        onSubmit={async (input) => {
          if (!editingIncident) {
            return;
          }

          await updateMutation.mutateAsync({
            incidentId: editingIncident.id,

            input: input as UpdateIncidentInput,
          });
        }}
      />

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
