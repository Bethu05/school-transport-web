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
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import { DeleteOutlineRounded, PersonAddRounded } from "@mui/icons-material";

import type { RouteStop } from "../../routes/routes.api";

import type { Student } from "../../students/students.api";

import type { TripSeries, TripSeriesStudent } from "./trip-series.api";

interface Props {
  open: boolean;

  series: TripSeries;

  students: readonly Student[];

  routeStops: readonly RouteStop[];

  subscriptions: readonly TripSeriesStudent[];

  loading: boolean;

  saving: boolean;

  error: string | null;

  onClose: () => void;

  onSet: (studentId: string, stopId: string) => void;

  onRemove: (studentId: string) => void;
}

export function TripSeriesStudentsDialog({
  open,
  series,
  students,
  routeStops,
  subscriptions,
  loading,
  saving,
  error,
  onClose,
  onSet,
  onRemove,
}: Props) {
  const [studentId, setStudentId] = useState("");

  const [stopId, setStopId] = useState("");

  const activeCount = subscriptions.filter(
    (item) => item.status === "active",
  ).length;

  const subscriptionByStudent = useMemo(
    () => new Map(subscriptions.map((item) => [item.studentId, item] as const)),
    [subscriptions],
  );

  const selectedExisting = studentId
    ? subscriptionByStudent.get(studentId)
    : undefined;

  function chooseStudent(value: string) {
    setStudentId(value);

    const existing = subscriptionByStudent.get(value);

    setStopId(existing?.stopId ?? "");
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ fontWeight: 850 }}>
        Student manifest plan — {series.name}
      </DialogTitle>

      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Alert severity="info" sx={{ mb: 2 }}>
          These are recurring bookings. When a dated trip is generated, the
          eligible students are copied into that trip&apos;s operational
          manifest.
        </Alert>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: "1px solid",
            borderColor: "divider",
            mb: 2,
          }}
        >
          <Typography sx={{ fontWeight: 800, mb: 1.5 }}>
            Add or move a student
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "1fr 1fr auto",
              },
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <TextField
              select
              label="Student"
              value={studentId}
              onChange={(event) => chooseStudent(event.target.value)}
            >
              {students.map((student) => (
                <MenuItem key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                  {student.externalRef ? ` — ${student.externalRef}` : ""}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Boarding stop"
              value={stopId}
              disabled={!studentId}
              onChange={(event) => setStopId(event.target.value)}
            >
              {routeStops
                .slice()
                .sort((a, b) => a.stopOrder - b.stopOrder)
                .map((stop) => (
                  <MenuItem key={stop.stopId} value={stop.stopId}>
                    {stop.stopOrder}. {stop.stopName}
                  </MenuItem>
                ))}
            </TextField>

            <Button
              variant="contained"
              startIcon={<PersonAddRounded />}
              disabled={saving || !studentId || !stopId}
              onClick={() => onSet(studentId, stopId)}
            >
              {selectedExisting ? "Update" : "Add"}
            </Button>
          </Box>
        </Paper>

        {loading ? (
          <Box sx={{ py: 5, display: "grid", placeItems: "center" }}>
            <CircularProgress />
          </Box>
        ) : subscriptions.length === 0 ? (
          <Alert severity="warning">
            No students are assigned to this recurring trip yet.
          </Alert>
        ) : (
          <Box sx={{ display: "grid", gap: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 0.5,
              }}
            >
              <Typography sx={{ fontWeight: 800 }}>
                Recurring students
              </Typography>

              <Chip
                size="small"
                label={`${activeCount} active`}
                color="primary"
              />
            </Box>

            {subscriptions.map((subscription) => (
              <Paper
                key={subscription.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 750, fontSize: 13.5 }}>
                    {subscription.studentFirstName}{" "}
                    {subscription.studentLastName}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,
                      color: "text.secondary",
                      fontSize: 11.5,
                    }}
                  >
                    {subscription.stopName}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Chip
                    size="small"
                    label={subscription.status}
                    color={
                      subscription.status === "active" ? "success" : "default"
                    }
                  />

                  {subscription.status === "active" ? (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineRounded />}
                      disabled={saving}
                      onClick={() => onRemove(subscription.studentId)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button disabled={saving} onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
