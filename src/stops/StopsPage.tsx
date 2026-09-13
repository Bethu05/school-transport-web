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
    PlaceRounded,
    SearchRounded,
    SchoolRounded,
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
    listSchools,
    type School,
} from '../schools/schools.api';

import {
    listStopsPage,
    type Stop,
    type StopStatus,
} from './stops.api';

const EMPTY_STOPS:
    Stop[] = [];

const EMPTY_SCHOOLS:
    School[] = [];

type StatusFilter =
    | 'all'
    | StopStatus;

function statusLabel(
    status: string,
): string {
    switch (status) {
        case 'active':
            return 'Active';

        case 'inactive':
            return 'Inactive';

        default:
            return status;
    }
}

function statusColor(
    status: string,
): string {
    switch (status) {
        case 'active':
            return '#5F9471';

        case 'inactive':
            return '#85898F';

        default:
            return '#85898F';
    }
}

function errorMessage(
    error: unknown,
): string {
    return error instanceof
        Error
        ? error.message
        : 'Stops could not be loaded.';
}

export function StopsPage() {
    const {
        tenant,
    } = useAuth();

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
        schoolId,
        setSchoolId,
    ] =
        useState('all');

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

    const tenantId =
        tenant?.tenantId;

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

    const stopsQuery =
        useQuery({
            queryKey: [
                'stops-page',
                tenantId,
                search,
                status,
                schoolId,
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

                    return listStopsPage(
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

                            schoolId:
                                schoolId ===
                                    'all'
                                    ? undefined
                                    : schoolId,
                        },
                    );
                },
        });

    const summaryQuery =
        useQuery({
            queryKey: [
                'stops-summary',
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
                    ] =
                        await Promise.all([
                            listStopsPage(
                                tenantId,
                                {
                                    page: 1,
                                    limit: 1,
                                },
                            ),

                            listStopsPage(
                                tenantId,
                                {
                                    page: 1,
                                    limit: 1,
                                    status:
                                        'active',
                                },
                            ),

                            listStopsPage(
                                tenantId,
                                {
                                    page: 1,
                                    limit: 1,
                                    status:
                                        'inactive',
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
                    };
                },
        });

    const schools =
        schoolsQuery.data ??
        EMPTY_SCHOOLS;

    const stops =
        stopsQuery.data
            ?.items ??
        EMPTY_STOPS;

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

    function schoolName(
        stop:
            Stop,
    ): string {
        if (
            stop.schoolId ===
            null
        ) {
            return 'Shared stop';
        }

        return schoolById.get(
            stop.schoolId,
        )?.name ??
            'School unavailable';
    }

    const summary =
        summaryQuery.data ?? {
            total: 0,
            active: 0,
            inactive: 0,
        };

    return (
        <Box>
            <Box
                sx={{
                    mb: 3,
                }}
            >
                <Typography
                    variant="h4"

                    sx={{
                        fontWeight:
                            900,
                    }}
                >
                    Stops
                </Typography>

                <Typography
                    sx={{
                        mt: 0.75,

                        color:
                            'text.secondary',

                        fontSize:
                            13,
                    }}
                >
                    Browse transport stops across the tenant. Active stops are shown by default.
                </Typography>
            </Box>

            <Box
                sx={{
                    mb: 2,

                    display:
                        'grid',

                    gridTemplateColumns: {
                        xs:
                            '1fr',

                        md:
                            'repeat(3, minmax(0, 1fr))',
                    },

                    gap: 1.5,
                }}
            >
                {[
                    {
                        label:
                            'Total stops',

                        value:
                            summary.total,

                        icon:
                            <PlaceRounded />,
                    },

                    {
                        label:
                            'Active',

                        value:
                            summary.active,

                        icon:
                            <LocationOnRounded />,
                    },

                    {
                        label:
                            'Inactive',

                        value:
                            summary.inactive,

                        icon:
                            <LocationOnRounded />,
                    },
                ].map(
                    (item) => (
                        <Paper
                            key={
                                item.label
                            }

                            elevation={0}

                            sx={{
                                p: 2.25,

                                border:
                                    '1px solid',

                                borderColor:
                                    'divider',
                            }}
                        >
                            <Box
                                sx={{
                                    display:
                                        'flex',

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

                                            fontSize:
                                                10.5,

                                            fontWeight:
                                                800,

                                            textTransform:
                                                'uppercase',

                                            letterSpacing:
                                                '0.08em',
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

                                        bgcolor:
                                            'action.hover',

                                        color:
                                            'primary.main',
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
                                'minmax(0, 1fr) 220px 190px',
                        },

                        gap: 1.5,
                    }}
                >
                    <TextField
                        value={
                            search
                        }

                        onChange={(
                            event,
                        ) => {
                            setSearch(
                                event.target
                                    .value,
                            );

                            setPage(
                                1,
                            );
                        }}

                        label="Search stops"

                        placeholder="Name, code or address"

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
                            id="stop-school-label"
                        >
                            School
                        </InputLabel>

                        <Select
                            labelId="stop-school-label"

                            label="School"

                            value={
                                schoolId
                            }

                            onChange={(
                                event,
                            ) => {
                                setSchoolId(
                                    event.target
                                        .value,
                                );

                                setPage(
                                    1,
                                );
                            }}
                        >
                            <MenuItem
                                value="all"
                            >
                                All schools
                            </MenuItem>

                            {schools.map(
                                (school) => (
                                    <MenuItem
                                        key={
                                            school.id
                                        }

                                        value={
                                            school.id
                                        }
                                    >
                                        {school.name}
                                        {school.code
                                            ? ` (${school.code})`
                                            : ''}
                                    </MenuItem>
                                ),
                            )}
                        </Select>
                    </FormControl>

                    <FormControl>
                        <InputLabel
                            id="stop-status-label"
                        >
                            Status
                        </InputLabel>

                        <Select
                            labelId="stop-status-label"

                            label="Status"

                            value={
                                status
                            }

                            onChange={(
                                event,
                            ) => {
                                setStatus(
                                    event.target
                                        .value as StatusFilter,
                                );

                                setPage(
                                    1,
                                );
                            }}
                        >
                            <MenuItem
                                value="all"
                            >
                                All statuses
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
                    School names could not be loaded. Stops can still be viewed.
                </Alert>
            ) : null}

            {stopsQuery.isLoading ? (
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

            {stopsQuery.isError ? (
                <Alert
                    severity="error"
                >
                    {errorMessage(
                        stopsQuery.error,
                    )}
                </Alert>
            ) : null}

            {!stopsQuery.isLoading &&
                !stopsQuery.isError &&
                stops.length ===
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
                    <LocationOnRounded
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
                        No stops found
                    </Typography>
                </Paper>
            ) : null}

            {!stopsQuery.isLoading &&
                !stopsQuery.isError &&
                stops.length >
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
                                '1.25fr .7fr 1fr 1.5fr .75fr .7fr',

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
                            'Code',
                            'School',
                            'Address',
                            'Geofence',
                            'Status',
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

                    {stops.map(
                        (
                            stop,
                            index,
                        ) => (
                            <Box
                                key={
                                    stop.id
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
                                            '1.25fr .7fr 1fr 1.5fr .75fr .7fr',
                                    },

                                    alignItems:
                                        'center',

                                    gap: {
                                        xs:
                                            1.2,

                                        lg:
                                            2,
                                    },

                                    borderBottom:
                                        index ===
                                            stops.length -
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

                                        minWidth: 0,
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
                                        <LocationOnRounded />
                                    </Box>

                                    <Typography
                                        noWrap

                                        sx={{
                                            fontSize:
                                                12.5,

                                            fontWeight:
                                                800,
                                        }}
                                    >
                                        {stop.name}
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
                                    {stop.code ??
                                        '—'}
                                </Typography>

                                <Box
                                    sx={{
                                        display:
                                            'flex',

                                        alignItems:
                                            'center',

                                        gap: 0.7,

                                        minWidth: 0,
                                    }}
                                >
                                    <SchoolRounded
                                        sx={{
                                            fontSize:
                                                17,

                                            color:
                                                'text.secondary',
                                        }}
                                    />

                                    <Typography
                                        noWrap

                                        sx={{
                                            fontSize:
                                                12,
                                        }}
                                    >
                                        {schoolName(
                                            stop,
                                        )}
                                    </Typography>
                                </Box>

                                <Typography
                                    sx={{
                                        fontSize:
                                            12,

                                        color:
                                            stop.address
                                                ? 'text.primary'
                                                : 'text.secondary',
                                    }}
                                >
                                    {stop.address ??
                                        'No address recorded'}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize:
                                            12,

                                        fontWeight:
                                            700,
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
        </Box>
    );
}
