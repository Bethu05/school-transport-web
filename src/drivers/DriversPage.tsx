import {
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
  BadgeRounded,
  CalendarMonthRounded,
  EditRounded,
  EmailRounded,
  PersonOffRounded,
  PersonRounded,
  PhoneRounded,
  SearchRounded,
  ShieldRounded,
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
  createDriver,
  deactivateDriver,
  listDriversPage,
  updateDriver,
  type CreateDriverInput,
  type Driver,
  type DriverStatus,
  type UpdateDriverInput,
} from './drivers.api';

import {
  DriverFormDialog,
} from './DriverFormDialog';

const BUSINESS_TIME_ZONE =
  'Africa/Nairobi';

type StatusFilter =
  | 'all'
  | DriverStatus;

function statusLabel(
  status:
    DriverStatus,
): string {
  switch (status) {
    case 'active':
      return 'Active';

    case 'inactive':
      return 'Inactive';

    case 'suspended':
      return 'Suspended';
  }
}

function statusColor(
  status:
    DriverStatus,
): string {
  switch (status) {
    case 'active':
      return '#5F9471';

    case 'inactive':
      return '#85898F';

    case 'suspended':
      return '#C35E58';
  }
}

function maskLicenseNumber(
  value: string,
): string {
  if (
    value.length <=
    4
  ) {
    return value;
  }

  return `${'•'.repeat(
    Math.min(
      value.length - 4,
      8,
    ),
  )}${value.slice(
    -4,
  )}`;
}

