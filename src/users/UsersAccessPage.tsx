import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  AddRounded,
  CheckCircleRounded,
  EditRounded,
  LockResetRounded,
  ManageAccountsRounded,
  MoreVertRounded,
  PersonOffRounded,
  PersonRounded,
} from "@mui/icons-material";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../auth/AuthProvider";

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from "../auth/frontend-permissions";

import { ChangeUserRoleDialog } from "./ChangeUserRoleDialog";

import { CreateUserDialog } from "./CreateUserDialog";

import { TransportManagerImportDialog } from "./TransportManagerImportDialog";

import { ResetUserPasswordDialog } from "./ResetUserPasswordDialog";

import { UserAccessDialog, type UserAccessAction } from "./UserAccessDialog";

import {
  activateTenantUser,
  createTenantUser,
  deactivateTenantUser,
  listTenantUsers,
  resetTenantUserPassword,
  updateTenantUserRole,
  type CreateTenantUserInput,
  type TenantAssignableUserRole,
  type TenantUser,
} from "./users.api";

function roleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner";

    case "admin":
      return "Administrator";

    case "transport_manager":
      return "Transport Manager";

    case "dispatcher":
      return "Dispatcher";

    case "driver":
      return "Driver";

    case "guardian":
      return "Parent / Guardian";

    case "staff":
      return "Staff";

    default:
      return role;
  }
}

function membershipLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";

    case "suspended":
      return "Deactivated";

    case "invited":
      return "Invited";

    default:
      return status;
  }
}

function isGenericRoleEditable(role: string): boolean {
  return ["admin", "transport_manager", "dispatcher", "staff"].includes(role);
}

interface ActionMenuState {
  anchorEl: HTMLElement;

  user: TenantUser;
}

interface AccessDialogState {
  user: TenantUser;

  action: UserAccessAction;
}

