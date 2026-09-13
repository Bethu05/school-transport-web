import {
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';

import {
  LocationOnRounded,
  MapRounded,
  RadarRounded,
  SearchRounded,
  ShareLocationRounded,
} from '@mui/icons-material';

import {
  useQuery,
} from '@tanstack/react-query';

import {
  useAuth,
} from '../auth/AuthProvider';

import {
  PaginationControls,
} from '../components/PaginationControls';

import {
  useDebouncedValue,
} from '../hooks/useDebouncedValue';

import {
  listSchools,
  type School,
} from '../schools/schools.api';

import {
  listStopsPage,
  type Stop,
  type StopStatus,
} from './stops.api';

const EMPTY_STOPS: Stop[] = [];
const EMPTY_SCHOOLS: School[] = [];

type StatusFilter =
  | 'all'
  | StopStatus;

function statusLabel(
  status: Stop['status'],
): string {
  return status === 'active'
    ? 'Active'
    : status === 'inactive'
      ? 'Inactive'
      : String(status);
}

function statusColor(
  status: Stop['status'],
): string {
  return status === 'active'
    ? '#5F9471'
    : '#85898F';
}

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : 'The operation could not be completed.';
}

function coordinateLabel(
  stop: Stop,
): string {
  return `${stop.latitude.toFixed(5)}, ${stop.longitude.toFixed(5)}`;
}

