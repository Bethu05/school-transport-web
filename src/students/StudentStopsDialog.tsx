import { useEffect, useState } from "react";

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

import { PlaceRounded } from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listStops, type Stop } from "../stops/stops.api";

import {
  clearStudentDropoffStop,
  clearStudentPickupStop,
  getStudentStops,
  setStudentDropoffStop,
  setStudentPickupStop,
} from "./student-stops.api";

import type { Student } from "./students.api";

interface StudentStopsDialogProps {
  open: boolean;

  tenantId: string;

  student: Student | null;

  onClose: () => void;

  onSaved: () => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The transport stops could not be updated.";
}

function stopLabel(stop: Stop): string {
  const parts = [stop.name, stop.code ? `(${stop.code})` : null].filter(
    Boolean,
  );

  return parts.join(" ");
}

export function StudentStopsDialog({
  open,
  tenantId,
  student,
  onClose,
  onSaved,
}: StudentStopsDialogProps) {
  const queryClient = useQueryClient();

  const [pickupStopId, setPickupStopId] = useState("");

  const [dropoffStopId, setDropoffStopId] = useState("");

  const studentId = student?.id;

  const assignmentsQuery = useQuery({
    queryKey: ["student-stops", tenantId, studentId],

    enabled: Boolean(open && studentId),

    queryFn: async () => {
      if (!studentId) {
        throw new Error("No Student selected");
      }

      return getStudentStops(tenantId, studentId);
    },
  });

  const stopsQuery = useQuery({
    queryKey: ["student-stop-options", tenantId, student?.schoolId],

    enabled: Boolean(open && student),

    queryFn: async () => {
      const allStops = await listStops(tenantId);

      /**
       * A Student may only use an active Stop belonging
       * to the same school.
       */
      return allStops.filter(
        (stop) =>
          stop.status === "active" && stop.schoolId === student?.schoolId,
      );
    },
  });

  useEffect(() => {
    if (!assignmentsQuery.data) {
      return;
    }

    setPickupStopId(assignmentsQuery.data.pickup?.stopId ?? "");

    setDropoffStopId(assignmentsQuery.data.dropoff?.stopId ?? "");
  }, [assignmentsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!studentId) {
        throw new Error("No Student selected");
      }

      const current = assignmentsQuery.data;

      if (!current) {
        throw new Error("Student stop assignments have not loaded");
      }

      /**
       * Pickup
       */
      if (pickupStopId !== (current.pickup?.stopId ?? "")) {
        if (pickupStopId) {
          await setStudentPickupStop(tenantId, studentId, pickupStopId);
        } else {
          await clearStudentPickupStop(tenantId, studentId);
        }
      }

      /**
       * Drop-off
       */
      if (dropoffStopId !== (current.dropoff?.stopId ?? "")) {
        if (dropoffStopId) {
          await setStudentDropoffStop(tenantId, studentId, dropoffStopId);
        } else {
          await clearStudentDropoffStop(tenantId, studentId);
        }
      }
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["student-stops"],
      });

      onSaved();
      onClose();
    },
  });

  const loading = assignmentsQuery.isLoading || stopsQuery.isLoading;

  const error =
    assignmentsQuery.error ?? stopsQuery.error ?? saveMutation.error;

  const stops = stopsQuery.data ?? [];

  return (
    <Dialog
      open={open}

      onClose={saveMutation.isPending ? undefined : onClose}

      fullWidth

      maxWidth="sm"
    >
      <DialogTitle
        sx={{
          fontWeight: 850,
        }}
      >
        Manage transport stops
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
          {student
            ? `Choose the normal pickup and drop-off stops for ${student.firstName} ${student.lastName}.`
            : ""}
        </Typography>

        {error ? (
          <Alert
            severity="error"

            sx={{
              mb: 2,
            }}
          >
            {errorMessage(error)}
          </Alert>
        ) : null}

        {loading ? (
          <Box
            sx={{
              py: 5,

              display: "grid",

              placeItems: "center",
            }}
          >
            <CircularProgress size={30} />
          </Box>
        ) : null}

        {!loading && stops.length === 0 ? (
          <Alert severity="info">
            No active stops are available for this Student&apos;s school. Create
            the school&apos;s Stops first.
          </Alert>
        ) : null}

        {!loading && stops.length > 0 ? (
          <Box
            sx={{
              display: "grid",

              gap: 2,
            }}
          >
            <TextField
              select

              label="Pickup stop"

              value={pickupStopId}

              onChange={(event) => setPickupStopId(event.target.value)}

              helperText="Where the Student normally boards the school transport."
            >
              <MenuItem value="">No pickup stop</MenuItem>

              {stops.map((stop) => (
                <MenuItem
                  key={stop.id}

                  value={stop.id}
                >
                  {stopLabel(stop)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select

              label="Drop-off stop"

              value={dropoffStopId}

              onChange={(event) => setDropoffStopId(event.target.value)}

              helperText="Where the Student normally leaves the school transport."
            >
              <MenuItem value="">No drop-off stop</MenuItem>

              {stops.map((stop) => (
                <MenuItem
                  key={stop.id}

                  value={stop.id}
                >
                  {stopLabel(stop)}
                </MenuItem>
              ))}
            </TextField>

            <Box
              sx={{
                display: "flex",

                alignItems: "flex-start",

                gap: 1,

                p: 1.5,

                bgcolor: "action.hover",

                borderRadius: 2,
              }}
            >
              <PlaceRounded
                sx={{
                  mt: 0.2,

                  fontSize: 18,

                  color: "primary.main",
                }}
              />

              <Typography
                sx={{
                  color: "text.secondary",

                  fontSize: 11.5,

                  lineHeight: 1.6,
                }}
              >
                Only active stops belonging to this Student&apos;s school are
                shown.
              </Typography>
            </Box>
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,

          pb: 3,
        }}
      >
        <Button
          disabled={saveMutation.isPending}

          onClick={onClose}
        >
          Cancel
        </Button>

        <Button
          variant="contained"

          disabled={loading || saveMutation.isPending || stops.length === 0}

          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "Saving..." : "Save stops"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