export function UsersAccessPage() {
  const { tenant, permissions, user: authenticatedUser } = useAuth();

  const queryClient = useQueryClient();

  const tenantId = tenant?.tenantId;

  const canRead = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_READ,
  );

  const canCreate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_CREATE,
  );

  const canImportTransportManagers = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_IMPORT_TRANSPORT_MANAGERS,
  );

  const canUpdateRole = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_UPDATE_ROLE,
  );

  const canActivate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_ACTIVATE,
  );

  const canDeactivate = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_DEACTIVATE,
  );

  const canResetPassword = hasFrontendPermission(
    permissions,
    FRONTEND_PERMISSIONS.USERS_RESET_PASSWORD,
  );

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [transportManagerImportOpen, setTransportManagerImportOpen] =
    useState(false);

  const [resetUser, setResetUser] = useState<TenantUser | null>(null);

  const [roleUser, setRoleUser] = useState<TenantUser | null>(null);

  const [accessDialog, setAccessDialog] = useState<AccessDialogState | null>(
    null,
  );

  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["tenant-users", tenantId],

    enabled: Boolean(tenantId) && canRead,

    queryFn: async () => {
      if (!tenantId) {
        throw new Error("No active tenant");
      }

      return listTenantUsers(tenantId);
    },
  });

  function requireTenantId(): string {
    if (!tenantId) {
      throw new Error("No active tenant");
    }

    return tenantId;
  }

  async function refreshUsers(): Promise<void> {
    await queryClient.invalidateQueries({
      queryKey: ["tenant-users", tenantId],
    });
  }

  async function handleCreateUser(input: CreateTenantUserInput): Promise<void> {
    const activeTenantId = requireTenantId();

    const result = await createTenantUser(activeTenantId, input);

    await refreshUsers();

    if (result.identityMode === "existing") {
      setSuccessMessage(
        `Existing account linked successfully for ${result.user.email}. They should continue using their existing password; the temporary password was not applied.`,
      );

      return;
    }

    setSuccessMessage(
      `User created successfully for ${result.user.email}. Give them the temporary password securely. They must choose a new password when they first sign in.`,
    );
  }

  async function handleChangeRole(
    role: TenantAssignableUserRole,
  ): Promise<void> {
    if (!roleUser) {
      throw new Error("No user selected");
    }

    const activeTenantId = requireTenantId();

    const updated = await updateTenantUserRole(activeTenantId, roleUser.id, {
      role,
    });

    await refreshUsers();

    setSuccessMessage(`Role updated for ${updated.email}.`);
  }

  async function handleResetPassword(temporaryPassword: string): Promise<void> {
    if (!resetUser) {
      throw new Error("No user selected");
    }

    const activeTenantId = requireTenantId();

    await resetTenantUserPassword(activeTenantId, resetUser.id, {
      temporaryPassword,
    });

    await refreshUsers();

    setSuccessMessage(
      `Temporary password set for ${resetUser.email}. They must change it at next login.`,
    );
  }

  async function handleAccessAction(): Promise<void> {
    if (!accessDialog) {
      throw new Error("No user selected");
    }

    const activeTenantId = requireTenantId();

    if (accessDialog.action === "activate") {
      const updated = await activateTenantUser(
        activeTenantId,
        accessDialog.user.id,
      );

      await refreshUsers();

      setSuccessMessage(`Access reactivated for ${updated.email}.`);

      return;
    }

    const updated = await deactivateTenantUser(
      activeTenantId,
      accessDialog.user.id,
    );

    await refreshUsers();

    setSuccessMessage(
      `Access deactivated for ${updated.email}. Other organisations linked to the same account are unaffected.`,
    );
  }

  function closeActionMenu(): void {
    setActionMenu(null);
  }

  if (!canRead) {
    return (
      <Box>
        <Typography
          component="h1"
          sx={{
            fontSize: {
              xs: 30,
              md: 38,
            },

            fontWeight: 900,

            letterSpacing: "-0.04em",
          }}
        >
          Users &amp; Access
        </Typography>

        <Alert
          severity="warning"
          sx={{
            mt: 3,

            maxWidth: 760,
          }}
        >
          You do not have permission to manage organisation users.
        </Alert>
      </Box>
    );
  }

  if (!tenantId) {
    return (
      <Alert severity="warning">
        A tenant must be selected before user accounts can be managed.
      </Alert>
    );
  }

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
            sx={{
              color: "primary.dark",

              fontSize: 10,

              fontWeight: 850,

              textTransform: "uppercase",

              letterSpacing: "0.14em",
            }}
          >
            Identity administration
          </Typography>

          <Typography
            component="h1"
            sx={{
              mt: 0.7,

              fontSize: {
                xs: 30,
                md: 38,
              },

              fontWeight: 900,

              letterSpacing: "-0.04em",
            }}
          >
            Users &amp; Access
          </Typography>

          <Typography
            sx={{
              mt: 0.7,

              color: "text.secondary",

              fontSize: 13,
            }}
          >
            Manage login accounts, tenant roles and access for this
            organisation.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
          }}
        >
          {canImportTransportManagers ? (
            <Button
              variant="outlined"
              onClick={() => setTransportManagerImportOpen(true)}
            >
              Import Transport Managers
            </Button>
          ) : null}

          {canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Add user
            </Button>
          ) : !canImportTransportManagers ? (
            <ManageAccountsRounded
              sx={{
                fontSize: 40,

                color: "primary.main",
              }}
            />
          ) : null}
        </Box>
      </Box>

      <Alert
        severity="info"
        sx={{
          mb: 2,

          maxWidth: 1100,
        }}
      >
        One person keeps one global account. Adding an email that already
        belongs to another school group links that existing identity to this
        organisation without replacing its password.
      </Alert>

      {usersQuery.isLoading ? (
        <Paper
          elevation={0}
          sx={{
            minHeight: 260,

            display: "grid",

            placeItems: "center",

            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <CircularProgress size={30} />
        </Paper>
      ) : null}

      {usersQuery.isError ? (
        <Alert severity="error">
          {usersQuery.error instanceof Error
            ? usersQuery.error.message
            : "Unable to load organisation users."}
        </Alert>
      ) : null}

      {usersQuery.data ? (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: "1px solid",

            borderColor: "divider",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>

                <TableCell>Role</TableCell>

                <TableCell>Tenant access</TableCell>

                <TableCell>Password</TableCell>

                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {usersQuery.data.map((tenantUser) => {
                const isCurrentUser =
                  tenantUser.id === authenticatedUser?.userId;

                const isOwner = tenantUser.role === "owner";

                const roleEditable =
                  !isCurrentUser &&
                  !isOwner &&
                  isGenericRoleEditable(tenantUser.role);

                const canShowActions =
                  (canResetPassword && !isCurrentUser) ||
                  (canUpdateRole && roleEditable) ||
                  (canDeactivate &&
                    !isCurrentUser &&
                    !isOwner &&
                    tenantUser.membershipStatus === "active") ||
                  (canActivate &&
                    !isOwner &&
                    tenantUser.membershipStatus === "suspended");

                return (
                  <TableRow key={tenantUser.id} hover>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",

                          alignItems: "center",

                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,

                            display: "grid",

                            placeItems: "center",

                            borderRadius: 2,

                            bgcolor: "action.hover",

                            color: "primary.main",
                          }}
                        >
                          <PersonRounded fontSize="small" />
                        </Box>

                        <Box>
                          <Typography
                            sx={{
                              fontSize: 12.5,

                              fontWeight: 800,
                            }}
                          >
                            {tenantUser.firstName} {tenantUser.lastName}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.25,

                              color: "text.secondary",

                              fontSize: 10.5,
                            }}
                          >
                            {tenantUser.email}
                            {isCurrentUser ? " · You" : ""}
                          </Typography>

                          {tenantUser.userStatus !== "active" ? (
                            <Typography
                              sx={{
                                mt: 0.25,

                                color: "warning.main",

                                fontSize: 9.5,

                                fontWeight: 700,
                              }}
                            >
                              Global account: {tenantUser.userStatus}
                            </Typography>
                          ) : null}
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={roleLabel(tenantUser.role)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={membershipLabel(tenantUser.membershipStatus)}
                        size="small"
                        color={
                          tenantUser.membershipStatus === "active"
                            ? "success"
                            : tenantUser.membershipStatus === "suspended"
                              ? "warning"
                              : "default"
                        }
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={
                          tenantUser.mustChangePassword
                            ? "Change required"
                            : "Current"
                        }
                        size="small"
                        color={
                          tenantUser.mustChangePassword ? "warning" : "default"
                        }
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell align="right">
                      {canShowActions ? (
                        <Tooltip title="Manage user">
                          <IconButton
                            size="small"
                            aria-label={`Manage ${tenantUser.email}`}
                            onClick={(event) =>
                              setActionMenu({
                                anchorEl: event.currentTarget,

                                user: tenantUser,
                              })
                            }
                          >
                            <MoreVertRounded />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography
                          sx={{
                            color: "text.disabled",

                            fontSize: 10.5,
                          }}
                        >
                          {isCurrentUser
                            ? "Use account security"
                            : isOwner
                              ? "Protected"
                              : "Read only"}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}

      <Menu
        anchorEl={actionMenu?.anchorEl ?? null}
        open={actionMenu !== null}
        onClose={closeActionMenu}
      >
        {actionMenu &&
        canUpdateRole &&
        actionMenu.user.id !== authenticatedUser?.userId &&
        actionMenu.user.role !== "owner" &&
        isGenericRoleEditable(actionMenu.user.role) ? (
          <MenuItem
            onClick={() => {
              setRoleUser(actionMenu.user);

              closeActionMenu();
            }}
          >
            <EditRounded
              fontSize="small"
              sx={{
                mr: 1.5,
              }}
            />
            Change role
          </MenuItem>
        ) : null}

        {actionMenu &&
        canResetPassword &&
        actionMenu.user.id !== authenticatedUser?.userId ? (
          <MenuItem
            onClick={() => {
              setResetUser(actionMenu.user);

              closeActionMenu();
            }}
          >
            <LockResetRounded
              fontSize="small"
              sx={{
                mr: 1.5,
              }}
            />
            Reset password
          </MenuItem>
        ) : null}

        {actionMenu &&
        (canUpdateRole || canResetPassword) &&
        ((canDeactivate && actionMenu.user.membershipStatus === "active") ||
          (canActivate && actionMenu.user.membershipStatus === "suspended")) ? (
          <Divider />
        ) : null}

        {actionMenu &&
        canDeactivate &&
        actionMenu.user.id !== authenticatedUser?.userId &&
        actionMenu.user.role !== "owner" &&
        actionMenu.user.membershipStatus === "active" ? (
          <MenuItem
            onClick={() => {
              setAccessDialog({
                user: actionMenu.user,

                action: "deactivate",
              });

              closeActionMenu();
            }}
          >
            <PersonOffRounded
              fontSize="small"
              sx={{
                mr: 1.5,
              }}
            />
            Deactivate access
          </MenuItem>
        ) : null}

        {actionMenu &&
        canActivate &&
        actionMenu.user.role !== "owner" &&
        actionMenu.user.membershipStatus === "suspended" ? (
          <MenuItem
            onClick={() => {
              setAccessDialog({
                user: actionMenu.user,

                action: "activate",
              });

              closeActionMenu();
            }}
          >
            <CheckCircleRounded
              fontSize="small"
              sx={{
                mr: 1.5,
              }}
            />
            Reactivate access
          </MenuItem>
        ) : null}
      </Menu>

      <TransportManagerImportDialog
        open={transportManagerImportOpen}
        tenantId={tenantId}
        onClose={() => setTransportManagerImportOpen(false)}
      />

      <CreateUserDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateUser}
      />

      <ChangeUserRoleDialog
        key={roleUser?.id ?? "no-role-user"}
        open={roleUser !== null}
        user={roleUser}
        onClose={() => setRoleUser(null)}
        onSubmit={handleChangeRole}
      />

      <ResetUserPasswordDialog
        key={resetUser?.id ?? "no-reset-user"}
        open={resetUser !== null}
        user={resetUser}
        onClose={() => setResetUser(null)}
        onReset={handleResetPassword}
      />

      <UserAccessDialog
        key={
          accessDialog
            ? `${accessDialog.user.id}-${accessDialog.action}`
            : "no-access-user"
        }
        open={accessDialog !== null}
        user={accessDialog?.user ?? null}
        action={accessDialog?.action ?? "deactivate"}
        onClose={() => setAccessDialog(null)}
        onConfirm={handleAccessAction}
      />

      <Snackbar
        open={successMessage !== null}
        autoHideDuration={6500}
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