export function StopsPage() {
  const {
    tenant,
  } = useAuth();

  const tenantId =
    tenant?.tenantId;

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    status,
    setStatus,
  ] = useState<StatusFilter>(
    'active',
  );

  const [
    schoolId,
    setSchoolId,
  ] = useState('all');

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    limit,
    setLimit,
  ] = useState(10);

  const debouncedSearch =
    useDebouncedValue(
      search,
      300,
    );

  const stopsQuery =
    useQuery({
      queryKey: [
        'stops-page',
        tenantId,
        debouncedSearch,
        status,
        schoolId,
        page,
        limit,
      ],

      enabled:
        Boolean(tenantId),

      queryFn:
        async () => {
          if (!tenantId) {
            throw new Error(
              'No active tenant',
            );
          }

          return listStopsPage(
            tenantId,
            {
              page,
              limit,
              search:
                debouncedSearch ||
                undefined,
              status:
                status === 'all'
                  ? undefined
                  : status,
              schoolId:
                schoolId === 'all'
                  ? undefined
                  : schoolId,
            },
          );
        },
    });

  const schoolsQuery =
    useQuery({
      queryKey: [
        'schools',
        tenantId,
      ],

      enabled:
        Boolean(tenantId),

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

  const stops =
    stopsQuery.data
      ?.items ??
    EMPTY_STOPS;

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
      [schools],
    );

  const summary =
    useMemo(
      () => ({
        total:
          stopsQuery.data
            ?.total ??
          0,
        shown:
          stops.length,
        shared:
          stops.filter(
            (stop) =>
              stop.schoolId === null,
          ).length,
        schoolSpecific:
          stops.filter(
            (stop) =>
              stop.schoolId !== null,
          ).length,
      }),
      [
        stops,
        stopsQuery.data?.total,
      ],
    );

  return (
    <Box>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: {
            xs: 'column',
            md: 'row',
          },
          alignItems: {
            xs: 'flex-start',
            md: 'flex-end',
          },
          justifyContent:
            'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: 'primary.dark',
              fontSize: 10,
              fontWeight: 850,
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
              fontWeight: 900,
              letterSpacing:
                '-0.04em',
            }}
          >
            Stops
          </Typography>

          <Typography
            sx={{
              mt: 0.7,
              color:
                'text.secondary',
              fontSize: 13,
            }}
          >
            Browse reusable transport stops, locations and geofence settings.
          </Typography>
        </Box>

        <Chip
          icon={
            <LocationOnRounded />
          }
          label={
            `${summary.total} matching stops`
          }
          sx={{
            color: 'primary.main',
            bgcolor:
              'rgba(201,165,92,0.10)',
            border:
              '1px solid',
            borderColor:
              'rgba(201,165,92,0.22)',
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
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
              'Matching Stops',
            value:
              summary.total,
            icon:
              <LocationOnRounded />,
          },
          {
            label:
              'Shown on Page',
            value:
              summary.shown,
            icon:
              <MapRounded />,
          },
          {
            label:
              'Shared on Page',
            value:
              summary.shared,
            icon:
              <ShareLocationRounded />,
          },
          {
            label:
              'School Stops on Page',
            value:
              summary.schoolSpecific,
            icon:
              <RadarRounded />,
          },
        ].map(
          (item) => (
            <Paper
              key={item.label}
              elevation={0}
              sx={{
                p: 2.5,
                border:
                  '1px solid',
                borderColor:
                  'divider',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'space-between',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      color:
                        'text.secondary',
                      fontSize: 10.5,
                      fontWeight: 800,
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
                      fontSize: 30,
                      lineHeight: 1,
                      fontWeight: 900,
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    display: 'grid',
                    placeItems:
                      'center',
                    borderRadius: 2,
                    color:
                      'primary.main',
                    bgcolor:
                      'action.hover',
                  }}
                >
                  {item.icon}
                </Box>
              </Box>
            </Paper>
          ),
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              lg:
                'minmax(0, 1fr) 210px 210px',
            },
            gap: 1.5,
          }}
        >
          <TextField
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value,
              );
              setPage(1);
            }}
            label="Search stops"
            placeholder="Name, code or address"
            slotProps={{
              input: {
                startAdornment: (
                  <SearchRounded
                    sx={{
                      mr: 1,
                      color:
                        'text.secondary',
                      fontSize: 20,
                    }}
                  />
                ),
              },
            }}
          />

          <FormControl>
            <InputLabel id="stop-school-label">
              School
            </InputLabel>

            <Select
              labelId="stop-school-label"
              label="School"
              value={schoolId}
              onChange={(event) => {
                setSchoolId(
                  event.target.value,
                );
                setPage(1);
              }}
            >
              <MenuItem value="all">
                All schools
              </MenuItem>

              {schools.map(
                (school) => (
                  <MenuItem
                    key={school.id}
                    value={school.id}
                  >
                    {school.name}
                  </MenuItem>
                ),
              )}
            </Select>
          </FormControl>

          <FormControl>
            <InputLabel id="stop-status-label">
              Status
            </InputLabel>

            <Select
              labelId="stop-status-label"
              label="Status"
              value={status}
              onChange={(event) => {
                setStatus(
                  event.target.value as StatusFilter,
                );
                setPage(1);
              }}
            >
              <MenuItem value="active">
                Active
              </MenuItem>
              <MenuItem value="inactive">
                Inactive
              </MenuItem>
              <MenuItem value="all">
                All statuses
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {stopsQuery.isLoading ? (
        <Paper
          elevation={0}
          sx={{
            py: 8,
            display: 'grid',
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

      {stopsQuery.isError ? (
        <Alert severity="error">
          {errorMessage(
            stopsQuery.error,
          )}
        </Alert>
      ) : null}

      {!stopsQuery.isLoading &&
      !stopsQuery.isError &&
      stops.length === 0 ? (
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
          <LocationOnRounded
            sx={{
              fontSize: 44,
              color:
                'primary.main',
            }}
          />

          <Typography
            sx={{
              mt: 2,
              fontWeight: 800,
            }}
          >
            No stops found
          </Typography>
        </Paper>
      ) : null}

      {!stopsQuery.isLoading &&
      !stopsQuery.isError &&
      stops.length > 0 ? (
        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
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
                '1.2fr 1fr 1.5fr 1fr .75fr .75fr',
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
              'Stop',
              'School',
              'Address',
              'Coordinates',
              'Geofence',
              'Status',
            ].map(
              (heading) => (
                <Typography
                  key={heading}
                  sx={{
                    color:
                      'text.secondary',
                    fontSize: 10,
                    fontWeight: 800,
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

          {stops.map(
            (
              stop,
              index,
            ) => (
              <Box
                key={stop.id}
                sx={{
                  px: 2.5,
                  py: 2,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    lg:
                      '1.2fr 1fr 1.5fr 1fr .75fr .75fr',
                  },
                  gap: {
                    xs: 1.2,
                    lg: 2,
                  },
                  alignItems:
                    'center',
                  borderBottom:
                    index ===
                    stops.length - 1
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
                <Box>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 800,
                    }}
                  >
                    {stop.name}
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,
                      color:
                        'text.secondary',
                      fontSize: 10.5,
                    }}
                  >
                    {stop.code ??
                      'No code'}
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: 11.5,
                  }}
                >
                  {stop.schoolId
                    ? schoolById.get(
                      stop.schoolId,
                    )?.name ??
                      'School unavailable'
                    : 'Shared / tenant-wide'}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11.5,
                    color:
                      'text.secondary',
                  }}
                >
                  {stop.address ??
                    'No address'}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 10.5,
                    fontFamily:
                      'monospace',
                  }}
                >
                  {coordinateLabel(
                    stop,
                  )}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11.5,
                  }}
                >
                  {stop.geofenceRadiusMeters} m
                </Typography>

                <Chip
                  size="small"
                  label={
                    statusLabel(
                      stop.status,
                    )
                  }
                  sx={{
                    color:
                      statusColor(
                        stop.status,
                      ),
                    bgcolor:
                      `${statusColor(
                        stop.status,
                      )}14`,
                    border:
                      '1px solid',
                    borderColor:
                      `${statusColor(
                        stop.status,
                      )}30`,
                  }}
                />
              </Box>
            ),
          )}

          <PaginationControls
            page={
              stopsQuery.data
                ?.page ??
              page
            }
            limit={
              stopsQuery.data
                ?.limit ??
              limit
            }
            total={
              stopsQuery.data
                ?.total ??
              0
            }
            totalPages={
              stopsQuery.data
                ?.totalPages ??
              0
            }
            onPageChange={
              setPage
            }
            onLimitChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        </Paper>
      ) : null}
    </Box>
  );
}
