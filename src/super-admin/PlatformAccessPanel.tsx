import { useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  AddRounded,
  BlockRounded,
  LockResetRounded,
  LockRounded,
  PersonRounded,
  RestoreRounded,
  SaveRounded,
  SearchRounded,
  VisibilityRounded,
} from "@mui/icons-material";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Paper,
  Pagination,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPlatformAccessUser,
  getPlatformAccessRole,
  getPlatformUserAccess,
  listPlatformAccessRoles,
  listPlatformAccessUsers,
  listPlatformPermissionCatalogue,
  replacePlatformRolePermissions,
  replacePlatformUserPermissions,
  resetPlatformAccessUserPassword,
  setPlatformAccessUserStatus,
  type PlatformAccessUser,
  type PlatformPermissionCatalogueItem,
  type PlatformUserAccess,
} from "./platform.api";

type AccessWorkspaceView = "users" | "roles";

const permissionModules = [
  {
    key: "audit",
    label: "Audit",
  },
  {
    key: "devices",
    label: "Services",
  },
  {
    key: "finance",
    label: "Finance",
  },
  {
    key: "onboarding",
    label: "Onboarding",
  },
  {
    key: "roles",
    label: "Roles",
  },
  {
    key: "school",
    label: "Schools",
  },
  {
    key: "school_setup",
    label: "School Setup",
  },
  {
    key: "users",
    label: "Users",
  },
] as const;

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function roleLabel(role: string): string {
  return humanize(role);
}

