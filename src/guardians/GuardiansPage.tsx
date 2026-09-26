import { useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  AddRounded,
  EditRounded,
  FamilyRestroomRounded,
  PersonAddAlt1Rounded,
  PersonOffRounded,
  SearchRounded,
  SmartphoneRounded,
} from "@mui/icons-material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import { GuardianImportDialog } from "./GuardianImportDialog";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import {
  activateGuardian,
  createGuardian,
  createGuardianWithParentAppAccess,
  deactivateGuardian,
  listGuardians,
  setGuardianParentAppAccess,
  updateGuardian,
  type CreateGuardianInput,
  type Guardian,
  type GuardianParentAppAccessResult,
  type GuardianStatus,
  type SetGuardianParentAppAccessInput,
  type UpdateGuardianInput,
} from "./guardians.api";

import {
  GuardianFormDialog,
  type GuardianFormSubmission,
} from "./GuardianFormDialog";

import { GuardianParentAppAccessDialog } from "./GuardianParentAppAccessDialog";

const PAGE_SIZES = [10, 25, 50, 100] as const;

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The Guardian operation failed.";
}

export function GuardiansPage() {
  const queryClient = useQueryClient();

  const { permissions, tenant } = useAuth();

  const [importOpen, setImportOpen] = useState(false);

  const tenantId = tenant?.tenantId;
  const canRead = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_READ,
  );

  const canCreate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_CREATE,
  );

  const canImport = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_IMPORT,
  );

  const canUpdate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_UPDATE,
  );

  const canActivate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_ACTIVATE,
  );

  const canDeactivate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_DEACTIVATE,
  );

  const canManageAppAccess = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.GUARDIANS_MANAGE_APP_ACCESS,
  );

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  const [searchDraft, setSearchDraft] = useState("");

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<GuardianStatus | "">("");

  const [formOpen, setFormOpen] = useState(false);

  const [editTarget, setEditTarget] = useState<Guardian | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<Guardian | null>(
    null,
  );

  const [appAccessTarget, setAppAccessTarget] = useState<Guardian | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const guardiansQuery = useQuery({
    queryKey: ["guardians", tenantId, page, limit, search, status],

    enabled: Boolean(tenantId && canRead),

    queryFn: () => {
      if (!tenantId) {
        throw new Error("Tenant is unavailable");
      }

      return listGuardians(tenantId, {
        page,
        limit,

        search: search || undefined,

        status: status || undefined,
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (
      submission: GuardianFormSubmission,
    ): Promise<{
      guardian: Guardian;
      appAccess: GuardianParentAppAccessResult | null;
    }> => {
      if (!tenantId) {
        throw new Error("Tenant is unavailable");
      }

      if (editTarget) {
        const guardian = await updateGuardian(
          tenantId,
          editTarget.id,
          submission.profile as UpdateGuardianInput,
        );

        return {
          guardian,

          appAccess: null,
        };
      }

      if (submission.giveParentAppAccess) {
        if (!submission.temporaryPassword) {
          throw new Error(
            "A temporary password is required for Parent App access.",
          );
        }

        const result = await createGuardianWithParentAppAccess(tenantId, {
          ...(submission.profile as CreateGuardianInput),

          temporaryPassword: submission.temporaryPassword,
        });

        return result;
      }

      const guardian = await createGuardian(
        tenantId,
        submission.profile as CreateGuardianInput,
      );

      return {
        guardian,

        appAccess: null,
      };
    },

    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: ["guardians"],
      });

      if (editTarget) {
        setSuccessMessage("Guardian updated successfully.");
      } else if (!result.appAccess) {
        setSuccessMessage(
          "Guardian created successfully as a contact-only profile.",
        );
      } else if (result.appAccess.identityMode === "existing") {
        setSuccessMessage(
          `Guardian created and existing account linked for ${
            result.appAccess.accountEmail ??
            result.guardian.email ??
            "the parent"
          }. They should continue using their existing password; the temporary password was not applied.`,
        );
      } else {
        setSuccessMessage(
          `Guardian created with Parent App access for ${
            result.appAccess.accountEmail ??
            result.guardian.email ??
            "the parent"
          }. Give them the temporary password securely. They must change it when they first sign in.`,
        );
      }

      setFormOpen(false);

      setEditTarget(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (guardian: Guardian) => {
      if (!tenantId) {
        throw new Error("Tenant is unavailable");
      }

      return activateGuardian(tenantId, guardian.id);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["guardians"],
      });

      setSuccessMessage("Guardian reactivated successfully.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (guardian: Guardian) => {
      if (!tenantId) {
        throw new Error("Tenant is unavailable");
      }

      return deactivateGuardian(tenantId, guardian.id);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["guardians"],
      });

      setSuccessMessage("Guardian deactivated successfully.");

      setDeactivateTarget(null);
    },
  });

  const appAccessMutation = useMutation({
    mutationFn: async ({
      guardian,
      input,
    }: {
      guardian: Guardian;
      input: SetGuardianParentAppAccessInput;
    }) => {
      if (!tenantId) {
        throw new Error("Tenant is unavailable");
      }

      return setGuardianParentAppAccess(tenantId, guardian.id, input);
    },

    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["guardians"],
      });

      if (!result.enabled) {
        setSuccessMessage(
          result.membershipMode === "preserved"
            ? `Parent App access removed for ${variables.guardian.firstName} ${variables.guardian.lastName}. Their existing organisational role remains active.`
            : `Parent App access removed for ${variables.guardian.firstName} ${variables.guardian.lastName}. Their Parent-only tenant membership was suspended.`,
        );
      } else if (result.identityMode === "existing") {
        setSuccessMessage(
          `Existing account linked successfully for ${
            result.accountEmail ?? variables.guardian.email ?? "this parent"
          }. They should continue using their existing password; the temporary password was not applied.`,
        );
      } else {
        setSuccessMessage(
          `Parent App access enabled for ${
            result.accountEmail ?? variables.guardian.email ?? "this parent"
          }. Give them the temporary password securely. They must change it at first login.`,
        );
      }

      setAppAccessTarget(null);
    },
  });

  if (!canRead) {
    return (
      <Alert severity="warning">
        You do not have permission to view Guardians for this tenant.
      </Alert>
    );
  }

  const data = guardiansQuery.data;

  const items = data?.items ?? [];

  const totalPages = data?.totalPages ?? 0;

  return (
    <Box>
      <Box
        sx={{
          mb: 3,

          display: "flex",

          alignItems: "flex-start",

          justifyContent: "space-between",

          gap: 2,

          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            variant="h4"

            sx={{
              fontWeight: 900,
            }}
          >
            Guardians
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color: "text.secondary",
            }}
          >
            Manage parents and guardians connected to student transport.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",

            alignItems: "center",

            gap: 1.25,
          }}
        >
          {canImport ? (
            <Button variant="outlined" onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
          ) : null}

          {canCreate ? (
            <Button
              variant="contained"

              startIcon={<AddRounded />}

              onClick={() => {
                setEditTarget(null);

                setFormOpen(true);

                setSuccessMessage(null);
              }}
            >
              Add Guardian
            </Button>
          ) : null}

          <Box
            sx={{
              width: 48,

              height: 48,

              display: "grid",

              placeItems: "center",

              borderRadius: 3,

              bgcolor: "primary.main",

              color: "primary.contrastText",
            }}
          >
            <FamilyRestroomRounded />
          </Box>
        </Box>
      </Box>

      {successMessage ? (
        <Alert
          severity="success"

          sx={{
            mb: 2,
          }}

          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            sm: "minmax(220px, 1fr) 180px auto",
          },

          gap: 1.5,

          mb: 2,
        }}
      >
        <TextField
          value={searchDraft}

          placeholder="Search name, email or phone"

          onChange={(event) => setSearchDraft(event.target.value)}

          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setPage(1);

              setSearch(searchDraft.trim());
            }
          }}
        />

        <TextField
          select

          label="Status"

          value={status}

          onChange={(event) => {
            setPage(1);

            setStatus(event.target.value as GuardianStatus | "");
          }}
        >
          <MenuItem value="">All</MenuItem>

          <MenuItem value="active">Active</MenuItem>

          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>

        <Button
          variant="contained"

          startIcon={<SearchRounded />}

          onClick={() => {
            setPage(1);

            setSearch(searchDraft.trim());
          }}
        >
          Search
        </Button>
      </Box>

      <Paper
        sx={{
          overflow: "hidden",

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: "1.2fr 1.2fr .65fr .8fr 1fr 130px",

            gap: 2,

            px: 2.5,

            py: 1.5,

            bgcolor: "action.hover",

            borderBottom: "1px solid",

            borderColor: "divider",

            color: "text.secondary",

            fontSize: 11,

            fontWeight: 800,

            textTransform: "uppercase",

            letterSpacing: ".05em",
          }}
        >
          <Box>Guardian</Box>

          <Box>Contact</Box>

          <Box>Status</Box>

          <Box>Parent App</Box>

          <Box>Notifications</Box>

          <Box>Actions</Box>
        </Box>

        {guardiansQuery.isLoading ? (
          <Box
            sx={{
              p: 4,

              textAlign: "center",

              color: "text.secondary",
            }}
          >
            Loading Guardians...
          </Box>
        ) : null}

        {guardiansQuery.isError ? (
          <Alert
            severity="error"

            sx={{
              m: 2,
            }}
          >
            {errorMessage(guardiansQuery.error)}
          </Alert>
        ) : null}

        {!guardiansQuery.isLoading &&
        !guardiansQuery.isError &&
        items.length === 0 ? (
          <Box
            sx={{
              p: 4,

              textAlign: "center",

              color: "text.secondary",
            }}
          >
            No Guardians found.
          </Box>
        ) : null}

        {items.map((guardian) => (
          <Box
            key={guardian.id}

            sx={{
              display: "grid",

              gridTemplateColumns: "1.2fr 1.2fr .65fr .8fr 1fr 130px",

              gap: 2,

              px: 2.5,

              py: 1.6,

              alignItems: "center",

              borderBottom: "1px solid",

              borderColor: "divider",

              "&:last-of-type": {
                borderBottom: "none",
              },

              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",

                alignItems: "center",

                gap: 1.4,

                minWidth: 0,
              }}
            >
              <Avatar
                sx={{
                  width: 38,

                  height: 38,

                  bgcolor: "primary.main",

                  color: "primary.contrastText",

                  fontSize: 12,

                  fontWeight: 800,
                }}
              >
                {guardian.firstName.slice(0, 1).toUpperCase()}

                {guardian.lastName.slice(0, 1).toUpperCase()}
              </Avatar>

              <Typography
                sx={{
                  fontWeight: 800,

                  fontSize: 13,
                }}
              >
                {guardian.firstName} {guardian.lastName}
              </Typography>
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 12.5,
                }}
              >
                {guardian.email ?? "No email"}
              </Typography>

              <Typography
                sx={{
                  mt: 0.3,

                  color: "text.secondary",

                  fontSize: 11.5,
                }}
              >
                {guardian.phone ?? "No phone"}
              </Typography>
            </Box>

            <Chip
              size="small"

              label={guardian.status === "active" ? "Active" : "Inactive"}

              color={guardian.status === "active" ? "success" : "default"}

              sx={{
                width: "fit-content",
              }}
            />

            <Chip
              size="small"

              label={guardian.userId ? "Enabled" : "Not enabled"}

              color={guardian.userId ? "success" : "default"}

              variant="outlined"

              sx={{
                width: "fit-content",
              }}
            />

            <Box
              sx={{
                display: "flex",

                flexWrap: "wrap",

                gap: 0.6,
              }}
            >
              {guardian.notifyBoarded ? (
                <Chip size="small" label="Boarded" variant="outlined" />
              ) : null}

              {guardian.notifyDroppedOff ? (
                <Chip size="small" label="Drop-off" variant="outlined" />
              ) : null}

              {guardian.notifyTripUpdates ? (
                <Chip size="small" label="Trip updates" variant="outlined" />
              ) : null}
            </Box>

            <Box
              sx={{
                display: "flex",

                gap: 0.5,
              }}
            >
              {canManageAppAccess &&
              (guardian.userId !== null || guardian.status === "active") ? (
                <Tooltip
                  title={
                    guardian.userId
                      ? "Remove Parent App access"
                      : "Give Parent App access"
                  }
                >
                  <IconButton
                    size="small"

                    onClick={() => {
                      setAppAccessTarget(guardian);

                      setSuccessMessage(null);
                    }}
                  >
                    <SmartphoneRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}

              {canUpdate ? (
                <Tooltip title="Edit Guardian">
                  <IconButton
                    size="small"

                    onClick={() => {
                      setEditTarget(guardian);

                      setFormOpen(true);

                      setSuccessMessage(null);
                    }}
                  >
                    <EditRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}

              {guardian.status === "active" ? (
                canDeactivate ? (
                  <Tooltip title="Deactivate Guardian">
                    <IconButton
                      size="small"

                      onClick={() => setDeactivateTarget(guardian)}
                    >
                      <PersonOffRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null
              ) : canActivate ? (
                <Tooltip title="Reactivate Guardian">
                  <span>
                    <IconButton
                      size="small"

                      disabled={activateMutation.isPending}

                      onClick={() => activateMutation.mutate(guardian)}
                    >
                      <PersonAddAlt1Rounded fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              ) : null}
            </Box>
          </Box>
        ))}
      </Paper>

      <Box
        sx={{
          mt: 2,

          display: "flex",

          alignItems: "center",

          justifyContent: "space-between",

          gap: 2,

          flexWrap: "wrap",
        }}
      >
        <Typography
          sx={{
            color: "text.secondary",

            fontSize: 12,
          }}
        >
          {data ? `${data.total} guardian${data.total === 1 ? "" : "s"}` : ""}
        </Typography>

        <Box
          sx={{
            display: "flex",

            alignItems: "center",

            gap: 1,
          }}
        >
          <TextField
            select

            value={limit}

            onChange={(event) => {
              setLimit(Number(event.target.value));

              setPage(1);
            }}

            sx={{
              width: 90,
            }}
          >
            {PAGE_SIZES.map((size) => (
              <MenuItem
                key={size}

                value={size}
              >
                {size}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="outlined"

            disabled={page <= 1}

            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>

          <Typography
            sx={{
              minWidth: 80,

              textAlign: "center",

              fontSize: 12,

              fontWeight: 700,
            }}
          >
            Page {page}
            {totalPages ? ` of ${totalPages}` : ""}
          </Typography>

          <Button
            variant="outlined"

            disabled={totalPages === 0 || page >= totalPages}

            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </Box>
      </Box>

      <GuardianImportDialog
        open={importOpen}
        tenantId={tenantId ?? ""}
        onClose={() => setImportOpen(false)}
      />

      {formOpen ? (
        <GuardianFormDialog
          key={editTarget?.id ?? "create-guardian"}

          open

          guardian={editTarget}

          submitting={saveMutation.isPending}

          error={saveMutation.isError ? errorMessage(saveMutation.error) : null}

          onClose={() => {
            if (!saveMutation.isPending) {
              setFormOpen(false);

              setEditTarget(null);

              saveMutation.reset();
            }
          }}

          onSubmit={(input) => saveMutation.mutate(input)}
        />
      ) : null}

      <GuardianParentAppAccessDialog
        key={appAccessTarget?.id ?? "no-parent-app-guardian"}

        open={appAccessTarget !== null}

        guardian={appAccessTarget}

        onClose={() => {
          if (!appAccessMutation.isPending) {
            setAppAccessTarget(null);

            appAccessMutation.reset();
          }
        }}

        onSubmit={(input) => {
          if (!appAccessTarget) {
            return Promise.reject(new Error("No Guardian selected"));
          }

          return appAccessMutation.mutateAsync({
            guardian: appAccessTarget,

            input,
          });
        }}
      />

      <Dialog
        open={deactivateTarget !== null}

        onClose={
          deactivateMutation.isPending
            ? undefined
            : () => setDeactivateTarget(null)
        }

        fullWidth

        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            fontWeight: 850,
          }}
        >
          Deactivate Guardian?
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
              ? `${deactivateTarget.firstName} ${deactivateTarget.lastName} will become inactive. Historical student and transport relationships are preserved.`
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
            color="error"

            variant="contained"

            disabled={deactivateMutation.isPending || !deactivateTarget}

            onClick={() => {
              if (deactivateTarget) {
                deactivateMutation.mutate(deactivateTarget);
              }
            }}
          >
            {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
