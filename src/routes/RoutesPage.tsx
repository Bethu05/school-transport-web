import {
  useCallback,
  useMemo,
  useState,
} from 'react';

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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  AddRounded,
  AltRouteRounded,
  ArchiveRounded,
  EditRounded,
  FormatListNumberedRounded,
  NorthRounded,
  SearchRounded,
  SouthRounded,
  ToggleOnRounded,
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
  PaginationControls,
} from '../components/PaginationControls';

import {
  listSchools,
  type School,
} from '../schools/schools.api';

import {
  activateRoute,
  createRoute,
  deactivateRoute,
  listRoutesPage,
  updateRoute,
  type CreateRouteInput,
  type Route,
  type RouteStatus,
  type RouteType,
  type UpdateRouteInput,
} from './routes.api';

import {
  RouteFormDialog,
} from './RouteFormDialog';

import {
  RouteStopsDialog,
} from './RouteStopsDialog';

const EMPTY_ROUTES:
  Route[] = [];

const EMPTY_SCHOOLS:
  School[] = [];

type StatusFilter =
  | 'all'
  | RouteStatus;

type TypeFilter =
  | 'all'
  | RouteType;

function routeTypeLabel(
  routeType:
    RouteType,
): string {
  switch (routeType) {
    case 'pickup':
      return 'Pickup';

    case 'dropoff':
      return 'Drop-off';

    case 'other':
      return 'Other';
  }
}

function routeTypeIcon(
  routeType:
    RouteType,
) {
  switch (routeType) {
    case 'pickup':
      return <NorthRounded />;

    case 'dropoff':
      return <SouthRounded />;

    case 'other':
      return <AltRouteRounded />;
  }
}

function statusLabel(
  status:
    RouteStatus,
): string {
  switch (status) {
    case 'active':
      return 'Active';

    case 'inactive':
      return 'Inactive';
  }
}

function statusColor(
  status:
    RouteStatus,
): string {
  switch (status) {
    case 'active':
      return '#5F9471';

    case 'inactive':
      return '#85898F';
  }
}

function errorMessage(
  error: unknown,
): string {
  return error instanceof
    Error
    ? error.message
    : 'The operation could not be completed.';
}

