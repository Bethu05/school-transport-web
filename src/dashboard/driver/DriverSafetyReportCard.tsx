import { useState } from "react";

import { Alert, Box, Button, Paper, Snackbar, Typography } from "@mui/material";

import { WarningAmberRounded } from "@mui/icons-material";

import { useMutation } from "@tanstack/react-query";

import { IncidentFormDialog } from "../../incidents/IncidentFormDialog";

import type { CreateIncidentInput } from "../../incidents/incidents.api";

import {
  reportMyDriverIncident,
  type ReportDriverIncidentInput,
} from "./driver-me.api";

interface DriverSafetyReportCardProps {
  tenantId: string | undefined;

  enabled: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The incident could not be reported.";
}

/**
 * Driver safety reporting UI.
 *
 * SECURITY:
 *
 * The form gathers only:
 *
 * - severity
 * - type
 * - description
 *
 * The browser never chooses the trip, school or vehicle.
 *
 * POST /me/driver/incidents resolves those relationships
 * from the authenticated Driver on the backend.
 */
export function DriverSafetyReportCard({
  tenantId,
  enabled,
}: DriverSafetyReportCardProps) {
  const [open, setOpen] = useState(false);

  const [formKey, setFormKey] = useState(0);

  const [mutationError, setMutationError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reportMutation = useMutation({
    mutationFn: async (input: ReportDriverIncidentInput) => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return reportMyDriverIncident(
        tenantId,

        input,

        crypto.randomUUID(),
      );
    },

    onSuccess: () => {
      setOpen(false);

      setMutationError(null);

      setSuccessMessage("Safety incident reported successfully.");
    },

    onError: (error) => {
      setMutationError(errorMessage(error));
    },
  });

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          mt: 2.5,

          p: {
            xs: 3,

            md: 3.5,
          },

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "flex",

            alignItems: "flex-start",

            justifyContent: "space-between",

            flexDirection: {
              xs: "column",

              sm: "row",
            },

            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",

              gap: 1.5,

              alignItems: "flex-start",
            }}
          >
            <WarningAmberRounded
              sx={{
                mt: 0.2,

                color: "warning.main",
              }}
            />

            <Box>
              <Typography
                sx={{
                  fontSize: 18,

                  fontWeight: 850,
                }}
              >
                Safety reporting
              </Typography>

              <Typography
                sx={{
                  mt: 0.7,

                  maxWidth: 650,

                  color: "text.secondary",

                  fontSize: 13,

                  lineHeight: 1.65,
                }}
              >
                Report a safety or operational incident for your currently
                assigned journey. The trip, school and vehicle are linked
                securely by the platform.
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"

            color="warning"

            startIcon={<WarningAmberRounded />}

            onClick={() => {
              setMutationError(null);

              setFormKey((value) => value + 1);

              setOpen(true);
            }}
          >
            Report safety incident
          </Button>
        </Box>
      </Paper>

      <IncidentFormDialog
        key={`driver-safety-${formKey}`}

        open={open}

        incident={null}

        saving={reportMutation.isPending}

        error={open ? mutationError : null}

        canUpdate={false}

        onClose={() => {
          if (!reportMutation.isPending) {
            setOpen(false);

            setMutationError(null);
          }
        }}

        onSubmit={async (input) => {
          const createInput = input as CreateIncidentInput;

          await reportMutation.mutateAsync({
            severity: createInput.severity,

            type: createInput.type,

            description: createInput.description,
          });
        }}
      />

      <Snackbar
        open={successMessage !== null}

        autoHideDuration={3500}

        anchorOrigin={{
          vertical: "bottom",

          horizontal: "right",
        }}

        onClose={() => setSuccessMessage(null)}
      >
        <Alert
          severity="success"

          variant="filled"

          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
}