function permissionLabel(permission: PlatformPermissionCatalogueItem): string {
  return humanize(permission.action);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

interface DetailRowProps {
  label: string;

  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <Box
      sx={{
        display: "grid",

        gridTemplateColumns: "150px minmax(0, 1fr)",

        gap: 1,

        py: 0.7,

        borderBottom: "1px solid",

        borderColor: "divider",
      }}
    >
      <Typography
        sx={{
          color: "text.secondary",

          fontSize: 9.5,

          fontWeight: 750,
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          minWidth: 0,

          fontSize: 10,

          fontWeight: 700,

          wordBreak: "break-word",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function PlatformAccessPanel() {
  const queryClient = useQueryClient();

  const [accessView, setAccessView] = useState<AccessWorkspaceView>("users");

  const [page, setPage] = useState(1);

  const [selectedRoleKey, setSelectedRoleKey] = useState("");

  const [selectedUserId, setSelectedUserId] = useState("");

  const [selectedSearchUser, setSelectedSearchUser] =
    useState<PlatformAccessUser | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [activeModule, setActiveModule] = useState<string>("onboarding");

  const [draftAdditionalPermissions, setDraftAdditionalPermissions] = useState<
    Set<string>
  >(() => new Set());

  const [draftRolePermissions, setDraftRolePermissions] = useState<Set<string>>(
    () => new Set(),
  );

  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);

  const [statusOpen, setStatusOpen] = useState(false);

  const [createFirstName, setCreateFirstName] = useState("");

  const [createLastName, setCreateLastName] = useState("");

  const [createEmail, setCreateEmail] = useState("");

  const [createRole, setCreateRole] = useState("");

  const [createPassword, setCreatePassword] = useState("");

  const [resetPassword, setResetPassword] = useState("");

  const [resetConfirmPassword, setResetConfirmPassword] = useState("");

  const normalizedSearch = deferredSearchTerm.trim();

  const usersQuery = useQuery({
    queryKey: ["platform", "access", "users", normalizedSearch, page],

    queryFn: () =>
      listPlatformAccessUsers({
        search: normalizedSearch,
        page,
        limit: 12,
      }),
  });

  const rolesQuery = useQuery({
    queryKey: ["platform", "access", "roles"],

    queryFn: listPlatformAccessRoles,
  });

  const permissionsQuery = useQuery({
    queryKey: ["platform", "access", "permissions"],

    queryFn: listPlatformPermissionCatalogue,
  });

  const roleQuery = useQuery({
    queryKey: ["platform", "access", "role", selectedRoleKey],

    enabled: Boolean(selectedRoleKey),

    queryFn: () => getPlatformAccessRole(selectedRoleKey),
  });

  const accessQuery = useQuery({
    queryKey: ["platform", "access", "user", selectedUserId],

    enabled: Boolean(selectedUserId),

    queryFn: () => getPlatformUserAccess(selectedUserId),
  });

  useEffect(() => {
    const items = usersQuery.data?.items ?? [];

    if (items.length === 0) {
      setSelectedUserId("");
      setSelectedSearchUser(null);

      return;
    }

    if (!items.some((item) => item.id === selectedUserId)) {
      const first = items[0];

      setSelectedUserId(first.id);
      setSelectedSearchUser(first);
    }
  }, [usersQuery.data, selectedUserId]);

  useEffect(() => {
    const roles = rolesQuery.data ?? [];

    if (
      roles.length > 0 &&
      !roles.some((role) => role.key === selectedRoleKey)
    ) {
      setSelectedRoleKey(roles[0].key);
    }
  }, [rolesQuery.data, selectedRoleKey]);

  useEffect(() => {
    const role = roleQuery.data;

    if (!role) {
      return;
    }

    setDraftRolePermissions(new Set(role.permissionKeys));
    setSavedMessage(null);
  }, [roleQuery.data]);

  useEffect(() => {
    const access = accessQuery.data;

    if (!access) {
      return;
    }

    setDraftAdditionalPermissions(new Set(access.additionalPermissions));

    setSavedMessage(null);
  }, [accessQuery.data]);

  const access = accessQuery.data;

  const inheritedPermissions = useMemo(
    () => new Set(access?.inheritedPermissions ?? []),
    [access?.inheritedPermissions],
  );

  const originalAdditionalPermissions = useMemo(
    () => new Set(access?.additionalPermissions ?? []),
    [access?.additionalPermissions],
  );

  const originalRolePermissions = useMemo(
    () => new Set(roleQuery.data?.permissionKeys ?? []),
    [roleQuery.data?.permissionKeys],
  );

  const hasRoleChanges = useMemo(() => {
    if (!roleQuery.data) {
      return false;
    }

    if (originalRolePermissions.size !== draftRolePermissions.size) {
      return true;
    }

    return Array.from(draftRolePermissions).some(
      (permission) => !originalRolePermissions.has(permission),
    );
  }, [draftRolePermissions, originalRolePermissions, roleQuery.data]);

  const hasUnsavedChanges = useMemo(() => {
    if (!access) {
      return false;
    }

    if (
      originalAdditionalPermissions.size !== draftAdditionalPermissions.size
    ) {
      return true;
    }

    return Array.from(draftAdditionalPermissions).some(
      (permission) => !originalAdditionalPermissions.has(permission),
    );
  }, [access, draftAdditionalPermissions, originalAdditionalPermissions]);

  const permissionMap = useMemo(() => {
    const groups = new Map<string, PlatformPermissionCatalogueItem[]>();

    for (const permission of permissionsQuery.data ?? []) {
      const group = groups.get(permission.module) ?? [];

      group.push(permission);

      groups.set(permission.module, group);
    }

    return groups;
  }, [permissionsQuery.data]);

  const activePermissions = permissionMap.get(activeModule) ?? [];

  function updateAccessCache(nextAccess: PlatformUserAccess): void {
    queryClient.setQueryData(
      ["platform", "access", "user", nextAccess.user.id],
      nextAccess,
    );

    setDraftAdditionalPermissions(new Set(nextAccess.additionalPermissions));
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      replacePlatformUserPermissions(
        selectedUserId,

        Array.from(draftAdditionalPermissions).sort(),
      ),

    onSuccess: (nextAccess) => {
      updateAccessCache(nextAccess);

      setSavedMessage("Permissions saved.");
    },
  });

  const saveRoleMutation = useMutation({
    mutationFn: () =>
      replacePlatformRolePermissions(
        selectedRoleKey,
        Array.from(draftRolePermissions).sort(),
      ),

    onSuccess: async (nextRole) => {
      queryClient.setQueryData(
        ["platform", "access", "role", nextRole.key],
        nextRole,
      );

      setDraftRolePermissions(new Set(nextRole.permissionKeys));

      setSavedMessage("Role permissions saved.");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["platform", "access", "roles"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["platform", "access", "user"],
        }),
      ]);
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createPlatformAccessUser({
        firstName: createFirstName,

        lastName: createLastName,

        email: createEmail,

        role: createRole,

        temporaryPassword: createPassword,
      }),

    onSuccess: (nextAccess) => {
      updateAccessCache(nextAccess);

      setSelectedUserId(nextAccess.user.id);

      setSelectedSearchUser({
        id: nextAccess.user.id,

        email: nextAccess.user.email,

        firstName: nextAccess.user.firstName,

        lastName: nextAccess.user.lastName,

        status: nextAccess.user.status,

        platformAccessStatus: nextAccess.platformAccessStatus,

        roles: nextAccess.roles,

        createdAt: nextAccess.user.createdAt,

        platformAddedAt: nextAccess.platformAddedAt,
      });

      setSearchTerm("");
      setPage(1);

      setCreateOpen(false);

      setCreateFirstName("");

      setCreateLastName("");

      setCreateEmail("");

      setCreateRole("");

      setCreatePassword("");

      setSavedMessage("Platform user created.");

      void queryClient.invalidateQueries({
        queryKey: ["platform", "access", "users"],
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) {
        throw new Error("No platform user selected.");
      }

      if (resetPassword.length < 12) {
        throw new Error(
          "Temporary password must contain at least 12 characters.",
        );
      }

      if (resetPassword !== resetConfirmPassword) {
        throw new Error("Temporary password and confirmation do not match.");
      }

      return resetPlatformAccessUserPassword(selectedUserId, resetPassword);
    },

    onSuccess: (nextAccess) => {
      updateAccessCache(nextAccess);

      setResetPassword("");

      setResetConfirmPassword("");

      setResetOpen(false);

      setSavedMessage(
        `Temporary password set for ${nextAccess.user.firstName} ${nextAccess.user.lastName}. They must change it at next sign-in.`,
      );

      void queryClient.invalidateQueries({
        queryKey: ["platform", "access", "users"],
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!access) {
        throw new Error("No platform user selected");
      }

      return setPlatformAccessUserStatus(
        selectedUserId,

        access.platformAccessStatus === "active" ? "suspended" : "active",
      );
    },

    onSuccess: (nextAccess) => {
      updateAccessCache(nextAccess);

      setStatusOpen(false);

      setSavedMessage(
        nextAccess.platformAccessStatus === "active"
          ? "Platform access restored."
          : "Platform access denied.",
      );

      void queryClient.invalidateQueries({
        queryKey: ["platform", "access", "users"],
      });
    },
  });

  function selectUser(user: PlatformAccessUser): void {
    setSelectedSearchUser(user);

    setSelectedUserId(user.id);

    setSavedMessage(null);

    saveMutation.reset();
  }

  function togglePermission(permissionKey: string, checked: boolean): void {
    setDraftAdditionalPermissions((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }

      return next;
    });

    setSavedMessage(null);

    saveMutation.reset();
  }

  function toggleRolePermission(permissionKey: string, checked: boolean): void {
    setDraftRolePermissions((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }

      return next;
    });

    setSavedMessage(null);
    saveRoleMutation.reset();
  }

  function moduleRoleCount(module: string): number {
    return (permissionMap.get(module) ?? []).filter((permission) =>
      draftRolePermissions.has(permission.key),
    ).length;
  }

  function moduleAdditionalCount(module: string): number {
    return (permissionMap.get(module) ?? []).filter((permission) =>
      draftAdditionalPermissions.has(permission.key),
    ).length;
  }

  function moduleInheritedCount(module: string): number {
    return (permissionMap.get(module) ?? []).filter((permission) =>
      inheritedPermissions.has(permission.key),
    ).length;
  }

  const selectedName = access
    ? `${access.user.firstName} ${access.user.lastName}`
    : selectedSearchUser
      ? `${selectedSearchUser.firstName} ${selectedSearchUser.lastName}`
      : "";

  const currentRoles = access?.roles ?? selectedSearchUser?.roles ?? [];

  const currentStatus =
    access?.platformAccessStatus ??
    selectedSearchUser?.platformAccessStatus ??
    null;

  const permissionsEditable = currentStatus === "active";

  const usersPage = usersQuery.data ?? {
    items: [],
    total: 0,
  };

  const totalPages = Math.max(1, Math.ceil(usersPage.total / 12));

  const selectedRole = roleQuery.data;

  const anyMutationPending =
    saveMutation.isPending ||
    createMutation.isPending ||
    resetMutation.isPending ||
    statusMutation.isPending ||
    saveRoleMutation.isPending;

  if (rolesQuery.isLoading || permissionsQuery.isLoading) {
    return (
      <Box
        sx={{
          flex: 1,

          width: "100%",
          height: "100%",

          minHeight: 0,

          display: "grid",

          placeItems: "center",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (rolesQuery.isError || permissionsQuery.isError) {
    return (
      <Alert severity="error">
        Unable to load platform access configuration.
      </Alert>
    );
  }

  return (
    <>
      <Box
        sx={{
          flex: 1,
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            flexShrink: 0,
            p: 1,
            borderRadius: 2,
            bgcolor: "rgba(15, 23, 42, 0.30)",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "auto minmax(240px, 1fr) auto",
              },
              gap: 0.8,
              alignItems: "center",
            }}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={accessView}
              onChange={(_, value: AccessWorkspaceView | null) => {
                if (value) {
                  setAccessView(value);
                  setSavedMessage(null);
                }
              }}
            >
              <ToggleButton value="users">Users</ToggleButton>

              <ToggleButton value="roles">Roles</ToggleButton>
            </ToggleButtonGroup>

            {accessView === "users" ? (
              <TextField
                size="small"
                value={searchTerm}
                placeholder="Search name, email or role..."
                fullWidth
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                  setSavedMessage(null);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded sx={{ fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            ) : (
              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: 9.5,
                }}
              >
                Edit the inherited permission template for each platform role.
              </Typography>
            )}

            <Button
              variant="contained"
              size="small"
              startIcon={<AddRounded />}
              onClick={() => setCreateOpen(true)}
              sx={{
                minHeight: 38,
                whiteSpace: "nowrap",
                textTransform: "none",
                fontWeight: 850,
              }}
            >
              Create User
            </Button>
          </Box>
        </Paper>

        {saveMutation.isError ||
        saveRoleMutation.isError ||
        createMutation.isError ||
        resetMutation.isError ||
        statusMutation.isError ? (
          <Alert severity="error" sx={{ flexShrink: 0 }}>
            {(() => {
              const mutationError =
                saveMutation.error ??
                saveRoleMutation.error ??
                createMutation.error ??
                resetMutation.error ??
                statusMutation.error;

              return mutationError instanceof Error
                ? mutationError.message
                : "Unable to update platform access";
            })()}
          </Alert>
        ) : null}

        {savedMessage ? (
          <Alert severity="success" sx={{ flexShrink: 0 }}>
            {savedMessage}
          </Alert>
        ) : null}

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "285px minmax(0, 1fr)",
            },
            gap: 1,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              bgcolor: "rgba(15, 23, 42, 0.28)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 1.25,
                py: 1,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 900 }}>
                {accessView === "users" ? "Platform users" : "Platform roles"}
              </Typography>

              <Typography
                sx={{
                  mt: 0.2,
                  color: "text.secondary",
                  fontSize: 8.5,
                }}
              >
                {accessView === "users"
                  ? `${usersPage.total} platform users`
                  : `${rolesQuery.data?.length ?? 0} active roles`}
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                p: 0.65,
              }}
            >
              {accessView === "users" ? (
                usersQuery.isLoading ? (
                  <Box sx={{ py: 5, display: "grid", placeItems: "center" }}>
                    <CircularProgress size={22} />
                  </Box>
                ) : usersQuery.isError ? (
                  <Alert severity="error">Unable to load platform users.</Alert>
                ) : usersPage.items.length === 0 ? (
                  <Box
                    sx={{
                      py: 5,
                      px: 2,
                      textAlign: "center",
                    }}
                  >
                    <PersonRounded
                      sx={{
                        fontSize: 32,
                        color: "text.disabled",
                      }}
                    />

                    <Typography
                      sx={{
                        mt: 0.7,
                        color: "text.secondary",
                        fontSize: 9.5,
                      }}
                    >
                      No matching platform users.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={0.4}>
                    {usersPage.items.map((user) => {
                      const selected = user.id === selectedUserId;

                      return (
                        <Button
                          key={user.id}
                          fullWidth
                          onClick={() => selectUser(user)}
                          sx={{
                            justifyContent: "flex-start",
                            textAlign: "left",
                            textTransform: "none",
                            px: 1,
                            py: 0.85,
                            borderRadius: 1.4,
                            bgcolor: selected
                              ? "rgba(37, 99, 235, 0.16)"
                              : "transparent",
                          }}
                        >
                          <Box sx={{ minWidth: 0, width: "100%" }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 0.6,
                              }}
                            >
                              <Typography
                                sx={{
                                  minWidth: 0,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  color: "text.primary",
                                  fontSize: 10.25,
                                  fontWeight: 850,
                                }}
                              >
                                {user.firstName} {user.lastName}
                              </Typography>

                              <Chip
                                size="small"
                                label={humanize(user.platformAccessStatus)}
                                color={
                                  user.platformAccessStatus === "active"
                                    ? "success"
                                    : user.platformAccessStatus === "suspended"
                                      ? "warning"
                                      : "default"
                                }
                                variant="outlined"
                                sx={{ height: 18 }}
                              />
                            </Box>

                            <Typography
                              sx={{
                                mt: 0.15,
                                color: "text.secondary",
                                fontSize: 8.25,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {user.email}
                            </Typography>

                            <Typography
                              sx={{
                                mt: 0.15,
                                color: "text.secondary",
                                fontSize: 8,
                              }}
                            >
                              {user.roles.map(roleLabel).join(", ")}
                            </Typography>
                          </Box>
                        </Button>
                      );
                    })}
                  </Stack>
                )
              ) : (
                <Stack spacing={0.4}>
                  {(rolesQuery.data ?? []).map((role) => {
                    const selected = role.key === selectedRoleKey;

                    return (
                      <Button
                        key={role.key}
                        fullWidth
                        onClick={() => {
                          setSelectedRoleKey(role.key);
                          setSavedMessage(null);
                          saveRoleMutation.reset();
                        }}
                        sx={{
                          justifyContent: "flex-start",
                          textAlign: "left",
                          textTransform: "none",
                          px: 1,
                          py: 0.9,
                          borderRadius: 1.4,
                          bgcolor: selected
                            ? "rgba(37, 99, 235, 0.16)"
                            : "transparent",
                        }}
                      >
                        <Box sx={{ width: "100%", minWidth: 0 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 0.75,
                            }}
                          >
                            <Typography
                              sx={{
                                color: "text.primary",
                                fontSize: 10.25,
                                fontWeight: 850,
                              }}
                            >
                              {role.name}
                            </Typography>

                            {!role.editable ? (
                              <LockRounded
                                sx={{
                                  width: 14,
                                  height: 14,
                                  color: "text.secondary",
                                }}
                              />
                            ) : null}
                          </Box>

                          <Typography
                            sx={{
                              mt: 0.2,
                              color: "text.secondary",
                              fontSize: 8.25,
                            }}
                          >
                            {role.permissionCount} permissions
                          </Typography>
                        </Box>
                      </Button>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {accessView === "users" && usersPage.total > 0 ? (
              <Box
                sx={{
                  flexShrink: 0,
                  p: 0.8,
                  display: "flex",
                  justifyContent: "center",
                  borderTop: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Pagination
                  size="small"
                  page={page}
                  count={totalPages}
                  onChange={(_, nextPage) => {
                    setPage(nextPage);
                    setSavedMessage(null);
                  }}
                />
              </Box>
            ) : null}
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              bgcolor: "rgba(15, 23, 42, 0.28)",
              overflow: "hidden",
            }}
          >
            {accessView === "users" ? (
              !selectedUserId ? (
                <Box
                  sx={{
                    flex: 1,
                    display: "grid",
                    placeItems: "center",
                    px: 3,
                  }}
                >
                  <Typography
                    sx={{
                      color: "text.secondary",
                      fontSize: 10,
                    }}
                  >
                    Select a platform user.
                  </Typography>
                </Box>
              ) : accessQuery.isLoading ? (
                <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              ) : accessQuery.isError ? (
                <Alert severity="error">
                  Unable to load this user's access.
                </Alert>
              ) : access ? (
                <>
                  <Box
                    sx={{
                      flexShrink: 0,
                      px: 1.4,
                      py: 1,
                      borderBottom: "1px solid",
                      borderColor: "divider",
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
                        gap: 1,
                        flexDirection: {
                          xs: "column",
                          md: "row",
                        },
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 900 }}>
                          {selectedName}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.15,
                            color: "text.secondary",
                            fontSize: 8.75,
                          }}
                        >
                          {access.user.email}
                          {" · "}
                          {currentRoles.map(roleLabel).join(", ")}
                        </Typography>
                      </Box>

                      <Stack
                        direction="row"
                        spacing={0.5}
                        useFlexGap
                        sx={{ flexWrap: "wrap" }}
                      >
                        <Chip
                          size="small"
                          label={
                            currentStatus
                              ? humanize(currentStatus)
                              : "No access"
                          }
                          color={
                            currentStatus === "active"
                              ? "success"
                              : currentStatus === "suspended"
                                ? "warning"
                                : "default"
                          }
                          variant="outlined"
                        />

                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityRounded />}
                          onClick={() => setViewOpen(true)}
                        >
                          View
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<LockResetRounded />}
                          disabled={anyMutationPending}
                          onClick={() => {
                            setResetPassword("");
                            setResetConfirmPassword("");
                            resetMutation.reset();
                            setSavedMessage(null);
                            setResetOpen(true);
                          }}
                        >
                          Reset password
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          color={
                            currentStatus === "active" ? "error" : "success"
                          }
                          startIcon={
                            currentStatus === "active" ? (
                              <BlockRounded />
                            ) : (
                              <RestoreRounded />
                            )
                          }
                          disabled={
                            anyMutationPending || currentStatus === "revoked"
                          }
                          onClick={() => setStatusOpen(true)}
                        >
                          {currentStatus === "active" ? "Suspend" : "Restore"}
                        </Button>

                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SaveRounded />}
                          disabled={
                            !permissionsEditable ||
                            !hasUnsavedChanges ||
                            saveMutation.isPending
                          }
                          onClick={() => {
                            setSavedMessage(null);
                            saveMutation.mutate();
                          }}
                        >
                          Save access
                        </Button>
                      </Stack>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      flexShrink: 0,
                      p: 0.7,
                      display: "flex",
                      gap: 0.45,
                      flexWrap: "wrap",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {permissionModules.map((module) => (
                      <Button
                        key={module.key}
                        size="small"
                        variant={
                          activeModule === module.key ? "contained" : "text"
                        }
                        onClick={() => setActiveModule(module.key)}
                        sx={{
                          minHeight: 30,
                          textTransform: "none",
                          fontSize: 9,
                        }}
                      >
                        {module.label}
                        {" · "}
                        {moduleInheritedCount(module.key) +
                          moduleAdditionalCount(module.key)}
                      </Button>
                    ))}
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      p: 0.9,
                    }}
                  >
                    <Stack spacing={0.5}>
                      {activePermissions.map((permission) => {
                        const inherited = inheritedPermissions.has(
                          permission.key,
                        );

                        const additional = draftAdditionalPermissions.has(
                          permission.key,
                        );

                        return (
                          <Paper
                            key={permission.key}
                            variant="outlined"
                            sx={{
                              px: 1,
                              py: 0.7,
                              borderRadius: 1.4,
                              bgcolor: inherited
                                ? "rgba(37, 99, 235, 0.055)"
                                : "transparent",
                            }}
                          >
                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: "28px minmax(0, 1fr) auto",
                                gap: 0.8,
                                alignItems: "center",
                              }}
                            >
                              <Checkbox
                                size="small"
                                checked={inherited || additional}
                                disabled={
                                  inherited ||
                                  !permissionsEditable ||
                                  saveMutation.isPending
                                }
                                onChange={(event) =>
                                  togglePermission(
                                    permission.key,
                                    event.target.checked,
                                  )
                                }
                              />

                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    fontSize: 10.25,
                                    fontWeight: 820,
                                  }}
                                >
                                  {permissionLabel(permission)}
                                </Typography>

                                <Typography
                                  sx={{
                                    mt: 0.08,
                                    color: "text.secondary",
                                    fontSize: 8.4,
                                  }}
                                >
                                  {permission.description ?? permission.key}
                                </Typography>
                              </Box>

                              {inherited ? (
                                <Chip
                                  size="small"
                                  icon={<LockRounded />}
                                  label="Inherited"
                                  variant="outlined"
                                />
                              ) : additional ? (
                                <Chip
                                  size="small"
                                  label="User extra"
                                  color="primary"
                                  variant="outlined"
                                />
                              ) : null}
                            </Box>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Box>
                </>
              ) : null
            ) : roleQuery.isLoading ? (
              <Box sx={{ flex: 1, display: "grid", placeItems: "center" }}>
                <CircularProgress size={24} />
              </Box>
            ) : roleQuery.isError ? (
              <Alert severity="error">Unable to load this role.</Alert>
            ) : selectedRole ? (
              <>
                <Box
                  sx={{
                    flexShrink: 0,
                    px: 1.4,
                    py: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
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
                      gap: 1,
                      flexDirection: {
                        xs: "column",
                        md: "row",
                      },
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 900 }}>
                        {selectedRole.name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.2,
                          color: "text.secondary",
                          fontSize: 8.75,
                        }}
                      >
                        {selectedRole.description ??
                          "Platform role permission template"}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.6}>
                      {!selectedRole.editable ? (
                        <Chip
                          size="small"
                          icon={<LockRounded />}
                          label="Protected role"
                          variant="outlined"
                        />
                      ) : null}

                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveRounded />}
                        disabled={
                          !selectedRole.editable ||
                          !hasRoleChanges ||
                          saveRoleMutation.isPending
                        }
                        onClick={() => {
                          setSavedMessage(null);
                          saveRoleMutation.mutate();
                        }}
                      >
                        Save role
                      </Button>
                    </Stack>
                  </Box>
                </Box>

                {!selectedRole.editable ? (
                  <Alert severity="info" sx={{ borderRadius: 0 }}>
                    Super Admin authority is protected and cannot be reduced
                    from this screen.
                  </Alert>
                ) : null}

                <Box
                  sx={{
                    flexShrink: 0,
                    p: 0.7,
                    display: "flex",
                    gap: 0.45,
                    flexWrap: "wrap",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {permissionModules.map((module) => (
                    <Button
                      key={module.key}
                      size="small"
                      variant={
                        activeModule === module.key ? "contained" : "text"
                      }
                      onClick={() => setActiveModule(module.key)}
                      sx={{
                        minHeight: 30,
                        textTransform: "none",
                        fontSize: 9,
                      }}
                    >
                      {module.label}
                      {" · "}
                      {moduleRoleCount(module.key)}
                    </Button>
                  ))}
                </Box>

                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    p: 0.9,
                  }}
                >
                  <Stack spacing={0.5}>
                    {activePermissions.map((permission) => {
                      const granted = draftRolePermissions.has(permission.key);

                      return (
                        <Paper
                          key={permission.key}
                          variant="outlined"
                          sx={{
                            px: 1,
                            py: 0.7,
                            borderRadius: 1.4,
                            bgcolor: granted
                              ? "rgba(37, 99, 235, 0.055)"
                              : "transparent",
                          }}
                        >
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "28px minmax(0, 1fr) auto",
                              gap: 0.8,
                              alignItems: "center",
                            }}
                          >
                            <Checkbox
                              size="small"
                              checked={granted}
                              disabled={
                                !selectedRole.editable ||
                                saveRoleMutation.isPending
                              }
                              onChange={(event) =>
                                toggleRolePermission(
                                  permission.key,
                                  event.target.checked,
                                )
                              }
                            />

                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontSize: 10.25,
                                  fontWeight: 820,
                                }}
                              >
                                {permissionLabel(permission)}
                              </Typography>

                              <Typography
                                sx={{
                                  mt: 0.08,
                                  color: "text.secondary",
                                  fontSize: 8.4,
                                }}
                              >
                                {permission.description ?? permission.key}
                              </Typography>
                            </Box>

                            {granted ? (
                              <Chip
                                size="small"
                                label="Role permission"
                                variant="outlined"
                              />
                            ) : null}
                          </Box>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>
              </>
            ) : null}
          </Paper>
        </Box>
      </Box>

      {/* ====================================================
          VIEW USER
          ==================================================== */}

      <Dialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Platform User</DialogTitle>

        <DialogContent>
          {access ? (
            <Stack
              spacing={1.5}
              sx={{
                mt: 0.5,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 16,

                    fontWeight: 900,
                  }}
                >
                  {access.user.firstName} {access.user.lastName}
                </Typography>

                <Typography
                  sx={{
                    color: "text.secondary",

                    fontSize: 10,
                  }}
                >
                  {access.user.email}
                </Typography>
              </Box>

              <Box>
                <DetailRow
                  label="Global account"
                  value={humanize(access.user.status)}
                />

                <DetailRow
                  label="Platform access"
                  value={humanize(access.platformAccessStatus)}
                />

                <DetailRow
                  label="Role"
                  value={access.roles.map(roleLabel).join(", ")}
                />

                <DetailRow
                  label="User created"
                  value={formatDate(access.user.createdAt)}
                />

                <DetailRow
                  label="Platform access added"
                  value={formatDate(access.platformAddedAt)}
                />

                <DetailRow
                  label="Platform access updated"
                  value={formatDate(access.platformUpdatedAt)}
                />

                <DetailRow
                  label="Password changed"
                  value={formatDate(access.user.passwordChangedAt)}
                />

                <DetailRow
                  label="Password change required"
                  value={access.user.mustChangePassword ? "Yes" : "No"}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    mb: 0.7,

                    fontSize: 10,

                    fontWeight: 850,
                  }}
                >
                  Role assignments
                </Typography>

                <Stack spacing={0.5}>
                  {access.roleAssignments.map((assignment) => (
                    <Paper
                      key={assignment.role}
                      variant="outlined"
                      sx={{
                        px: 1,
                        py: 0.75,

                        borderRadius: 1.4,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",

                          justifyContent: "space-between",

                          gap: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 9.5,

                            fontWeight: 800,
                          }}
                        >
                          {roleLabel(assignment.role)}
                        </Typography>

                        <Chip
                          size="small"
                          label={humanize(assignment.status)}
                        />
                      </Box>

                      <Typography
                        sx={{
                          mt: 0.4,

                          color: "text.secondary",

                          fontSize: 8.5,
                        }}
                      >
                        Added {formatDate(assignment.createdAt)}
                        {" · Updated "}
                        {formatDate(assignment.updatedAt)}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ====================================================
          CREATE USER
          ==================================================== */}

      <Dialog
        open={createOpen}
        onClose={() => {
          if (!createMutation.isPending) {
            setCreateOpen(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Platform User</DialogTitle>

        <DialogContent>
          <Stack
            spacing={1.5}
            sx={{
              mt: 0.5,
            }}
          >
            <Box
              sx={{
                display: "grid",

                gridTemplateColumns: {
                  xs: "1fr",

                  sm: "1fr 1fr",
                },

                gap: 1,
              }}
            >
              <TextField
                label="First name"
                value={createFirstName}
                onChange={(event) => setCreateFirstName(event.target.value)}
                fullWidth
              />

              <TextField
                label="Last name"
                value={createLastName}
                onChange={(event) => setCreateLastName(event.target.value)}
                fullWidth
              />
            </Box>

            <TextField
              label="Email"
              type="email"
              value={createEmail}
              onChange={(event) => setCreateEmail(event.target.value)}
              fullWidth
            />

            <TextField
              select
              label="Platform role"
              value={createRole}
              onChange={(event) => setCreateRole(event.target.value)}
              fullWidth
            >
              {rolesQuery.data?.map((role) => (
                <MenuItem key={role.key} value={role.key}>
                  {role.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Temporary password"
              type="password"
              value={createPassword}
              onChange={(event) => setCreatePassword(event.target.value)}
              helperText="Minimum 12 characters. The new user will be required to change it."
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={createMutation.isPending}
            onClick={() => setCreateOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={
              createMutation.isPending ||
              createFirstName.trim().length === 0 ||
              createLastName.trim().length === 0 ||
              createEmail.trim().length === 0 ||
              createRole.length === 0 ||
              createPassword.length < 12
            }
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====================================================
          RESET PASSWORD
          ==================================================== */}

      <Dialog
        open={resetOpen}
        onClose={() => {
          if (!resetMutation.isPending) {
            setResetOpen(false);
            setResetPassword("");
            setResetConfirmPassword("");
            resetMutation.reset();
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reset Platform User Password</DialogTitle>

        <DialogContent>
          <Stack spacing={1.5}>
            <Alert severity="info">
              Set a temporary password for {selectedName}. The user will use
              this password to sign in and will then be required to choose their
              own new password before continuing.
            </Alert>

            <TextField
              autoFocus
              label="Temporary password"
              type="password"
              value={resetPassword}
              onChange={(event) => {
                setResetPassword(event.target.value);
                resetMutation.reset();
              }}
              helperText="Minimum 12 characters."
              autoComplete="new-password"
              fullWidth
            />

            <TextField
              label="Confirm temporary password"
              type="password"
              value={resetConfirmPassword}
              onChange={(event) => {
                setResetConfirmPassword(event.target.value);
                resetMutation.reset();
              }}
              error={
                resetConfirmPassword.length > 0 &&
                resetPassword !== resetConfirmPassword
              }
              helperText={
                resetConfirmPassword.length > 0 &&
                resetPassword !== resetConfirmPassword
                  ? "Passwords do not match."
                  : "Enter the same temporary password again."
              }
              autoComplete="new-password"
              fullWidth
            />

            {resetMutation.isError ? (
              <Alert severity="error">
                {resetMutation.error instanceof Error
                  ? resetMutation.error.message
                  : "Password could not be reset."}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={resetMutation.isPending}
            onClick={() => {
              setResetOpen(false);
              setResetPassword("");
              setResetConfirmPassword("");
              resetMutation.reset();
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={
              resetMutation.isPending ||
              resetPassword.length < 12 ||
              resetPassword !== resetConfirmPassword
            }
            onClick={() => resetMutation.mutate()}
          >
            {resetMutation.isPending
              ? "Setting Password..."
              : "Set Temporary Password"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====================================================
          DENY / RESTORE PLATFORM ACCESS
          ==================================================== */}

      <Dialog
        open={statusOpen}
        onClose={() => {
          if (!statusMutation.isPending) {
            setStatusOpen(false);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {currentStatus === "active"
            ? "Deny Platform Access?"
            : "Restore Platform Access?"}
        </DialogTitle>

        <DialogContent>
          <Alert severity={currentStatus === "active" ? "warning" : "info"}>
            {currentStatus === "active"
              ? `This suspends ${selectedName}'s platform-control access only. Their global account and any school/tenant memberships are not changed.`
              : `This restores ${selectedName}'s suspended platform role access.`}
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button
            disabled={statusMutation.isPending}
            onClick={() => setStatusOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color={currentStatus === "active" ? "error" : "success"}
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate()}
          >
            {statusMutation.isPending
              ? "Updating..."
              : currentStatus === "active"
                ? "Deny Access"
                : "Restore Access"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