export function RoutesPage() {
  const {
    tenant,
  } = useAuth();

  const queryClient =
    useQueryClient();

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    status,
    setStatus,
  ] =
    useState<StatusFilter>(
      'active',
    );

  const [
    routeType,
    setRouteType,
  ] =
    useState<TypeFilter>(
      'all',
    );

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    limit,
    setLimit,
  ] =
    useState(10);

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingRoute,
    setEditingRoute,
  ] =
    useState<
      Route | null
    >(null);

  const [
    deactivateTarget,
    setDeactivateTarget,
  ] =
    useState<
      Route | null
    >(null);

  const [
    stopsRoute,
    setStopsRoute,
  ] =
    useState<
      Route | null
    >(null);

  const [
    mutationError,
    setMutationError,
  ] =
    useState<
      string | null
    >(null);

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(null);

  const tenantId =
    tenant?.tenantId;

  const routesQuery =
    useQuery({
      queryKey: [
        'routes',
        tenantId,
        search,
        status,
        routeType,
        page,
        limit,
      ],

      enabled:
        Boolean(
          tenantId,
        ),

      queryFn:
        async () => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return listRoutesPage(
            tenantId,
            {
              page,

              limit,

              search:
                search.trim() ||
                undefined,

              status:
                status ===
                  'all'
                  ? undefined
                  : status,

              routeType:
                routeType ===
                  'all'
                  ? undefined
                  : routeType,
            },
          );
        },
    });

  const routeSummaryQuery =
    useQuery({
      queryKey: [
        'routes-summary',
        tenantId,
      ],

      enabled:
        Boolean(
          tenantId,
        ),

      queryFn:
        async () => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          const [
            all,
            active,
            inactive,
            pickup,
          ] =
            await Promise.all([
              listRoutesPage(
                tenantId,
                {
                  page: 1,
                  limit: 1,
                },
              ),

              listRoutesPage(
                tenantId,
                {
                  page: 1,
                  limit: 1,
                  status:
                    'active',
                },
              ),

              listRoutesPage(
                tenantId,
                {
                  page: 1,
                  limit: 1,
                  status:
                    'inactive',
                },
              ),

              listRoutesPage(
                tenantId,
                {
                  page: 1,
                  limit: 1,
                  routeType:
                    'pickup',
                },
              ),
            ]);

          return {
            total:
              all.total,

            active:
              active.total,

            inactive:
              inactive.total,

            pickup:
              pickup.total,
          };
        },
    });

  const schoolsQuery =
    useQuery({
      queryKey: [
        'schools',
        tenantId,
      ],

      enabled:
        Boolean(
          tenantId,
        ),

      queryFn:
        async () => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return listSchools(
            tenantId,
          );
        },
    });

  async function refreshRoutes():
    Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries(
        {
          queryKey: [
            'routes',
          ],
        },
      ),

      queryClient.invalidateQueries(
        {
          queryKey: [
            'routes-summary',
          ],
        },
      ),
    ]);
  }

  const createMutation =
    useMutation({
      mutationFn:
        async (
          input:
            CreateRouteInput,
        ) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return createRoute(
            tenantId,
            input,
          );
        },

      onSuccess:
        async () => {
          await refreshRoutes();

          setFormOpen(
            false,
          );

          setEditingRoute(
            null,
          );

          setMutationError(
            null,
          );

          setSuccessMessage(
            'Route added successfully.',
          );
        },

      onError:
        (error) => {
          setMutationError(
            errorMessage(
              error,
            ),
          );
        },
    });

  const updateMutation =
    useMutation({
      mutationFn:
        async ({
          routeId,
          input,
        }: {
          routeId:
          string;

          input:
          UpdateRouteInput;
        }) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return updateRoute(
            tenantId,
            routeId,
            input,
          );
        },

      onSuccess:
        async () => {
          await refreshRoutes();

          setFormOpen(
            false,
          );

          setEditingRoute(
            null,
          );

          setMutationError(
            null,
          );

          setSuccessMessage(
            'Route updated successfully.',
          );
        },

      onError:
        (error) => {
          setMutationError(
            errorMessage(
              error,
            ),
          );
        },
    });

  const deactivateMutation =
    useMutation({
      mutationFn:
        async (
          routeId:
            string,
        ) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return deactivateRoute(
            tenantId,
            routeId,
          );
        },

      onSuccess:
        async () => {
          await refreshRoutes();

          setDeactivateTarget(
            null,
          );

          setSuccessMessage(
            'Route deactivated successfully.',
          );
        },
    });

  const activateMutation =
    useMutation({
      mutationFn:
        async (
          routeId:
            string,
        ) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return activateRoute(
            tenantId,
            routeId,
          );
        },

      onSuccess:
        async () => {
          await refreshRoutes();

          setSuccessMessage(
            'Route activated successfully.',
          );
        },
    });

  const routes =
    routesQuery.data
      ?.items ??
    EMPTY_ROUTES;

  const schools =
    schoolsQuery.data ??
    EMPTY_SCHOOLS;

  const schoolById =
    useMemo(
      () =>
        new Map(
          schools.map(
            (school) => [
              school.id,
              school,
            ],
          ),
        ),
      [
        schools,
      ],
    );

  const schoolName =
    useCallback(
      (
        schoolId:
          string,
      ): string =>
        schoolById.get(
          schoolId,
        )?.name ??
        'School unavailable',
      [
        schoolById,
      ],
    );

  const filteredRoutes =
    routes;

  const summary =
    routeSummaryQuery.data ?? {
      total: 0,
      active: 0,
      inactive: 0,
      pickup: 0,
    };

  function openCreate():
    void {
    setMutationError(
      null,
    );

    setEditingRoute(
      null,
    );

    setFormOpen(
      true,
    );
  }

  function openEdit(
    route:
      Route,
  ): void {
    setMutationError(
      null,
    );

    setEditingRoute(
      route,
    );

    setFormOpen(
      true,
    );
  }

  function closeForm():
    void {
    if (
      createMutation.isPending ||
      updateMutation.isPending
    ) {
      return;
    }

    setMutationError(
      null,
    );

    setFormOpen(
      false,
    );

    setEditingRoute(
      null,
    );
  }

  async function submitRoute(
    input:
      | CreateRouteInput
      | UpdateRouteInput,
  ): Promise<void> {
    setMutationError(
      null,
    );

    if (editingRoute) {
      await updateMutation.mutateAsync(
        {
          routeId:
            editingRoute.id,

          input:
            input as UpdateRouteInput,
        },
      );

      return;
    }

    await createMutation.mutateAsync(
      input as CreateRouteInput,
    );
  }

  return (
    <Box>
      {/* ================================================
          PAGE HEADER
          ================================================ */}

      <Box
        sx={{
          mb: 3,

          display:
            'flex',

          flexDirection: {
            xs:
              'column',

            md:
              'row',
          },

          alignItems: {
            xs:
              'flex-start',

            md:
              'flex-end',
          },

          justifyContent:
            'space-between',

          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color:
                'primary.dark',

              fontSize:
                10,

              fontWeight:
                850,

              textTransform:
                'uppercase',

              letterSpacing:
                '0.14em',
            }}
          >
            Route Planning
          </Typography>

          <Typography
            component="h1"

            sx={{
              mt: 0.7,

              fontSize: {
                xs:
                  30,

                md:
                  38,
              },

              fontWeight:
                900,

              letterSpacing:
                '-0.04em',
            }}
          >
            Routes
          </Typography>

          <Typography
            sx={{
              mt: 0.7,

              color:
                'text.secondary',

              fontSize:
                13,
            }}
          >
            Manage reusable route templates before they become dated trips.
          </Typography>
        </Box>

        <Box
          sx={{
            display:
              'flex',

            gap: 1,

            alignItems:
              'center',

            flexWrap:
              'wrap',
          }}
        >
          <Chip
            icon={
              <AltRouteRounded />
            }

            label={
              `${summary.total} routes`
            }

            sx={{
              color:
                'primary.main',

              bgcolor:
                'rgba(201,165,92,0.10)',

              border:
                '1px solid',

              borderColor:
                'rgba(201,165,92,0.22)',
            }}
          />

          <Button
            variant="contained"

            disabled={
              schoolsQuery.isLoading ||
              schoolsQuery.isError ||
              schools.length ===
              0
            }

            startIcon={
              <AddRounded />
            }

            onClick={
              openCreate
            }
          >
            Add route
          </Button>
        </Box>
      </Box>

      {/* ================================================
          SUMMARY
          ================================================ */}

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            sm:
              'repeat(2, minmax(0, 1fr))',

            xl:
              'repeat(4, minmax(0, 1fr))',
          },

          gap: 2,

          mb: 2,
        }}
      >
        {[
          {
            label:
              'Total Routes',

            value:
              summary.total,

            icon:
              <AltRouteRounded />,

            accent:
              '#C9A55C',
          },

          {
            label:
              'Active',

            value:
              summary.active,

            icon:
              <ToggleOnRounded />,

            accent:
              '#5F9471',
          },

          {
            label:
              'Inactive',

            value:
              summary.inactive,

            icon:
              <ArchiveRounded />,

            accent:
              '#85898F',
          },

          {
            label:
              'Pickup Routes',

            value:
              summary.pickup,

            icon:
              <NorthRounded />,

            accent:
              '#98805A',
          },
        ].map(
          (item) => (
            <Paper
              key={
                item.label
              }

              elevation={0}

              sx={{
                p: 2.5,

                border:
                  '1px solid',

                borderColor:
                  'divider',

                position:
                  'relative',

                overflow:
                  'hidden',
              }}
            >
              <Box
                sx={{
                  position:
                    'absolute',

                  top: 0,

                  left: 0,

                  width:
                    '100%',

                  height: 3,

                  background:
                    `linear-gradient(
                      90deg,
                      ${item.accent},
                      transparent 75%
                    )`,
                }}
              />

              <Box
                sx={{
                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'space-between',
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      color:
                        'text.secondary',

                      fontSize:
                        10.5,

                      fontWeight:
                        800,

                      textTransform:
                        'uppercase',

                      letterSpacing:
                        '0.09em',
                    }}
                  >
                    {item.label}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,

                      fontSize:
                        30,

                      lineHeight: 1,

                      fontWeight:
                        900,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: 42,

                    height: 42,

                    display:
                      'grid',

                    placeItems:
                      'center',

                    borderRadius:
                      2,

                    color:
                      item.accent,

                    bgcolor:
                      `${item.accent}15`,
                  }}
                >
                  {item.icon}
                </Box>
              </Box>
            </Paper>
          ),
        )}
      </Box>

      {/* ================================================
          FILTERS
          ================================================ */}

      <Paper
        elevation={0}

        sx={{
          p: 2,

          mb: 2,

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

            gridTemplateColumns: {
              xs:
                '1fr',

              lg:
                'minmax(0, 1fr) 190px 190px',
            },

            gap: 1.5,
          }}
        >
          <TextField
            value={
              search
            }

            onChange={
              (event) => {
                setSearch(
                  event.target
                    .value,
                );

                setPage(
                  1,
                );
              }
            }

            label="Search routes"

            placeholder="Name or code"

            slotProps={{
              input: {
                startAdornment:
                  (
                    <SearchRounded
                      sx={{
                        mr: 1,

                        color:
                          'text.secondary',

                        fontSize:
                          20,
                      }}
                    />
                  ),
              },
            }}
          />

          <FormControl>
            <InputLabel
              id="route-type-label"
            >
              Type
            </InputLabel>

            <Select
              labelId="route-type-label"

              label="Type"

              value={
                routeType
              }

              onChange={
                (event) => {
                  setRouteType(
                    event.target
                      .value as TypeFilter,
                  );

                  setPage(
                    1,
                  );
                }
              }
            >
              <MenuItem value="all">
                All types
              </MenuItem>

              <MenuItem value="pickup">
                Pickup
              </MenuItem>

              <MenuItem value="dropoff">
                Drop-off
              </MenuItem>

              <MenuItem value="other">
                Other
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel
              id="route-status-label"
            >
              Status
            </InputLabel>

            <Select
              labelId="route-status-label"

              label="Status"

              value={
                status
              }

              onChange={
                (event) => {
                  setStatus(
                    event.target
                      .value as StatusFilter,
                  );

                  setPage(
                    1,
                  );
                }
              }
            >
              <MenuItem value="all">
                All statuses
              </MenuItem>

              <MenuItem value="active">
                Active
              </MenuItem>

              <MenuItem value="inactive">
                Inactive
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {schoolsQuery.isError ? (
        <Alert
          severity="warning"

          sx={{
            mb: 2,
          }}
        >
          Schools could not be loaded. Existing routes can still be viewed,
          but a new route cannot be created until the school list is available.
        </Alert>
      ) : null}

      {!schoolsQuery.isLoading &&
        !schoolsQuery.isError &&
        schools.length ===
        0 ? (
        <Alert
          severity="info"

          sx={{
            mb: 2,
          }}
        >
          No active schools are available. Add or activate a school before
          creating a route.
        </Alert>
      ) : null}

      {/* ================================================
          QUERY STATES
          ================================================ */}

      {routesQuery.isLoading ? (
        <Paper
          elevation={0}

          sx={{
            py: 8,

            display:
              'grid',

            placeItems:
              'center',

            border:
              '1px solid',

            borderColor:
              'divider',
          }}
        >
          <CircularProgress
            size={32}
          />
        </Paper>
      ) : null}

      {routesQuery.isError ? (
        <Alert
          severity="error"
        >
          {errorMessage(
            routesQuery.error,
          )}
        </Alert>
      ) : null}

      {!routesQuery.isLoading &&
        !routesQuery.isError &&
        filteredRoutes.length ===
        0 ? (
        <Paper
          elevation={0}

          sx={{
            py: 8,

            px: 3,

            textAlign:
              'center',

            border:
              '1px solid',

            borderColor:
              'divider',
          }}
        >
          <AltRouteRounded
            sx={{
              fontSize:
                42,

              color:
                'primary.main',
            }}
          />

          <Typography
            sx={{
              mt: 2,

              fontWeight:
                800,
            }}
          >
            No routes found
          </Typography>
        </Paper>
      ) : null}

      {/* ================================================
          ROUTE LIST
          ================================================ */}

      {!routesQuery.isLoading &&
        !routesQuery.isError &&
        filteredRoutes.length >
        0 ? (
        <Paper
          elevation={0}

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
              px: 2.5,

              py: 1.5,

              display: {
                xs:
                  'none',

                lg:
                  'grid',
              },

              gridTemplateColumns:
                '1.3fr .85fr .8fr .65fr .7fr 150px',

              gap: 2,

              bgcolor:
                'action.hover',

              borderBottom:
                '1px solid',

              borderColor:
                'divider',
            }}
          >
            {[
              'Route',
              'Code',
              'Type',
              'Stops',
              'Status',
              'Actions',
            ].map(
              (heading) => (
                <Typography
                  key={
                    heading
                  }

                  sx={{
                    color:
                      'text.secondary',

                    fontSize:
                      10,

                    fontWeight:
                      800,

                    textTransform:
                      'uppercase',

                    letterSpacing:
                      '0.08em',
                  }}
                >
                  {heading}
                </Typography>
              ),
            )}
          </Box>

          {filteredRoutes.map(
            (
              route,
              index,
            ) => (
              <Box
                key={
                  route.id
                }

                sx={{
                  px: 2.5,

                  py: 2,

                  display:
                    'grid',

                  gridTemplateColumns: {
                    xs:
                      '1fr',

                    lg:
                      '1.3fr .85fr .8fr .65fr .7fr 150px',
                  },

                  alignItems:
                    'center',

                  gap: {
                    xs:
                      1.5,

                    lg:
                      2,
                  },

                  borderBottom:
                    index ===
                      filteredRoutes.length -
                      1
                      ? 'none'
                      : '1px solid',

                  borderColor:
                    'divider',

                  '&:hover': {
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

                    gap: 1.3,
                  }}
                >
                  <Box
                    sx={{
                      width: 38,

                      height: 38,

                      display:
                        'grid',

                      placeItems:
                        'center',

                      borderRadius:
                        2,

                      bgcolor:
                        'rgba(201,165,92,0.10)',

                      color:
                        'primary.main',
                    }}
                  >
                    <AltRouteRounded />
                  </Box>

                  <Box
                    sx={{
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      noWrap

                      sx={{
                        fontSize:
                          12.5,

                        fontWeight:
                          800,
                      }}
                    >
                      {route.name}
                    </Typography>

                    <Typography
                      noWrap

                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          10.5,
                      }}
                    >
                      {schoolName(
                        route.schoolId,
                      )}
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  sx={{
                    fontSize:
                      12,

                    fontWeight:
                      750,
                  }}
                >
                  {route.code ??
                    '—'}
                </Typography>

                <Box
                  sx={{
                    display:
                      'flex',

                    alignItems:
                      'center',

                    gap: 0.6,
                  }}
                >
                  {routeTypeIcon(
                    route.routeType,
                  )}

                  <Typography
                    sx={{
                      fontSize:
                        12,
                    }}
                  >
                    {routeTypeLabel(
                      route.routeType,
                    )}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize:
                      12,

                    fontWeight:
                      750,
                  }}
                >
                  {route.stopCount}
                </Typography>

                <Chip
                  size="small"

                  label={
                    statusLabel(
                      route.status,
                    )
                  }

                  sx={{
                    color:
                      statusColor(
                        route.status,
                      ),

                    bgcolor:
                      `${statusColor(
                        route.status,
                      )}14`,

                    border:
                      '1px solid',

                    borderColor:
                      `${statusColor(
                        route.status,
                      )}30`,
                  }}
                />

                <Box
                  sx={{
                    display:
                      'flex',
                  }}
                >
                  <Tooltip title="Manage route stops">
                    <IconButton
                      size="small"

                      onClick={() =>
                        setStopsRoute(
                          route,
                        )
                      }
                    >
                      <FormatListNumberedRounded
                        fontSize="small"
                      />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Edit route">
                    <IconButton
                      size="small"

                      onClick={() =>
                        openEdit(
                          route,
                        )
                      }
                    >
                      <EditRounded
                        fontSize="small"
                      />
                    </IconButton>
                  </Tooltip>

                  {route.status ===
                    'active' ? (
                    <Tooltip title="Deactivate route">
                      <IconButton
                        size="small"

                        onClick={() =>
                          setDeactivateTarget(
                            route,
                          )
                        }
                      >
                        <ArchiveRounded
                          fontSize="small"
                        />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Activate route">
                      <span>
                        <IconButton
                          size="small"

                          disabled={
                            activateMutation.isPending
                          }

                          onClick={() =>
                            activateMutation.mutate(
                              route.id,
                            )
                          }
                        >
                          <ToggleOnRounded
                            fontSize="small"
                          />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            ),
          )}

          <PaginationControls
            page={
              routesQuery.data
                ?.page ??
              page
            }

            limit={
              routesQuery.data
                ?.limit ??
              limit
            }

            total={
              routesQuery.data
                ?.total ??
              0
            }

            totalPages={
              routesQuery.data
                ?.totalPages ??
              0
            }

            onPageChange={
              setPage
            }

            onLimitChange={(
              nextLimit,
            ) => {
              setLimit(
                nextLimit,
              );

              setPage(
                1,
              );
            }}
          />
        </Paper>
      ) : null}

      {/* ================================================
          CREATE / EDIT
          ================================================ */}

      <RouteFormDialog
        key={`${formOpen ? 'open' : 'closed'}:${editingRoute?.id ?? 'new'}`}

        open={
          formOpen
        }

        route={
          editingRoute
        }

        schools={
          schools
        }

        schoolsLoading={
          schoolsQuery.isLoading
        }

        schoolsError={
          schoolsQuery.isError
            ? errorMessage(
              schoolsQuery.error,
            )
            : null
        }

        saving={
          createMutation.isPending ||
          updateMutation.isPending
        }

        error={
          mutationError
        }

        onClose={
          closeForm
        }

        onSubmit={
          submitRoute
        }
      />

      <RouteStopsDialog
        open={
          stopsRoute !==
          null
        }

        tenantId={
          tenantId
        }

        route={
          stopsRoute
        }

        onClose={() =>
          setStopsRoute(
            null,
          )
        }
      />

      {/* ================================================
          DEACTIVATE CONFIRMATION
          ================================================ */}

      <Dialog
        open={
          deactivateTarget !==
          null
        }

        onClose={() =>
          !deactivateMutation.isPending &&
          setDeactivateTarget(
            null,
          )
        }

        maxWidth="xs"

        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight:
              850,
          }}
        >
          Deactivate route?
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
              ? `${deactivateTarget.name} will become inactive. Existing trip history remains unchanged.`
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
                  deactivateTarget.id,
                );
              }
            }}
          >
            {deactivateMutation.isPending
              ? 'Deactivating...'
              : 'Deactivate route'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ================================================
          SUCCESS FEEDBACK
          ================================================ */}

      <Snackbar
        open={
          successMessage !==
          null
        }

        autoHideDuration={
          3500
        }

        onClose={() =>
          setSuccessMessage(
            null,
          )
        }

        anchorOrigin={{
          vertical:
            'bottom',

          horizontal:
            'right',
        }}
      >
        <Alert
          severity="success"

          variant="filled"

          onClose={() =>
            setSuccessMessage(
              null,
            )
          }
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
