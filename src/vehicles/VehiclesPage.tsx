import {
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
  ArchiveRounded,
  BuildRounded,
  DirectionsBusRounded,
  EditRounded,
  GpsFixedRounded,
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
  PaginationControls,
} from '../components/PaginationControls';

import {
  createVehicle,
  listVehicles,
  retireVehicle,
  updateVehicle,
  type CreateVehicleInput,
  type UpdateVehicleInput,
  type Vehicle,
  type VehicleStatus,
} from './vehicles.api';

import {
  VehicleFormDialog,
} from './VehicleFormDialog';

const DEFAULT_PAGE_SIZE = 10;

const EMPTY_VEHICLES: Vehicle[] = [];

type StatusFilter =
  | 'all'
  | VehicleStatus;

function statusLabel(
  status:
    VehicleStatus,
): string {
  switch (status) {
    case 'active':
      return 'Active';

    case 'maintenance':
      return 'Maintenance';

    case 'inactive':
      return 'Inactive';

    case 'retired':
      return 'Retired';
  }
}

function statusColor(
  status:
    VehicleStatus,
): string {
  switch (status) {
    case 'active':
      return '#5F9471';

    case 'maintenance':
      return '#C28A3D';

    case 'inactive':
      return '#85898F';

    case 'retired':
      return '#A65F5A';
  }
}

function vehicleName(
  vehicle:
    Vehicle,
): string {
  const description =
    [
      vehicle.make,
      vehicle.model,
    ]
      .filter(Boolean)
      .join(' ');

  return description ||
    'Vehicle';
}

function errorMessage(
  error: unknown,
): string {
  return error instanceof
    Error
    ? error.message
    : 'The operation could not be completed.';
}

