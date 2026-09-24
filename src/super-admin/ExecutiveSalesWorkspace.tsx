import { useState } from "react";

import { AddRounded, EditRounded, SendRounded } from "@mui/icons-material";

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
  createPlatformSchoolSetupRequest,
  listOwnPlatformSchoolSetupRequests,
  submitOwnPlatformSchoolSetupRequest,
  updateOwnPlatformSchoolSetupRequest,
  type CreatePlatformSchoolSetupRequestInput,
  type PlatformSchoolSetupRequest,
} from "./platform.api";

interface ApplicationForm {
  tenantName: string;
  tenantSlug: string;
  timezone: string;
  schoolName: string;
  schoolCode: string;
  schoolAddress: string;
}

const emptyForm: ApplicationForm = {
  tenantName: "",
  tenantSlug: "",
  timezone: "Africa/Nairobi",
  schoolName: "",
  schoolCode: "",
  schoolAddress: "",
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function statusColor(
  status: PlatformSchoolSetupRequest["status"],
): "default" | "warning" | "success" | "error" {
  switch (status) {
    case "submitted":
      return "warning";

    case "approved":
      return "success";

    case "rejected":
      return "error";

    default:
      return "default";
  }
}

export function ExecutiveSalesWorkspace() {
  const queryClient = useQueryClient();

  const { platformPermissions } = useAuth();

  const canReadOwn = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_READ_OWN,
  );

  const canCreate = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_CREATE,
  );

  const canUpdateOwn = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_UPDATE_OWN,
  );

  const canSubmit = hasFrontendPlatformPermission(
    platformPermissions,
    FRONTEND_PLATFORM_PERMISSIONS.SCHOOL_SETUP_SUBMIT,
  );

  const [dialogOpen, setDialogOpen] = useState(false);

  const [editing, setEditing] = useState<PlatformSchoolSetupRequest | null>(
    null,
  );

  const [form, setForm] = useState<ApplicationForm>(emptyForm);

  const ownQuery = useQuery({
    queryKey: ["platform", "school-setup", "mine"],
    queryFn: listOwnPlatformSchoolSetupRequests,
    enabled: canReadOwn,
  });

  async function refresh(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["platform", "school-setup", "mine"],
    });
  }

  function openCreate(): void {
    if (!canCreate) {
      return;
    }

    setEditing(null);
    setForm(emptyForm);
    saveMutation.reset();
    setDialogOpen(true);
  }

  function openEdit(request: PlatformSchoolSetupRequest): void {
    if (!canUpdateOwn) {
      return;
    }

    setEditing(request);

    setForm({
      tenantName: request.tenantName,
      tenantSlug: request.tenantSlug,
      timezone: request.timezone,
      schoolName: request.schoolName,
      schoolCode: request.schoolCode,
      schoolAddress: request.schoolAddress ?? "",
    });

    saveMutation.reset();
    setDialogOpen(true);
  }

  function closeDialog(): void {
    if (saveMutation.isPending) {
      return;
    }

    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input: CreatePlatformSchoolSetupRequestInput = {
        tenantName: form.tenantName.trim(),
        tenantSlug: form.tenantSlug.trim(),
        timezone: form.timezone.trim(),
        schoolName: form.schoolName.trim(),
        schoolCode: form.schoolCode.trim(),
        ...(form.schoolAddress.trim()
          ? {
              schoolAddress: form.schoolAddress.trim(),
            }
          : {}),
      };

      if (editing) {
        if (!canUpdateOwn) {
          throw new Error(
            "You do not have permission to edit this application.",
          );
        }

        return updateOwnPlatformSchoolSetupRequest(editing.id, input);
      }

      if (!canCreate) {
        throw new Error("You do not have permission to create applications.");
      }

      return createPlatformSchoolSetupRequest(input);
    },

    onSuccess: async () => {
      await refresh();
      closeDialog();
    },
  });

  const submitMutation = useMutation({
    mutationFn: (requestId: string) => {
      if (!canSubmit) {
        throw new Error("You do not have permission to submit applications.");
      }

      return submitOwnPlatformSchoolSetupRequest(requestId);
    },

    onSuccess: async () => {
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({
          queryKey: ["platform", "school-setup", "review"],
        }),
      ]);
    },
  });

  const formValid =
    form.tenantName.trim().length > 0 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.tenantSlug.trim()) &&
    form.timezone.trim().length > 0 &&
    form.schoolName.trim().length > 0 &&
    form.schoolCode.trim().length > 0;

  if (!canReadOwn) {
    return (
      <Alert severity="error">
        Your platform account does not have permission to read school
        applications.
      </Alert>
    );
  }

  return (
    <>
      <Stack spacing={2}>
        <Box
          sx={{
            display: "flex",
            alignItems: {
              xs: "flex-start",
              sm: "center",
            },
            justifyContent: "space-between",
            gap: 2,
            flexDirection: {
              xs: "column",
              sm: "row",
            },
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 900 }}>
              School applications
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                color: "text.secondary",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Create a prospective school record, complete the details and
              submit it for Platform Admin review.
            </Typography>
          </Box>

          {canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={openCreate}
              sx={{ textTransform: "none" }}
            >
              New school application
            </Button>
          ) : null}
        </Box>

        <Alert severity="info">
          Creating a draft does not create a tenant. Tenant and first-school
          provisioning happens only after an authorized approval.
        </Alert>

        {ownQuery.isLoading ? (
          <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}>
            <CircularProgress size={28} />
          </Box>
        ) : null}

        {ownQuery.isError ? (
          <Alert severity="error">
            {ownQuery.error instanceof Error
              ? ownQuery.error.message
              : "Unable to load your school applications"}
          </Alert>
        ) : null}

        {submitMutation.error || saveMutation.error ? (
          <Alert severity="error">
            {(submitMutation.error ?? saveMutation.error) instanceof Error
              ? (submitMutation.error ?? saveMutation.error)?.message
              : "Unable to update the school application"}
          </Alert>
        ) : null}

        {!ownQuery.isLoading &&
        !ownQuery.isError &&
        (ownQuery.data ?? []).length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 850 }}>
              No school applications yet
            </Typography>

            <Typography sx={{ mt: 0.5, color: "text.secondary", fontSize: 11 }}>
              Create the first draft when a prospective school is ready to enter
              the controlled onboarding pipeline.
            </Typography>
          </Paper>
        ) : null}

        {(ownQuery.data ?? []).map((request) => (
          <Paper
            key={request.id}
            variant="outlined"
            sx={{ p: 2, borderRadius: 2 }}
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
              <Box sx={{ minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap", alignItems: "center" }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 900 }}>
                    {request.schoolName}
                  </Typography>

                  <Chip
                    size="small"
                    label={request.status.replaceAll("_", " ")}
                    color={statusColor(request.status)}
                    variant="outlined"
                  />
                </Stack>

                <Typography
                  sx={{ mt: 0.5, color: "text.secondary", fontSize: 10.5 }}
                >
                  {request.tenantName} • {request.tenantSlug} •{" "}
                  {request.schoolCode}
                </Typography>

                {request.decisionNotes ? (
                  <Typography
                    sx={{
                      mt: 0.75,
                      color: "text.secondary",
                      fontSize: 10.5,
                    }}
                  >
                    Review notes: {request.decisionNotes}
                  </Typography>
                ) : null}

                {request.status === "approved" ? (
                  <Typography
                    sx={{
                      mt: 0.75,
                      color: "success.main",
                      fontSize: 10.5,
                      fontWeight: 800,
                    }}
                  >
                    Approved and handed into the canonical onboarding workflow.
                  </Typography>
                ) : null}
              </Box>

              {request.status === "draft" && (canUpdateOwn || canSubmit) ? (
                <Stack direction="row" spacing={1}>
                  {canUpdateOwn ? (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditRounded />}
                      onClick={() => openEdit(request)}
                      sx={{ textTransform: "none" }}
                    >
                      Edit
                    </Button>
                  ) : null}

                  {canSubmit ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SendRounded />}
                      disabled={submitMutation.isPending}
                      onClick={() => submitMutation.mutate(request.id)}
                      sx={{ textTransform: "none" }}
                    >
                      Submit for review
                    </Button>
                  ) : null}
                </Stack>
              ) : null}
            </Box>
          </Paper>
        ))}
      </Stack>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editing ? "Edit school application" : "New school application"}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Customer / tenant name"
              value={form.tenantName}
              onChange={(event) => {
                const tenantName = event.target.value;

                setForm((current) => ({
                  ...current,
                  tenantName,
                  tenantSlug:
                    current.tenantSlug.length === 0
                      ? slugify(tenantName)
                      : current.tenantSlug,
                }));
              }}
              required
              fullWidth
            />

            <TextField
              label="Tenant slug"
              value={form.tenantSlug}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tenantSlug: event.target.value.toLowerCase(),
                }))
              }
              helperText="Lowercase letters, numbers and hyphens only."
              required
              fullWidth
            />

            <TextField
              label="School name"
              value={form.schoolName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  schoolName: event.target.value,
                }))
              }
              required
              fullWidth
            />

            <TextField
              label="School code"
              value={form.schoolCode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  schoolCode: event.target.value,
                }))
              }
              required
              fullWidth
            />

            <TextField
              label="Timezone"
              value={form.timezone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              required
              fullWidth
            />

            <TextField
              label="School address"
              value={form.schoolAddress}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  schoolAddress: event.target.value,
                }))
              }
              multiline
              minRows={3}
              fullWidth
            />

            {saveMutation.isError ? (
              <Alert severity="error">
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : "Unable to save application"}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeDialog} disabled={saveMutation.isPending}>
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={!formValid || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending
              ? "Saving..."
              : editing
                ? "Save changes"
                : "Create draft"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
