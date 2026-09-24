import { useState } from "react";

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
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PLATFORM_PERMISSIONS,
  hasFrontendPlatformPermission,
} from "../auth/platform-permissions";

import {
  approvePlatformSchoolSetupRequest,
  listPlatformSchoolSetupRequestsForReview,
  rejectPlatformSchoolSetupRequest,
  type PlatformSchoolSetupRequest,
} from "./platform.api";

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function SchoolSetupReviewPanel() {
  const queryClient = useQueryClient();

  const { platformPermissions } = useAuth();

  const canReadForReview =
    hasFrontendPlatformPermission(
      platformPermissions,
      FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_READ_ALL,
    ) &&
    hasFrontendPlatformPermission(
      platformPermissions,
      FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_REVIEW,
    );

  const canApprove = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_APPROVE,
  );

  const canReject = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_REJECT,
  );

  const canDecide = canApprove || canReject;

  const [selected, setSelected] = useState<PlatformSchoolSetupRequest | null>(
    null,
  );

  const [decisionNotes, setDecisionNotes] = useState("");

  const reviewQuery = useQuery({
    queryKey: ["platform", "school-setup", "review"],
    queryFn: listPlatformSchoolSetupRequestsForReview,
    enabled: canReadForReview,
  });

  async function refreshPlatformLifecycle(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["platform", "school-setup", "review"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["platform", "onboarding", "queue"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["platform", "tenants"],
      }),
    ]);
  }

  function closeReview(): void {
    if (approveMutation.isPending || rejectMutation.isPending) {
      return;
    }

    setSelected(null);
    setDecisionNotes("");
  }

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!canApprove) {
        throw new Error("You do not have permission to approve applications.");
      }

      if (!selected) {
        throw new Error("Select an application before approving.");
      }

      return approvePlatformSchoolSetupRequest(selected.id, {
        ...(decisionNotes.trim()
          ? {
              notes: decisionNotes.trim(),
            }
          : {}),
      });
    },

    onSuccess: async () => {
      await refreshPlatformLifecycle();
      closeReview();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!canReject) {
        throw new Error("You do not have permission to reject applications.");
      }

      if (!selected) {
        throw new Error("Select an application before rejecting.");
      }

      return rejectPlatformSchoolSetupRequest(selected.id, {
        reason: decisionNotes.trim(),
      });
    },

    onSuccess: async () => {
      await refreshPlatformLifecycle();
      closeReview();
    },
  });

  if (!canReadForReview) {
    return (
      <Alert severity="error">
        Your platform account does not have permission to review school
        applications.
      </Alert>
    );
  }

  if (reviewQuery.isLoading) {
    return (
      <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (reviewQuery.isError) {
    return (
      <Alert severity="error">
        {reviewQuery.error instanceof Error
          ? reviewQuery.error.message
          : "Unable to load school applications"}
      </Alert>
    );
  }

  const requests = reviewQuery.data ?? [];

  return (
    <>
      <Stack spacing={1.5}>
        {requests.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 850 }}>
              No applications awaiting review
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                color: "text.secondary",
                fontSize: 10.5,
              }}
            >
              Submitted school applications will appear here before any tenant
              account is provisioned.
            </Typography>
          </Paper>
        ) : (
          requests.map((request) => (
            <Paper
              key={request.id}
              variant="outlined"
              sx={{
                p: 1.75,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: {
                    xs: "flex-start",
                    md: "center",
                  },
                  justifyContent: "space-between",
                  gap: 2,
                  flexDirection: {
                    xs: "column",
                    md: "row",
                  },
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 850 }}>
                    {request.schoolName}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,
                      color: "text.secondary",
                      fontSize: 10,
                    }}
                  >
                    {request.tenantName} • {request.schoolCode} •{" "}
                    {request.timezone}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Chip
                    size="small"
                    label={humanize(request.status)}
                    color={
                      request.status === "approved"
                        ? "success"
                        : request.status === "rejected"
                          ? "error"
                          : "warning"
                    }
                    variant="outlined"
                  />

                  <Button
                    size="small"
                    variant="contained"
                    disabled={request.status !== "submitted"}
                    onClick={() => {
                      approveMutation.reset();
                      rejectMutation.reset();
                      setDecisionNotes("");
                      setSelected(request);
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Review
                  </Button>
                </Stack>
              </Box>
            </Paper>
          ))
        )}
      </Stack>

      <Dialog
        open={selected !== null}
        onClose={closeReview}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Review school application</DialogTitle>

        <DialogContent>
          {selected ? (
            <Stack spacing={2}>
              <Alert severity="info">
                This is a pre-tenant application. Approval provisions the tenant
                and first school, then places the school into the canonical
                onboarding workflow. It does not activate the school.
              </Alert>

              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 850 }}>
                  {selected.schoolName}
                </Typography>

                <Typography
                  sx={{ mt: 0.35, color: "text.secondary", fontSize: 11 }}
                >
                  {selected.tenantName} • {selected.tenantSlug}
                </Typography>

                {selected.schoolAddress ? (
                  <Typography
                    sx={{ mt: 0.35, color: "text.secondary", fontSize: 11 }}
                  >
                    {selected.schoolAddress}
                  </Typography>
                ) : null}
              </Box>

              {(approveMutation.error || rejectMutation.error) && (
                <Alert severity="error">
                  {(approveMutation.error ?? rejectMutation.error) instanceof
                  Error
                    ? (approveMutation.error ?? rejectMutation.error)?.message
                    : "Unable to record application decision"}
                </Alert>
              )}

              {canDecide ? (
                <TextField
                  label="Review notes / rejection reason"
                  value={decisionNotes}
                  onChange={(event) => {
                    setDecisionNotes(event.target.value);
                    approveMutation.reset();
                    rejectMutation.reset();
                  }}
                  helperText="Optional when approving; required when rejecting."
                  multiline
                  minRows={4}
                  disabled={
                    approveMutation.isPending || rejectMutation.isPending
                  }
                  fullWidth
                />
              ) : (
                <Alert severity="info">
                  You may review this application, but your platform permissions
                  do not allow an approval or rejection decision.
                </Alert>
              )}
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={closeReview}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            Cancel
          </Button>

          {canReject ? (
            <Button
              color="error"
              variant="outlined"
              disabled={
                approveMutation.isPending ||
                rejectMutation.isPending ||
                decisionNotes.trim().length < 3
              }
              onClick={() => rejectMutation.mutate()}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject application"}
            </Button>
          ) : null}

          {canApprove ? (
            <Button
              variant="contained"
              disabled={approveMutation.isPending || rejectMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              {approveMutation.isPending
                ? "Approving..."
                : "Approve application"}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </>
  );
}