function driverName(
  driver:
    Driver,
): string {
  return [
    driver.firstName,
    driver.lastName,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Format the driver licence expiry using
 * the transport platform's business timezone.
 */
function formatDate(
  value:
    | string
    | null,
): string {
  if (!value) {
    return 'Not set';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        BUSINESS_TIME_ZONE,

      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',
    },
  ).format(
    date,
  );
}

function licenceExpired(
  value:
    | string
    | null,
): boolean {
  if (!value) {
    return false;
  }

  const expiry =
    new Date(value);

  if (
    Number.isNaN(
      expiry.getTime(),
    )
  ) {
    return false;
  }

  return expiry.getTime() <
    Date.now();
}

function errorMessage(
  error: unknown,
): string {
  return error instanceof
    Error
    ? error.message
    : 'The operation could not be completed.';
}

export function DriversPage() {
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
    editingDriver,
    setEditingDriver,
  ] =
    useState<
      Driver | null
    >(null);

  const [
    deactivateTarget,
    setDeactivateTarget,
  ] =
    useState<
      Driver | null
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

  const driversQuery =
    useQuery({
      queryKey: [
        'drivers',
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

          return listDriversPage(
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
            },
          );
        },
    });

  const driverSummaryQuery =
    useQuery({
      queryKey: [
        'drivers-summary',
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
            suspended,
          ] =
            await Promise.all([
              listDriversPage(
                tenantId,
                {
                  page: 1,
                  limit: 1,
                },
              ),

              listDriversPage(
                tenantId,
                {
                  page: 1,
                  limit: 1,
                  status:
                    'active',
                },
              ),

              listDriversPage(
                tenantId,
                {
                  page: 1,
                  limit: 1,
                  status:
                    'inactive',
                },
              ),

              listDriversPage(
                tenantId,
                {
                  page: 1,
                  limit: 1,
                  status:
                    'suspended',
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

            suspended:
              suspended.total,
          };
        },
    });

  async function refreshDrivers():
    Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries(
        {
          queryKey: [
            'drivers',
          ],
        },
      ),

      queryClient.invalidateQueries(
        {
          queryKey: [
            'drivers-summary',
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
            CreateDriverInput,
        ) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return createDriver(
            tenantId,
            input,
          );
        },

      onSuccess:
        async () => {
          await refreshDrivers();

          setFormOpen(
            false,
          );

          setEditingDriver(
            null,
          );

          setMutationError(
            null,
          );

          setSuccessMessage(
            'Driver added successfully.',
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
          driverId,
          input,
        }: {
          driverId:
          string;

          input:
          UpdateDriverInput;
        }) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return updateDriver(
            tenantId,
            driverId,
            input,
          );
        },

      onSuccess:
        async () => {
          await refreshDrivers();

          setFormOpen(
            false,
          );

          setEditingDriver(
            null,
          );

          setMutationError(
            null,
          );

          setSuccessMessage(
            'Driver updated successfully.',
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
          driverId:
            string,
        ) => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return deactivateDriver(
            tenantId,
            driverId,
          );
        },

      onSuccess:
        async () => {
          await refreshDrivers();

          setDeactivateTarget(
            null,
          );

          setSuccessMessage(
            'Driver deactivated successfully.',
          );
        },
    });

  const drivers =
    driversQuery.data
      ?.items ??
    [];

  const summary =
    driverSummaryQuery.data ?? {
      total: 0,
      active: 0,
      inactive: 0,
      suspended: 0,
    };

  function openCreate():
    void {
    setMutationError(
      null,
    );

    setEditingDriver(
      null,
    );

    setFormOpen(
      true,
    );
  }

  function openEdit(
    driver:
      Driver,
  ): void {
    setMutationError(
      null,
    );

    setEditingDriver(
      driver,
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

    setEditingDriver(
      null,
    );

    setFormOpen(
      false,
    );
  }

  async function submitDriver(
    input:
      | CreateDriverInput
      | UpdateDriverInput,
  ): Promise<void> {
    setMutationError(
      null,
    );

    if (
      editingDriver
    ) {
      await updateMutation.mutateAsync(
        {
          driverId:
            editingDriver.id,

          input:
            input as UpdateDriverInput,
        },
      );

      return;
    }

    await createMutation.mutateAsync(
      input as CreateDriverInput,
    );
  }

  return (
    <Box>
      {/* HEADER */}

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
            Transport Operations
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
            Drivers
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
            Manage drivers, licence validity and operational status.
          </Typography>
        </Box>

        <Box
          sx={{
            display:
              'flex',

            alignItems:
              'center',

            gap: 1,

            flexWrap:
              'wrap',
          }}
        >
          <Chip
            icon={
              <BadgeRounded />
            }

            label={
              `${summary.total} drivers`
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
            Add driver
          </Button>
        </Box>
      </Box>

      {/* SUMMARY */}

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
              'Total Drivers',

            value:
              summary.total,

            icon:
              <BadgeRounded />,

            accent:
              '#C9A55C',
          },

          {
            label:
              'Active',

            value:
              summary.active,

            icon:
              <PersonRounded />,

            accent:
              '#5F9471',
          },

          {
            label:
              'Inactive',

            value:
              summary.inactive,

            icon:
              <PersonOffRounded />,

            accent:
              '#85898F',
          },

          {
            label:
              'Suspended',

            value:
              summary.suspended,

            icon:
              <ShieldRounded />,

            accent:
              '#C35E58',
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

                position:
                  'relative',

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

                      lineHeight:
                        1,

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
              xs:
                '1fr',

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

            label="Search drivers"

            placeholder="Name, email, phone or licence class"

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
              id="driver-status-label"
            >
              Status
            </InputLabel>

            <Select
              labelId="driver-status-label"

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

              <MenuItem value="inactive">
                Inactive
              </MenuItem>

              <MenuItem value="suspended">
                Suspended
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* LOADING */}

      {driversQuery.isLoading ? (
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

      {/* ERROR */}

      {driversQuery.isError ? (
        <Alert
          severity="error"
        >
          {errorMessage(
            driversQuery.error,
          )}
        </Alert>
      ) : null}

      {/* EMPTY */}

      {!driversQuery.isLoading &&
        !driversQuery.isError &&
        drivers.length ===
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
          <BadgeRounded
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
            No drivers found
          </Typography>
        </Paper>
      ) : null}

      {/* DRIVER TABLE */}

      {!driversQuery.isLoading &&
        !driversQuery.isError &&
        drivers.length >
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
                '1.25fr 1fr 1fr .7fr 1fr .75fr 90px',

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
              'Driver',
              'Contact',
              'Licence',
              'Class',
              'Expiry',
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

          {drivers.map(
            (
              driver,
              index,
            ) => {
              const expired =
                licenceExpired(
                  driver.licenseExpiryDate,
                );

              return (
                <Box
                  key={
                    driver.id
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
                        '1.25fr 1fr 1fr .7fr 1fr .75fr 90px',
                    },

                    alignItems:
                      'center',

                    gap: {
                      xs: 1.5,

                      lg: 2,
                    },

                    borderBottom:
                      index ===
                        drivers.length -
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
                      <PersonRounded />
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
                        {driverName(
                          driver,
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
                        {driver.schoolId
                          ? 'School assigned'
                          : 'Shared / unassigned'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display:
                        'grid',

                      gap: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        display:
                          'flex',

                        gap: 0.5,

                        alignItems:
                          'center',
                      }}
                    >
                      <EmailRounded
                        sx={{
                          fontSize:
                            14,

                          color:
                            'text.secondary',
                        }}
                      />

                      <Typography
                        noWrap

                        sx={{
                          fontSize:
                            10.5,

                          color:
                            'text.secondary',
                        }}
                      >
                        {driver.email ??
                          'No email'}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display:
                          'flex',

                        gap: 0.5,

                        alignItems:
                          'center',
                      }}
                    >
                      <PhoneRounded
                        sx={{
                          fontSize:
                            14,

                          color:
                            'text.secondary',
                        }}
                      />

                      <Typography
                        sx={{
                          fontSize:
                            10.5,

                          color:
                            'text.secondary',
                        }}
                      >
                        {driver.phone ??
                          'No phone'}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    sx={{
                      fontSize:
                        11.5,

                      fontFamily:
                        'monospace',

                      letterSpacing:
                        '0.04em',
                    }}
                  >
                    {maskLicenseNumber(
                      driver.licenseNumber,
                    )}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize:
                        12,

                      fontWeight:
                        700,
                    }}
                  >
                    {driver.licenseClass ??
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
                    <CalendarMonthRounded
                      sx={{
                        fontSize:
                          15,

                        color:
                          expired
                            ? '#C35E58'
                            : 'text.secondary',
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize:
                          11.5,

                        color:
                          expired
                            ? '#C35E58'
                            : 'text.primary',

                        fontWeight:
                          expired
                            ? 750
                            : 500,
                      }}
                    >
                      {formatDate(
                        driver.licenseExpiryDate,
                      )}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"

                    label={
                      statusLabel(
                        driver.status,
                      )
                    }

                    sx={{
                      color:
                        statusColor(
                          driver.status,
                        ),

                      bgcolor:
                        `${statusColor(
                          driver.status,
                        )}14`,

                      border:
                        '1px solid',

                      borderColor:
                        `${statusColor(
                          driver.status,
                        )}30`,
                    }}
                  />

                  <Box
                    sx={{
                      display:
                        'flex',
                    }}
                  >
                    <Tooltip title="Edit driver">
                      <IconButton
                        size="small"

                        onClick={() =>
                          openEdit(
                            driver,
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
                        driver.status ===
                          'inactive'
                          ? 'Already inactive'
                          : 'Deactivate driver'
                      }
                    >
                      <span>
                        <IconButton
                          size="small"

                          disabled={
                            driver.status ===
                            'inactive'
                          }

                          onClick={() =>
                            setDeactivateTarget(
                              driver,
                            )
                          }
                        >
                          <PersonOffRounded
                            fontSize="small"
                          />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Box>
              );
            },
          )}

          <PaginationControls
            page={
              driversQuery.data
                ?.page ??
              page
            }

            limit={
              driversQuery.data
                ?.limit ??
              limit
            }

            total={
              driversQuery.data
                ?.total ??
              0
            }

            totalPages={
              driversQuery.data
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

      <DriverFormDialog
        key={`${formOpen ? 'open' : 'closed'}:${editingDriver?.id ?? 'new'}`}

        open={
          formOpen
        }

        driver={
          editingDriver
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
          submitDriver
        }
      />

      {/* DEACTIVATE */}

      <Dialog
        open={
          deactivateTarget !==
          null
        }

        onClose={() => {
          if (
            !deactivateMutation.isPending
          ) {
            setDeactivateTarget(
              null,
            );
          }
        }}

        fullWidth

        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            fontWeight:
              850,
          }}
        >
          Deactivate driver?
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
              ? `${driverName(
                deactivateTarget,
              )} will become inactive but the driver record will remain available for historical transport records.`
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
              : 'Deactivate driver'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SUCCESS */}

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
