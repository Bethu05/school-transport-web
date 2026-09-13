import {
  useState,
} from 'react';

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
} from '@mui/material';

import {
  AddRounded,
  EditRounded,
  FamilyRestroomRounded,
  PersonAddAlt1Rounded,
  PersonOffRounded,
  SearchRounded,
} from '@mui/icons-material';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useAuth,
} from '../auth/AuthProvider';

import {
  FRONTEND_PERMISSIONS,
  hasFrontendPermission,
} from '../auth/frontend-permissions';

import {
  activateGuardian,
  createGuardian,
  deactivateGuardian,
  listGuardians,
  updateGuardian,
  type CreateGuardianInput,
  type Guardian,
  type GuardianStatus,
  type UpdateGuardianInput,
} from './guardians.api';

import {
  GuardianFormDialog,
} from './GuardianFormDialog';

const PAGE_SIZES = [
  10,
  25,
  50,
  100,
] as const;

function errorMessage(
  error: unknown,
): string {
  return error instanceof
    Error
    ? error.message
    : 'The Guardian operation failed.';
}

export function GuardiansPage() {
  const queryClient =
    useQueryClient();

  const {
    permissions,
    tenant,
  } = useAuth();

  const tenantId =
    tenant?.tenantId;
  const canRead =
    hasFrontendPermission(
      permissions,
      FRONTEND_PERMISSIONS.GUARDIANS_READ,
    );

  const canCreate =
    hasFrontendPermission(
      permissions,
      FRONTEND_PERMISSIONS.GUARDIANS_CREATE,
    );

  const canUpdate =
    hasFrontendPermission(
      permissions,
      FRONTEND_PERMISSIONS.GUARDIANS_UPDATE,
    );

  const canActivate =
    hasFrontendPermission(
      permissions,
      FRONTEND_PERMISSIONS.GUARDIANS_ACTIVATE,
    );

  const canDeactivate =
    hasFrontendPermission(
      permissions,
      FRONTEND_PERMISSIONS.GUARDIANS_DEACTIVATE,
    );

  const [
    page,
    setPage,
  ] =
    useState(
      1,
    );

  const [
    limit,
    setLimit,
  ] =
    useState(
      10,
    );

  const [
    searchDraft,
    setSearchDraft,
  ] =
    useState('');

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    status,
    setStatus,
  ] =
    useState<
      GuardianStatus | ''
    >('');

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(
      false,
    );

  const [
    editTarget,
    setEditTarget,
  ] =
    useState<
      Guardian | null
    >(null);

  const [
    deactivateTarget,
    setDeactivateTarget,
  ] =
    useState<
      Guardian | null
    >(null);

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(null);

  const guardiansQuery =
    useQuery({
      queryKey: [
        'guardians',
        tenantId,
        page,
        limit,
        search,
        status,
      ],

      enabled:
        Boolean(
          tenantId &&
          canRead,
        ),

      queryFn:
        () => {
          if (!tenantId) {
            throw new Error(
              'Tenant is unavailable',
            );
          }

          return listGuardians(
            tenantId,
            {
              page,
              limit,

              search:
                search ||
                undefined,

              status:
                status ||
                undefined,
            },
          );
        },
    });

  const saveMutation =
    useMutation({
      mutationFn:
        async (
          input:
            | CreateGuardianInput
            | UpdateGuardianInput,
        ) => {
          if (!tenantId) {
            throw new Error(
              'Tenant is unavailable',
            );
          }

          if (editTarget) {
            return updateGuardian(
              tenantId,
              editTarget.id,
              input as
                UpdateGuardianInput,
            );
          }

          return createGuardian(
            tenantId,
            input as
              CreateGuardianInput,
          );
        },

      onSuccess:
        async () => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                'guardians',
              ],
            },
          );

          setSuccessMessage(
            editTarget
              ? 'Guardian updated successfully.'
              : 'Guardian created successfully.',
          );

          setFormOpen(
            false,
          );

          setEditTarget(
            null,
          );
        },
    });

  const activateMutation =
    useMutation({
      mutationFn:
        async (
          guardian:
            Guardian,
        ) => {
          if (!tenantId) {
            throw new Error(
              'Tenant is unavailable',
            );
          }

          return activateGuardian(
            tenantId,
            guardian.id,
          );
        },

      onSuccess:
        async () => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                'guardians',
              ],
            },
          );

          setSuccessMessage(
            'Guardian reactivated successfully.',
          );
        },
    });

  const deactivateMutation =
    useMutation({
      mutationFn:
        async (
          guardian:
            Guardian,
        ) => {
          if (!tenantId) {
            throw new Error(
              'Tenant is unavailable',
            );
          }

          return deactivateGuardian(
            tenantId,
            guardian.id,
          );
        },

      onSuccess:
        async () => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                'guardians',
              ],
            },
          );

          setSuccessMessage(
            'Guardian deactivated successfully.',
          );

          setDeactivateTarget(
            null,
          );
        },
    });

  if (!canRead) {
    return (
      <Alert
        severity="warning"
      >
        You do not have permission to view Guardians for this tenant.
      </Alert>
    );
  }

  const data =
    guardiansQuery.data;

  const items =
    data?.items ??
    [];

  const totalPages =
    data?.totalPages ??
    0;

  return (
    <Box>
      <Box
        sx={{
          mb: 3,

          display:
            'flex',

          alignItems:
            'flex-start',

          justifyContent:
            'space-between',

          gap: 2,

          flexWrap:
            'wrap',
        }}
      >
        <Box>
          <Typography
            variant="h4"

            sx={{
              fontWeight:
                900,
            }}
          >
            Guardians
          </Typography>

          <Typography
            sx={{
              mt: 0.5,

              color:
                'text.secondary',
            }}
          >
            Manage parents and guardians connected to student transport.
          </Typography>
        </Box>

        <Box
          sx={{
            display:
              'flex',

            alignItems:
              'center',

            gap: 1.25,
          }}
        >
          {canCreate ? (
            <Button
              variant="contained"

              startIcon={
                <AddRounded />
              }

              onClick={() => {
                setEditTarget(
                  null,
                );

                setFormOpen(
                  true,
                );

                setSuccessMessage(
                  null,
                );
              }}
            >
              Add Guardian
            </Button>
          ) : null}

          <Box
            sx={{
              width: 48,

              height: 48,

              display:
                'grid',

              placeItems:
                'center',

              borderRadius:
                3,

              bgcolor:
                'primary.main',

              color:
                'primary.contrastText',
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

          onClose={() =>
            setSuccessMessage(
              null,
            )
          }
        >
          {successMessage}
        </Alert>
      ) : null}

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            sm:
              'minmax(220px, 1fr) 180px auto',
          },

          gap: 1.5,

          mb: 2,
        }}
      >
        <TextField
          value={
            searchDraft
          }

          placeholder="Search name, email or phone"

          onChange={(
            event,
          ) =>
            setSearchDraft(
              event.target.value,
            )
          }

          onKeyDown={(
            event,
          ) => {
            if (
              event.key ===
              'Enter'
            ) {
              setPage(
                1,
              );

              setSearch(
                searchDraft.trim(),
              );
            }
          }}
        />

        <TextField
          select

          label="Status"

          value={
            status
          }

          onChange={(
            event,
          ) => {
            setPage(
              1,
            );

            setStatus(
              event.target
                .value as
                | GuardianStatus
                | '',
            );
          }}
        >
          <MenuItem
            value=""
          >
            All
          </MenuItem>

          <MenuItem
            value="active"
          >
            Active
          </MenuItem>

          <MenuItem
            value="inactive"
          >
            Inactive
          </MenuItem>
        </TextField>

        <Button
          variant="contained"

          startIcon={
            <SearchRounded />
          }

          onClick={() => {
            setPage(
              1,
            );

            setSearch(
              searchDraft.trim(),
            );
          }}
        >
          Search
        </Button>
      </Box>

      <Paper
        sx={{
          overflow:
            'hidden',

          border:
            '1px solid',

          borderColor:
            'divider',
        }}
      >
        <Box
          sx={{
            display:
              'grid',

            gridTemplateColumns:
              '1.25fr 1.25fr .7fr 1fr 100px',

            gap: 2,

            px: 2.5,

            py: 1.5,

            bgcolor:
              'action.hover',

            borderBottom:
              '1px solid',

            borderColor:
              'divider',

            color:
              'text.secondary',

            fontSize:
              11,

            fontWeight:
              800,

            textTransform:
              'uppercase',

            letterSpacing:
              '.05em',
          }}
        >
          <Box>
            Guardian
          </Box>

          <Box>
            Contact
          </Box>

          <Box>
            Status
          </Box>

          <Box>
            Notifications
          </Box>

          <Box>
            Actions
          </Box>
        </Box>

        {guardiansQuery.isLoading ? (
          <Box
            sx={{
              p: 4,

              textAlign:
                'center',

              color:
                'text.secondary',
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
            {errorMessage(
              guardiansQuery.error,
            )}
          </Alert>
        ) : null}

        {!guardiansQuery.isLoading &&
        !guardiansQuery.isError &&
        items.length ===
          0 ? (
          <Box
            sx={{
              p: 4,

              textAlign:
                'center',

              color:
                'text.secondary',
            }}
          >
            No Guardians found.
          </Box>
        ) : null}

        {items.map(
          (guardian) => (
            <Box
              key={
                guardian.id
              }

              sx={{
                display:
                  'grid',

                gridTemplateColumns:
                  '1.25fr 1.25fr .7fr 1fr 100px',

                gap: 2,

                px: 2.5,

                py: 1.6,

                alignItems:
                  'center',

                borderBottom:
                  '1px solid',

                borderColor:
                  'divider',

                '&:last-of-type':
                  {
                    borderBottom:
                      'none',
                  },

                '&:hover':
                  {
                    bgcolor:
                      'action.hover',
                  },
              }}
            >
              <Box
                sx={{
                  display:
                    'flex',

                  alignItems:
                    'center',

                  gap: 1.4,

                  minWidth:
                    0,
                }}
              >
                <Avatar
                  sx={{
                    width: 38,

                    height: 38,

                    bgcolor:
                      'primary.main',

                    color:
                      'primary.contrastText',

                    fontSize:
                      12,

                    fontWeight:
                      800,
                  }}
                >
                  {guardian.firstName
                    .slice(
                      0,
                      1,
                    )
                    .toUpperCase()}

                  {guardian.lastName
                    .slice(
                      0,
                      1,
                    )
                    .toUpperCase()}
                </Avatar>

                <Typography
                  sx={{
                    fontWeight:
                      800,

                    fontSize:
                      13,
                  }}
                >
                  {guardian.firstName}{' '}
                  {guardian.lastName}
                </Typography>
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontSize:
                      12.5,
                  }}
                >
                  {guardian.email ??
                    'No email'}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.3,

                    color:
                      'text.secondary',

                    fontSize:
                      11.5,
                  }}
                >
                  {guardian.phone ??
                    'No phone'}
                </Typography>
              </Box>

              <Chip
                size="small"

                label={
                  guardian.status ===
                  'active'
                    ? 'Active'
                    : 'Inactive'
                }

                color={
                  guardian.status ===
                  'active'
                    ? 'success'
                    : 'default'
                }

                sx={{
                  width:
                    'fit-content',
                }}
              />

              <Box
                sx={{
                  display:
                    'flex',

                  flexWrap:
                    'wrap',

                  gap: 0.6,
                }}
              >
                {guardian.notifyBoarded ? (
                  <Chip
                    size="small"
                    label="Boarded"
                    variant="outlined"
                  />
                ) : null}

                {guardian.notifyDroppedOff ? (
                  <Chip
                    size="small"
                    label="Drop-off"
                    variant="outlined"
                  />
                ) : null}

                {guardian.notifyTripUpdates ? (
                  <Chip
                    size="small"
                    label="Trip updates"
                    variant="outlined"
                  />
                ) : null}
              </Box>

              <Box
                sx={{
                  display:
                    'flex',

                  gap: 0.5,
                }}
              >
                {canUpdate ? (
                  <Tooltip
                    title="Edit Guardian"
                  >
                    <IconButton
                      size="small"

                      onClick={() => {
                        setEditTarget(
                          guardian,
                        );

                        setFormOpen(
                          true,
                        );

                        setSuccessMessage(
                          null,
                        );
                      }}
                    >
                      <EditRounded
                        fontSize="small"
                      />
                    </IconButton>
                  </Tooltip>
                ) : null}

                {guardian.status ===
                'active' ? (
                  canDeactivate ? (
                    <Tooltip
                      title="Deactivate Guardian"
                    >
                      <IconButton
                        size="small"

                        onClick={() =>
                          setDeactivateTarget(
                            guardian,
                          )
                        }
                      >
                        <PersonOffRounded
                          fontSize="small"
                        />
                      </IconButton>
                    </Tooltip>
                  ) : null
                ) : canActivate ? (
                  <Tooltip
                    title="Reactivate Guardian"
                  >
                    <span>
                      <IconButton
                        size="small"

                        disabled={
                          activateMutation.isPending
                        }

                        onClick={() =>
                          activateMutation.mutate(
                            guardian,
                          )
                        }
                      >
                        <PersonAddAlt1Rounded
                          fontSize="small"
                        />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : null}
              </Box>
            </Box>
          ),
        )}
      </Paper>

      <Box
        sx={{
          mt: 2,

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'space-between',

          gap: 2,

          flexWrap:
            'wrap',
        }}
      >
        <Typography
          sx={{
            color:
              'text.secondary',

            fontSize:
              12,
          }}
        >
          {data
            ? `${data.total} guardian${data.total === 1 ? '' : 's'}`
            : ''}
        </Typography>

        <Box
          sx={{
            display:
              'flex',

            alignItems:
              'center',

            gap: 1,
          }}
        >
          <TextField
            select

            value={
              limit
            }

            onChange={(
              event,
            ) => {
              setLimit(
                Number(
                  event.target.value,
                ),
              );

              setPage(
                1,
              );
            }}

            sx={{
              width:
                90,
            }}
          >
            {PAGE_SIZES.map(
              (
                size,
              ) => (
                <MenuItem
                  key={
                    size
                  }

                  value={
                    size
                  }
                >
                  {size}
                </MenuItem>
              ),
            )}
          </TextField>

          <Button
            variant="outlined"

            disabled={
              page <=
              1
            }

            onClick={() =>
              setPage(
                (
                  current,
                ) =>
                  current -
                  1,
              )
            }
          >
            Previous
          </Button>

          <Typography
            sx={{
              minWidth:
                80,

              textAlign:
                'center',

              fontSize:
                12,

              fontWeight:
                700,
            }}
          >
            Page {page}
            {totalPages
              ? ` of ${totalPages}`
              : ''}
          </Typography>

          <Button
            variant="outlined"

            disabled={
              totalPages ===
                0 ||
              page >=
                totalPages
            }

            onClick={() =>
              setPage(
                (
                  current,
                ) =>
                  current +
                  1,
              )
            }
          >
            Next
          </Button>
        </Box>
      </Box>

      {formOpen ? (
        <GuardianFormDialog
          key={
            editTarget?.id ??
            'create-guardian'
          }

          open

          guardian={
            editTarget
          }

          submitting={
            saveMutation.isPending
          }

          error={
            saveMutation.isError
              ? errorMessage(
                  saveMutation.error,
                )
              : null
          }

          onClose={() => {
            if (
              !saveMutation.isPending
            ) {
              setFormOpen(
                false,
              );

              setEditTarget(
                null,
              );

              saveMutation.reset();
            }
          }}

          onSubmit={(
            input,
          ) =>
            saveMutation.mutate(
              input,
            )
          }
        />
      ) : null}

      <Dialog
        open={
          deactivateTarget !==
          null
        }

        onClose={
          deactivateMutation.isPending
            ? undefined
            : () =>
                setDeactivateTarget(
                  null,
                )
        }

        fullWidth

        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            fontWeight:
              850,
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
              {errorMessage(
                deactivateMutation.error,
              )}
            </Alert>
          ) : null}

          <Typography
            sx={{
              color:
                'text.secondary',

              fontSize:
                13,

              lineHeight:
                1.7,
            }}
          >
            {deactivateTarget
              ? `${deactivateTarget.firstName} ${deactivateTarget.lastName} will become inactive. Historical student and transport relationships are preserved.`
              : ''}
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,

            pb: 3,
          }}
        >
          <Button
            disabled={
              deactivateMutation.isPending
            }

            onClick={() =>
              setDeactivateTarget(
                null,
              )
            }
          >
            Cancel
          </Button>

          <Button
            color="error"

            variant="contained"

            disabled={
              deactivateMutation.isPending ||
              !deactivateTarget
            }

            onClick={() => {
              if (
                deactivateTarget
              ) {
                deactivateMutation.mutate(
                  deactivateTarget,
                );
              }
            }}
          >
            {deactivateMutation.isPending
              ? 'Deactivating...'
              : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
