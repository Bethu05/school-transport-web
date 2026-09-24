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
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPlatformAccessUser,
  getPlatformUserAccess,
  listPlatformAccessRoles,
  listPlatformPermissionCatalogue,
  replacePlatformUserPermissions,
  resetPlatformAccessUserPassword,
  searchPlatformAccessUsers,
  setPlatformAccessUserStatus,
  type PlatformAccessUser,
  type PlatformPermissionCatalogueItem,
  type PlatformUserAccess,
} from "./platform.api";

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

  const [selectedUserId, setSelectedUserId] = useState("");

  const [selectedSearchUser, setSelectedSearchUser] =
    useState<PlatformAccessUser | null>(null);

  const [searchTerm, setSearchTerm] = useState("");

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [showSearchResults, setShowSearchResults] = useState(false);

  const [activeModule, setActiveModule] = useState<string>("onboarding");

  const [draftAdditionalPermissions, setDraftAdditionalPermissions] = useState<
    Set<string>
  >(() => new Set());

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

  const normalizedSearch = deferredSearchTerm.trim();

  const searchQuery = useQuery({
    queryKey: ["platform", "access", "search", normalizedSearch],

    enabled: normalizedSearch.length >= 2,

    queryFn: () => searchPlatformAccessUsers(normalizedSearch),
  });

  const rolesQuery = useQuery({
    queryKey: ["platform", "access", "roles"],

    queryFn: listPlatformAccessRoles,
  });

  const permissionsQuery = useQuery({
    queryKey: ["platform", "access", "permissions"],

    queryFn: listPlatformPermissionCatalogue,
  });

  const accessQuery = useQuery({
    queryKey: ["platform", "access", "user", selectedUserId],

    enabled: Boolean(selectedUserId),

    queryFn: () => getPlatformUserAccess(selectedUserId),
  });

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

      setSearchTerm(`${nextAccess.user.firstName} ${nextAccess.user.lastName}`);

      setCreateOpen(false);

      setCreateFirstName("");

      setCreateLastName("");

      setCreateEmail("");

      setCreateRole("");

      setCreatePassword("");

      setSavedMessage("Platform user created.");

      void queryClient.invalidateQueries({
        queryKey: ["platform", "access", "search"],
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      resetPlatformAccessUserPassword(selectedUserId, resetPassword),

    onSuccess: (nextAccess) => {
      updateAccessCache(nextAccess);

      setResetPassword("");

      setResetOpen(false);

      setSavedMessage(
        "Temporary password set. User must change it on next sign-in.",
      );
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
        queryKey: ["platform", "access", "search"],
      });
    },
  });

  function selectUser(user: PlatformAccessUser): void {
    setSelectedSearchUser(user);

    setSelectedUserId(user.id);

    setSearchTerm(`${user.firstName} ${user.lastName}`);

    setShowSearchResults(false);

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

  const searchResults = searchQuery.data ?? [];

  const anyMutationPending =
    saveMutation.isPending ||
    createMutation.isPending ||
    resetMutation.isPending ||
    statusMutation.isPending;

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
        {/* ==================================================
            COMPACT CONTROL BAR
            ================================================== */}

        <Paper
          variant="outlined"
          sx={{
            flexShrink: 0,

            px: 1,
            py: 0.9,

            borderRadius: 2,

            bgcolor: "rgba(15, 23, 42, 0.30)",
          }}
        >
          <Box
            sx={{
              display: "grid",

              gridTemplateColumns: {
                xs: "1fr",

                md: "minmax(270px, 1.4fr) minmax(165px, .65fr) auto auto",
              },

              gap: 0.8,

              alignItems: "center",
            }}
          >
            <Box
              sx={{
                position: "relative",

                minWidth: 0,
              }}
            >
              <TextField
                size="small"
                value={searchTerm}
                placeholder="Search platform user..."
                fullWidth
                onFocus={() => {
                  if (searchTerm.trim().length >= 2) {
                    setShowSearchResults(true);
                  }
                }}
                onChange={(event) => {
                  setSearchTerm(event.target.value);

                  setShowSearchResults(true);

                  setSavedMessage(null);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded
                          sx={{
                            fontSize: 18,
                          }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {showSearchResults && searchTerm.trim().length >= 2 ? (
                <Paper
                  elevation={12}
                  sx={{
                    position: "absolute",

                    zIndex: 30,

                    top: "calc(100% + 6px)",

                    left: 0,
                    right: 0,

                    maxHeight: 300,

                    overflowY: "auto",

                    border: "1px solid",

                    borderColor: "divider",

                    bgcolor: "background.paper",
                  }}
                >
                  {searchQuery.isFetching ? (
                    <Box
                      sx={{
                        py: 2,

                        display: "grid",

                        placeItems: "center",
                      }}
                    >
                      <CircularProgress size={20} />
                    </Box>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <Button
                        key={user.id}
                        fullWidth
                        onMouseDown={(event) => {
                          event.preventDefault();

                          selectUser(user);
                        }}
                        sx={{
                          justifyContent: "flex-start",

                          px: 1.4,
                          py: 0.9,

                          borderRadius: 0,

                          textTransform: "none",

                          textAlign: "left",
                        }}
                      >
                        <Box
                          sx={{
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 10.5,

                              fontWeight: 850,

                              color: "text.primary",
                            }}
                          >
                            {user.firstName} {user.lastName}
                          </Typography>

                          <Typography
                            sx={{
                              color: "text.secondary",

                              fontSize: 8.75,

                              overflow: "hidden",

                              textOverflow: "ellipsis",

                              whiteSpace: "nowrap",
                            }}
                          >
                            {user.email}
                            {" · "}
                            {roleLabel(user.roles[0] ?? "")}
                          </Typography>
                        </Box>
                      </Button>
                    ))
                  ) : (
                    <Typography
                      sx={{
                        px: 1.4,
                        py: 1.25,

                        color: "text.secondary",

                        fontSize: 9.5,
                      }}
                    >
                      No matching platform user.
                    </Typography>
                  )}
                </Paper>
              ) : null}
            </Box>

            <TextField
              size="small"
              label="Role"
              value={currentRoles.map(roleLabel).join(", ")}
              placeholder="Select user"
              fullWidth
              slotProps={{
                input: {
                  readOnly: true,
                },
              }}
            />

            <Chip
              size="small"
              label={currentStatus ? humanize(currentStatus) : "No user"}
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

          {selectedUserId ? (
            <>
              <Divider
                sx={{
                  my: 0.8,
                }}
              />

              <Box
                sx={{
                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  gap: 0.75,

                  flexWrap: "wrap",
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,

                    flex: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 10.5,

                      fontWeight: 850,
                    }}
                  >
                    {selectedName}
                  </Typography>

                  <Typography
                    sx={{
                      color: "text.secondary",

                      fontSize: 8.75,

                      overflow: "hidden",

                      textOverflow: "ellipsis",

                      whiteSpace: "nowrap",
                    }}
                  >
                    {access?.user.email ?? selectedSearchUser?.email}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={0.5}
                  useFlexGap
                  sx={{
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityRounded />}
                    disabled={!access}
                    onClick={() => setViewOpen(true)}
                    sx={{
                      textTransform: "none",
                    }}
                  >
                    View User
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<LockResetRounded />}
                    disabled={!access || anyMutationPending}
                    onClick={() => setResetOpen(true)}
                    sx={{
                      textTransform: "none",
                    }}
                  >
                    Reset Password
                  </Button>

                  <Button
                    size="small"
                    variant="outlined"
                    color={currentStatus === "active" ? "error" : "success"}
                    startIcon={
                      currentStatus === "active" ? (
                        <BlockRounded />
                      ) : (
                        <RestoreRounded />
                      )
                    }
                    disabled={
                      !access ||
                      anyMutationPending ||
                      currentStatus === "revoked"
                    }
                    onClick={() => setStatusOpen(true)}
                    sx={{
                      textTransform: "none",
                    }}
                  >
                    {currentStatus === "active"
                      ? "Deny Platform Access"
                      : "Restore Platform Access"}
                  </Button>

                  <Button
                    size="small"
                    variant="contained"
                    startIcon={
                      saveMutation.isPending ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <SaveRounded />
                      )
                    }
                    disabled={
                      !selectedUserId ||
                      !permissionsEditable ||
                      !hasUnsavedChanges ||
                      saveMutation.isPending
                    }
                    onClick={() => {
                      setSavedMessage(null);

                      saveMutation.mutate();
                    }}
                    sx={{
                      textTransform: "none",

                      fontWeight: 850,
                    }}
                  >
                    Save Access
                  </Button>
                </Stack>
              </Box>
            </>
          ) : null}
        </Paper>

        {saveMutation.isError ||
        createMutation.isError ||
        resetMutation.isError ||
        statusMutation.isError ? (
          <Alert
            severity="error"
            sx={{
              flexShrink: 0,

              py: 0.2,
            }}
          >
            {(() => {
              const mutationError =
                saveMutation.error ??
                createMutation.error ??
                resetMutation.error ??
                statusMutation.error;

              return mutationError instanceof Error
                ? mutationError.message
                : "Unable to update platform user";
            })()}
          </Alert>
        ) : null}

        {savedMessage ? (
          <Alert
            severity="success"
            sx={{
              flexShrink: 0,

              py: 0.2,
            }}
          >
            {savedMessage}
          </Alert>
        ) : null}

        {/* ==================================================
            FULL HEIGHT PERMISSION CONSOLE
            ================================================== */}

        <Box
          sx={{
            flex: 1,

            minWidth: 0,
            minHeight: 0,

            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",

              md: "155px minmax(0, 1fr)",
            },

            gap: 1,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              minHeight: 0,

              p: 0.65,

              borderRadius: 2,

              bgcolor: "rgba(15, 23, 42, 0.28)",

              overflowY: "auto",
            }}
          >
            <Stack spacing={0.3}>
              {permissionModules.map((module) => {
                const inheritedCount = moduleInheritedCount(module.key);

                const additionalCount = moduleAdditionalCount(module.key);

                return (
                  <Button
                    key={module.key}
                    fullWidth
                    onClick={() => setActiveModule(module.key)}
                    sx={{
                      minHeight: 36,

                      justifyContent: "space-between",

                      px: 1,

                      borderRadius: 1.4,

                      color:
                        activeModule === module.key
                          ? "common.white"
                          : "text.secondary",

                      bgcolor:
                        activeModule === module.key
                          ? "rgba(37, 99, 235, 0.18)"
                          : "transparent",

                      textTransform: "none",

                      fontSize: 10,

                      fontWeight: 760,
                    }}
                  >
                    <span>{module.label}</span>

                    {inheritedCount + additionalCount > 0 ? (
                      <Chip
                        size="small"
                        label={inheritedCount + additionalCount}
                        sx={{
                          height: 18,

                          "& .MuiChip-label": {
                            px: 0.6,

                            fontSize: 8,
                          },
                        }}
                      />
                    ) : null}
                  </Button>
                );
              })}
            </Stack>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              minWidth: 0,
              minHeight: 0,

              height: "100%",

              borderRadius: 2,

              bgcolor: "rgba(15, 23, 42, 0.28)",

              overflow: "hidden",

              display: "flex",

              flexDirection: "column",
            }}
          >
            {!selectedUserId ? (
              <Box
                sx={{
                  flex: 1,

                  minHeight: 0,

                  display: "grid",

                  placeItems: "center",

                  px: 3,
                }}
              >
                <Box
                  sx={{
                    maxWidth: 400,

                    textAlign: "center",
                  }}
                >
                  <PersonRounded
                    sx={{
                      fontSize: 38,

                      color: "text.disabled",
                    }}
                  />

                  <Typography
                    sx={{
                      mt: 1,

                      fontSize: 13,

                      fontWeight: 850,
                    }}
                  >
                    Select a platform user
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,

                      color: "text.secondary",

                      fontSize: 10,

                      lineHeight: 1.55,
                    }}
                  >
                    Search by name, email or role. Results are returned only
                    after you enter at least two characters.
                  </Typography>
                </Box>
              </Box>
            ) : accessQuery.isLoading ? (
              <Box
                sx={{
                  flex: 1,

                  display: "grid",

                  placeItems: "center",
                }}
              >
                <CircularProgress size={25} />
              </Box>
            ) : accessQuery.isError ? (
              <Alert severity="error">Unable to load this user's access.</Alert>
            ) : access ? (
              <>
                <Box
                  sx={{
                    flexShrink: 0,

                    px: 1.4,
                    py: 1,

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "space-between",

                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 12,

                        fontWeight: 900,
                      }}
                    >
                      {permissionModules.find(
                        (module) => module.key === activeModule,
                      )?.label ?? humanize(activeModule)}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.15,

                        color: "text.secondary",

                        fontSize: 8.6,
                      }}
                    >
                      {permissionsEditable
                        ? "Role permissions are locked. Tick additional access where required."
                        : "Platform access is suspended. Restore access before editing permissions."}
                    </Typography>
                  </Box>

                  <Stack
                    direction="row"
                    spacing={0.5}
                    useFlexGap
                    sx={{
                      flexWrap: "wrap",
                    }}
                  >
                    <Chip
                      size="small"
                      icon={<LockRounded />}
                      label="Role"
                      variant="outlined"
                    />

                    <Chip
                      size="small"
                      label="Additional"
                      color="primary"
                      variant="outlined"
                    />
                  </Stack>
                </Box>

                <Divider />

                <Box
                  sx={{
                    flex: 1,

                    minHeight: 0,

                    overflowY: "auto",

                    p: 0.9,
                  }}
                >
                  <Stack spacing={0.55}>
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

                            <Box
                              sx={{
                                minWidth: 0,
                              }}
                            >
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

                                  lineHeight: 1.4,
                                }}
                              >
                                {permission.description ?? permission.key}
                              </Typography>
                            </Box>

                            {inherited ? (
                              <Chip
                                size="small"
                                icon={<LockRounded />}
                                label="Role"
                                variant="outlined"
                              />
                            ) : additional ? (
                              <Chip
                                size="small"
                                label="Extra"
                                color="primary"
                                variant="outlined"
                              />
                            ) : null}
                          </Box>
                        </Paper>
                      );
                    })}

                    {activePermissions.length === 0 ? (
                      <Typography
                        sx={{
                          py: 5,

                          color: "text.secondary",

                          textAlign: "center",

                          fontSize: 10,
                        }}
                      >
                        No permissions in this section.
                      </Typography>
                    ) : null}
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
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reset Password</DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              mb: 1.5,

              color: "text.secondary",

              fontSize: 10,

              lineHeight: 1.5,
            }}
          >
            Set a temporary password for {selectedName}. Existing refresh
            sessions will be revoked and the user must change this password
            after signing in.
          </Typography>

          <TextField
            autoFocus
            label="Temporary password"
            type="password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
            helperText="Minimum 12 characters."
            fullWidth
          />
        </DialogContent>

        <DialogActions>
          <Button
            disabled={resetMutation.isPending}
            onClick={() => setResetOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            disabled={resetMutation.isPending || resetPassword.length < 12}
            onClick={() => resetMutation.mutate()}
          >
            {resetMutation.isPending ? "Resetting..." : "Reset Password"}
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