export function VehiclesPage() {
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
      'all',
    );

  // Server-side pagination state.
  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    limit,
    setLimit,
  ] =
    useState(
      DEFAULT_PAGE_SIZE,
    );

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingVehicle,
    setEditingVehicle,
  ] =
    useState<
      Vehicle | null
    >(null);

  const [
    retireTarget,
    setRetireTarget,
  ] =
    useState<
      Vehicle | null
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

  const vehiclesQuery =
    useQuery({
      queryKey: [
        'vehicles',
        tenantId,
        search,
        status,
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

          return listVehicles(
            tenantId,
            {
              page,

              limit,

              search:
                search ||
                undefined,

              status:
                status ===
                  'all'
                  ? undefined
                  : status,
            },
          );
        },
    });

  async function refreshVehicleData():
    Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries(
        {
          queryKey: [
            'vehicles',
          ],
        },
      ),

      queryClient.invalidateQueries(
        {
          queryKey: [
            'fleet-summary',
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
            CreateVehicleInput,
        ) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return createVehicle(
            tenantId,
            input,
          );
        },

      onSuccess:
        async () => {
          await refreshVehicleData();

          setFormOpen(
            false,
          );

          setEditingVehicle(
            null,
          );

          setMutationError(
            null,
          );

          setSuccessMessage(
            'Vehicle added successfully.',
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
          vehicleId,
          input,
        }: {
          vehicleId: string;

          input:
          UpdateVehicleInput;
        }) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return updateVehicle(
            tenantId,
            vehicleId,
            input,
          );
        },

      onSuccess:
        async () => {
          await refreshVehicleData();

          setFormOpen(
            false,
          );

          setEditingVehicle(
            null,
          );

          setMutationError(
            null,
          );

          setSuccessMessage(
            'Vehicle updated successfully.',
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

  const retireMutation =
    useMutation({
      mutationFn:
        async (
          vehicleId:
            string,
        ) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return retireVehicle(
            tenantId,
            vehicleId,
          );
        },

      onSuccess:
        async () => {
          await refreshVehicleData();

          setRetireTarget(
            null,
          );

          setSuccessMessage(
            'Vehicle retired successfully.',
          );
        },
    });

  const vehicles =
    vehiclesQuery.data
      ?.items ??
    EMPTY_VEHICLES;

  const summary =
    useMemo(
      () => ({
        total:
          vehiclesQuery.data
            ?.total ??
          0,

        active:
          vehicles.filter(
            (vehicle) =>
              vehicle.status ===
              'active',
          ).length,

        maintenance:
          vehicles.filter(
            (vehicle) =>
              vehicle.status ===
              'maintenance',
          ).length,

        withGps:
          vehicles.filter(
            (vehicle) =>
              Boolean(
                vehicle.gpsDeviceId,
              ),
          ).length,
      }),
      [
        vehicles,
        vehiclesQuery.data
          ?.total,
      ],
    );

  function openCreate():
    void {
    setMutationError(
      null,
    );

    setEditingVehicle(
      null,
    );

    setFormOpen(
      true,
    );
  }

  function openEdit(
    vehicle:
      Vehicle,
  ): void {
    setMutationError(
      null,
    );

    setEditingVehicle(
      vehicle,
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

    setEditingVehicle(
      null,
    );
  }

  async function submitVehicle(
    input:
      | CreateVehicleInput
      | UpdateVehicleInput,
  ): Promise<void> {
    setMutationError(
      null,
    );

    if (
      editingVehicle
    ) {
      await updateMutation.mutateAsync(
        {
          vehicleId:
            editingVehicle.id,

          input:
            input as UpdateVehicleInput,
        },
      );

      return;
    }

    await createMutation.mutateAsync(
      input as CreateVehicleInput,
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
            xs: 'column',
            md: 'row',
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

              fontSize: 10,

              fontWeight:
                850,

              textTransform:
                'uppercase',

              letterSpacing:
                '0.14em',
            }}
          >
            Fleet Management
          </Typography>

          <Typography
            component="h1"
            sx={{
              mt: 0.7,

              fontSize: {
                xs: 30,
                md: 38,
              },

              fontWeight:
                900,

              letterSpacing:
                '-0.04em',
            }}
          >
            Vehicles
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
            Manage the tenant fleet and GPS assignments.
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
              <DirectionsBusRounded />
            }

            label={
              `${summary.total} vehicles`
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

            startIcon={
              <AddRounded />
            }

            onClick={
              openCreate
            }
          >
            Add vehicle
          </Button>
        </Box>
      </Box>

      {/* SUMMARY */}

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns: {
            xs: '1fr',

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
              'Total Fleet',

            value:
              summary.total,

            icon:
              <DirectionsBusRounded />,

            accent:
              '#C9A55C',
          },

          {
            label:
              'Active',

            value:
              summary.active,

            icon:
              <DirectionsBusRounded />,

            accent:
              '#5F9471',
          },

          {
            label:
              'Maintenance',

            value:
              summary.maintenance,

            icon:
              <BuildRounded />,

            accent:
              '#C28A3D',
          },

          {
            label:
              'GPS Equipped',

            value:
              summary.withGps,

            icon:
              <GpsFixedRounded />,

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

      {/* FILTERS */}

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
              xs: '1fr',

              md:
                'minmax(0, 1fr) 220px',
            },

            gap: 1.5,
          }}
        >
          <TextField
            value={search}

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

            label="Search vehicles"

            placeholder="Registration, fleet number, make or model"

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
              id="vehicle-status-label"
            >
              Status
            </InputLabel>

            <Select
              labelId="vehicle-status-label"

              label="Status"

              value={status}

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

              <MenuItem value="maintenance">
                Maintenance
              </MenuItem>

              <MenuItem value="inactive">
                Inactive
              </MenuItem>

              <MenuItem value="retired">
                Retired
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {vehiclesQuery.isLoading ? (
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

      {vehiclesQuery.isError ? (
        <Alert
          severity="error"
        >
          {errorMessage(
            vehiclesQuery.error,
          )}
        </Alert>
      ) : null}

      {!vehiclesQuery.isLoading &&
        !vehiclesQuery.isError &&
        vehicles.length ===
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
          <DirectionsBusRounded
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
            No vehicles found
          </Typography>
        </Paper>
      ) : null}

      {!vehiclesQuery.isLoading &&
        !vehiclesQuery.isError &&
        vehicles.length >
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
                xs: 'none',
                lg: 'grid',
              },

              gridTemplateColumns:
                '1.2fr .75fr 1fr .55fr .9fr .7fr 90px',

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
              'Vehicle',
              'Fleet No.',
              'Registration',
              'Seats',
              'GPS',
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

          {vehicles.map(
            (
              vehicle,
              index,
            ) => (
              <Box
                key={
                  vehicle.id
                }

                sx={{
                  px: 2.5,
                  py: 2,

                  display:
                    'grid',

                  gridTemplateColumns: {
                    xs: '1fr',

                    lg:
                      '1.2fr .75fr 1fr .55fr .9fr .7fr 90px',
                  },

                  alignItems:
                    'center',

                  gap: {
                    xs: 1.5,
                    lg: 2,
                  },

                  borderBottom:
                    index ===
                      vehicles.length -
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
                    <DirectionsBusRounded />
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize:
                          12.5,

                        fontWeight:
                          800,
                      }}
                    >
                      {vehicleName(
                        vehicle,
                      )}
                    </Typography>

                    <Typography
                      sx={{
                        color:
                          'text.secondary',

                        fontSize:
                          10.5,
                      }}
                    >
                      {vehicle.manufactureYear ??
                        'Year not set'}
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  sx={{
                    fontSize:
                      12,
                  }}
                >
                  {vehicle.fleetNumber ??
                    '—'}
                </Typography>

                <Typography
                  sx={{
                    fontSize:
                      12,

                    fontWeight:
                      750,
                  }}
                >
                  {
                    vehicle.registrationNumber
                  }
                </Typography>

                <Typography
                  sx={{
                    fontSize:
                      12,
                  }}
                >
                  {
                    vehicle.seatCapacity
                  }
                </Typography>

                <Box
                  sx={{
                    display:
                      'flex',

                    alignItems:
                      'center',

                    gap: 0.5,
                  }}
                >
                  <GpsFixedRounded
                    sx={{
                      fontSize:
                        15,

                      color:
                        vehicle.gpsDeviceId
                          ? '#5F9471'
                          : 'text.secondary',
                    }}
                  />

                  <Typography
                    noWrap
                    sx={{
                      fontSize:
                        11,
                    }}
                  >
                    {vehicle.gpsDeviceId ??
                      'Not assigned'}
                  </Typography>
                </Box>

                <Chip
                  size="small"

                  label={
                    statusLabel(
                      vehicle.status,
                    )
                  }

                  sx={{
                    color:
                      statusColor(
                        vehicle.status,
                      ),

                    bgcolor:
                      `${statusColor(
                        vehicle.status,
                      )}14`,

                    border:
                      '1px solid',

                    borderColor:
                      `${statusColor(
                        vehicle.status,
                      )}30`,
                  }}
                />

                <Box
                  sx={{
                    display:
                      'flex',
                  }}
                >
                  <Tooltip title="Edit vehicle">
                    <IconButton
                      size="small"

                      onClick={() =>
                        openEdit(
                          vehicle,
                        )
                      }
                    >
                      <EditRounded
                        fontSize="small"
                      />
                    </IconButton>
                  </Tooltip>

                  <Tooltip
                    title={
                      vehicle.status ===
                        'retired'
                        ? 'Already retired'
                        : 'Retire vehicle'
                    }
                  >
                    <span>
                      <IconButton
                        size="small"

                        disabled={
                          vehicle.status ===
                          'retired'
                        }

                        onClick={() =>
                          setRetireTarget(
                            vehicle,
                          )
                        }
                      >
                        <ArchiveRounded
                          fontSize="small"
                        />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            ),
          )}

          <PaginationControls
            page={
              vehiclesQuery.data
                ?.page ??
              page
            }

            limit={
              vehiclesQuery.data
                ?.limit ??
              limit
            }

            total={
              vehiclesQuery.data
                ?.total ??
              0
            }

            totalPages={
              vehiclesQuery.data
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

      {/* CREATE / EDIT */}

      <VehicleFormDialog
        key={`${formOpen ? 'open' : 'closed'}:${editingVehicle?.id ?? 'new'}`}

        open={
          formOpen
        }

        vehicle={
          editingVehicle
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
          submitVehicle
        }
      />

      {/* RETIRE CONFIRMATION */}

      <Dialog
        open={
          retireTarget !==
          null
        }

        onClose={() =>
          !retireMutation.isPending &&
          setRetireTarget(
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
          Retire vehicle?
        </DialogTitle>

        <DialogContent>
          {retireMutation.isError ? (
            <Alert
              severity="error"
              sx={{
                mb: 2,
              }}
            >
              {errorMessage(
                retireMutation.error,
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
            {retireTarget
              ? `${retireTarget.registrationNumber} will be retired and retained in historical records.`
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
              retireMutation.isPending
            }

            onClick={() =>
              setRetireTarget(
                null,
              )
            }
          >
            Cancel
          </Button>

          <Button
            variant="contained"

            disabled={
              retireMutation.isPending ||
              !retireTarget
            }

            onClick={() => {
              if (
                retireTarget
              ) {
                retireMutation.mutate(
                  retireTarget.id,
                );
              }
            }}
          >
            {retireMutation.isPending
              ? 'Retiring...'
              : 'Retire vehicle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SUCCESS FEEDBACK */}

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
