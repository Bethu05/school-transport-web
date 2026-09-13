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
    IconButton,
    MenuItem,
    Paper,
    Snackbar,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

import {
    AddRounded,
    AltRouteRounded,
    BlockRounded,
    CalendarMonthRounded,
    DirectionsBusRounded,
    EditRounded,
    PersonRounded,
    ScheduleRounded,
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
    listDrivers,
    type Driver,
} from '../drivers/drivers.api';

import {
    listRoutes,
    type Route,
} from '../routes/routes.api';

import {
    listVehicles,
    type Vehicle,
} from '../vehicles/vehicles.api';

import {
    cancelTrip,
    createTrip,
    listTrips,
    scheduleTrip,
    updateTrip,
    type CreateTripInput,
    type Trip,
    type TripStatus,
    type UpdateTripInput,
} from './trips.api';

import {
    TripEditDialog,
} from './TripEditDialog';

import {
    TripScheduleDialog,
} from './TripScheduleDialog';

const BUSINESS_TIME_ZONE =
    'Africa/Nairobi';

const EMPTY_TRIPS: Trip[] =
    [];

const EMPTY_ROUTES: Route[] =
    [];

const EMPTY_DRIVERS: Driver[] =
    [];

const EMPTY_VEHICLES: Vehicle[] =
    [];

type TripViewFilter =
    | 'current'
    | 'completed'
    | 'cancelled'
    | 'all';

function errorMessage(
    error: unknown,
): string {
    return error instanceof Error
        ? error.message
        : 'The operation could not be completed.';
}

function statusLabel(
    status: TripStatus,
): string {
    switch (status) {
        case 'draft':
            return 'Draft';

        case 'scheduled':
            return 'Scheduled';

        case 'boarding':
            return 'Boarding';

        case 'in_progress':
            return 'In progress';

        case 'completed':
            return 'Completed';

        case 'cancelled':
            return 'Cancelled';
    }
}

function statusColor(
    status: TripStatus,
): string {
    switch (status) {
        case 'draft':
            return '#85898F';

        case 'scheduled':
            return '#376C8A';

        case 'boarding':
            return '#B17D32';

        case 'in_progress':
            return '#5F9471';

        case 'completed':
            return '#4F6B58';

        case 'cancelled':
            return '#A65F5A';
    }
}

function businessDateToday():
    string {
    const parts =
        new Intl.DateTimeFormat(
            'en-GB',
            {
                timeZone:
                    BUSINESS_TIME_ZONE,

                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit',
            },
        ).formatToParts(
            new Date(),
        );

    const year =
        parts.find(
            (part) =>
                part.type ===
                'year',
        )?.value;

    const month =
        parts.find(
            (part) =>
                part.type ===
                'month',
        )?.value;

    const day =
        parts.find(
            (part) =>
                part.type ===
                'day',
        )?.value;

    if (
        !year ||
        !month ||
        !day
    ) {
        return '';
    }

    return `${year}-${month}-${day}`;
}

function businessDateFromTimestamp(
    value: string,
): string {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return '';
    }

    const parts =
        new Intl.DateTimeFormat(
            'en-GB',
            {
                timeZone:
                    BUSINESS_TIME_ZONE,

                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit',
            },
        ).formatToParts(
            date,
        );

    const year =
        parts.find(
            (part) =>
                part.type ===
                'year',
        )?.value;

    const month =
        parts.find(
            (part) =>
                part.type ===
                'month',
        )?.value;

    const day =
        parts.find(
            (part) =>
                part.type ===
                'day',
        )?.value;

    if (
        !year ||
        !month ||
        !day
    ) {
        return '';
    }

    return `${year}-${month}-${day}`;
}

function formatDate(
    value: string,
): string {
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

            weekday:
                'short',

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

function formatTime(
    value:
        | string
        | null,
): string {
    if (!value) {
        return '—';
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

            hour:
                '2-digit',

            minute:
                '2-digit',

            hour12:
                false,
        },
    ).format(
        date,
    );
}

function tripNeedsAttention(
    trip: Trip,
): boolean {
    if (
        trip.status ===
        'completed' ||
        trip.status ===
        'cancelled'
    ) {
        return false;
    }

    return (
        trip.status ===
        'draft' ||
        !trip.vehicleId ||
        !trip.driverId
    );
}

function tripCanBeEdited(
    trip: Trip,
): boolean {
    return (
        trip.status ===
        'draft' ||
        trip.status ===
        'scheduled'
    );
}

function tripCanBeCancelled(
    trip: Trip,
): boolean {
    return (
        trip.status ===
        'draft' ||
        trip.status ===
        'scheduled' ||
        trip.status ===
        'boarding'
    );
}

function tripMatchesView(
    trip: Trip,
    view:
        TripViewFilter,
): boolean {
    switch (view) {
        case 'current':
            return (
                trip.status !==
                'completed' &&
                trip.status !==
                'cancelled'
            );

        case 'completed':
            return (
                trip.status ===
                'completed'
            );

        case 'cancelled':
            return (
                trip.status ===
                'cancelled'
            );

        case 'all':
            return true;
    }
}

export function TripsPage() {
    const {
        tenant,
    } = useAuth();

    const queryClient =
        useQueryClient();

    /**
     * Historical records are deliberately hidden by default.
     *
     * The database keeps them permanently, but operators should
     * normally see only trips that still matter operationally.
     */
    const [
        viewFilter,
        setViewFilter,
    ] =
        useState<TripViewFilter>(
            'current',
        );

    const [
        scheduleOpen,
        setScheduleOpen,
    ] =
        useState(false);

    const [
        scheduleDialogKey,
        setScheduleDialogKey,
    ] =
        useState(0);

    const [
        editingTrip,
        setEditingTrip,
    ] =
        useState<
            Trip | null
        >(null);

    const [
        cancelTarget,
        setCancelTarget,
    ] =
        useState<
            Trip | null
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

    const role =
        tenant?.role;

    const canManageTrips =
        role === 'owner' ||
        role === 'admin' ||
        role ===
        'transport_manager' ||
        role ===
        'dispatcher';

    const canCancelTrips =
        role === 'owner' ||
        role === 'admin' ||
        role ===
        'transport_manager';

    // ============================================================
    // DATA
    // ============================================================

    const tripsQuery =
        useQuery({
            queryKey: [
                'trips',
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

                    return listTrips(
                        tenantId,
                    );
                },
        });

    const routesQuery =
        useQuery({
            queryKey: [
                'routes',
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

                    return listRoutes(
                        tenantId,
                    );
                },
        });

    const driversQuery =
        useQuery({
            queryKey: [
                'drivers',
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

                    return listDrivers(
                        tenantId,
                    );
                },
        });

    const vehiclesQuery =
        useQuery({
            queryKey: [
                'vehicles',
                tenantId,
                'trip-scheduling',
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
                            page:
                                1,

                            limit:
                                100,
                        },
                    );
                },
        });

    async function refreshTrips():
        Promise<void> {
        await queryClient.invalidateQueries(
            {
                queryKey: [
                    'trips',
                ],
            },
        );
    }

    // ============================================================
    // CREATE + SCHEDULE
    // ============================================================

    const scheduleMutation =
        useMutation({
            mutationFn:
                async (
                    input:
                        CreateTripInput,
                ) => {
                    if (!tenantId) {
                        throw new Error(
                            'No active tenant',
                        );
                    }

                    const draft =
                        await createTrip(
                            tenantId,
                            input,
                        );

                    return scheduleTrip(
                        tenantId,
                        draft.id,
                    );
                },

            onSuccess:
                async () => {
                    await refreshTrips();

                    setScheduleOpen(
                        false,
                    );

                    setMutationError(
                        null,
                    );

                    /**
                     * A newly scheduled trip is operational, so make sure
                     * the user returns to the default current view.
                     */
                    setViewFilter(
                        'current',
                    );

                    setSuccessMessage(
                        'Trip scheduled successfully.',
                    );
                },

            onError:
                async (
                    error,
                ) => {
                    await refreshTrips();

                    setMutationError(
                        errorMessage(
                            error,
                        ),
                    );
                },
        });

    // ============================================================
    // EDIT
    // ============================================================

    const updateMutation =
        useMutation({
            mutationFn:
                async ({
                    tripId,
                    input,
                }: {
                    tripId:
                    string;

                    input:
                    UpdateTripInput;
                }) => {
                    if (!tenantId) {
                        throw new Error(
                            'No active tenant',
                        );
                    }

                    return updateTrip(
                        tenantId,
                        tripId,
                        input,
                    );
                },

            onSuccess:
                async () => {
                    await refreshTrips();

                    setEditingTrip(
                        null,
                    );

                    setMutationError(
                        null,
                    );

                    setSuccessMessage(
                        'Trip updated successfully.',
                    );
                },

            onError:
                (
                    error,
                ) => {
                    setMutationError(
                        errorMessage(
                            error,
                        ),
                    );
                },
        });

    // ============================================================
    // CANCEL
    // ============================================================

    const cancelMutation =
        useMutation({
            mutationFn:
                async (
                    tripId:
                        string,
                ) => {
                    if (!tenantId) {
                        throw new Error(
                            'No active tenant',
                        );
                    }

                    return cancelTrip(
                        tenantId,
                        tripId,
                    );
                },

            onSuccess:
                async () => {
                    await refreshTrips();

                    setCancelTarget(
                        null,
                    );

                    setMutationError(
                        null,
                    );

                    /**
                     * Cancelled records disappear automatically from
                     * the default Current view.
                     *
                     * The user can retrieve them using the View filter.
                     */
                    setSuccessMessage(
                        'Trip cancelled successfully.',
                    );
                },

            onError:
                (
                    error,
                ) => {
                    setMutationError(
                        errorMessage(
                            error,
                        ),
                    );
                },
        });

    // ============================================================
    // DERIVED DATA
    // ============================================================

    const trips =
        tripsQuery.data ??
        EMPTY_TRIPS;

    const routes =
        routesQuery.data ??
        EMPTY_ROUTES;

    const drivers =
        driversQuery.data ??
        EMPTY_DRIVERS;

    const vehicles =
        vehiclesQuery.data
            ?.items ??
        EMPTY_VEHICLES;

    const today =
        businessDateToday();

    const currentTrips =
        useMemo(
            () =>
                trips.filter(
                    (trip) =>
                        trip.status !==
                        'completed' &&
                        trip.status !==
                        'cancelled',
                ),
            [
                trips,
            ],
        );

    const visibleTrips =
        useMemo(
            () =>
                trips
                    .filter(
                        (trip) =>
                            tripMatchesView(
                                trip,
                                viewFilter,
                            ),
                    )
                    .sort(
                        (
                            first,
                            second,
                        ) =>
                            new Date(
                                first.scheduledStartAt,
                            ).getTime() -
                            new Date(
                                second.scheduledStartAt,
                            ).getTime(),
                    ),
            [
                trips,
                viewFilter,
            ],
        );

    const summary =
        useMemo(
            () => ({
                current:
                    currentTrips.length,

                today:
                    trips.filter(
                        (trip) =>
                            trip.status !==
                            'cancelled' &&
                            businessDateFromTimestamp(
                                trip.scheduledStartAt,
                            ) ===
                            today,
                    ).length,

                scheduled:
                    trips.filter(
                        (trip) =>
                            trip.status ===
                            'scheduled',
                    ).length,

                actionRequired:
                    trips.filter(
                        tripNeedsAttention,
                    ).length,
            }),
            [
                trips,
                currentTrips,
                today,
            ],
        );

    const historicalCount =
        trips.filter(
            (trip) =>
                trip.status ===
                'completed' ||
                trip.status ===
                'cancelled',
        ).length;

    const schedulingResourcesLoading =
        routesQuery.isLoading ||
        vehiclesQuery.isLoading ||
        driversQuery.isLoading;

    const schedulingResourcesError =
        routesQuery.isError ||
        vehiclesQuery.isError ||
        driversQuery.isError;

    const eligibleRoutes =
        routes.filter(
            (route) =>
                route.status ===
                'active' &&
                route.stopCount >
                0,
        );

    const activeDrivers =
        drivers.filter(
            (driver) =>
                driver.status ===
                'active',
        );

    const activeVehicles =
        vehicles.filter(
            (vehicle) =>
                vehicle.status ===
                'active',
        );

    const canOpenScheduler =
        canManageTrips &&
        !schedulingResourcesLoading &&
        !schedulingResourcesError &&
        eligibleRoutes.length >
        0 &&
        activeVehicles.length >
        0 &&
        activeDrivers.length >
        0;

    function openScheduler():
        void {
        setMutationError(
            null,
        );

        setScheduleDialogKey(
            (current) =>
                current + 1,
        );

        setScheduleOpen(
            true,
        );
    }

    function openEditor(
        trip: Trip,
    ): void {
        setMutationError(
            null,
        );

        setEditingTrip(
            trip,
        );
    }

    function openCancel(
        trip: Trip,
    ): void {
        setMutationError(
            null,
        );

        setCancelTarget(
            trip,
        );
    }

    function emptyMessage():
        string {
        switch (viewFilter) {
            case 'current':
                return 'There are no current trips.';

            case 'completed':
                return 'There are no completed trips.';

            case 'cancelled':
                return 'There are no cancelled trips.';

            case 'all':
                return 'There are no trips.';
        }
    }

    return (
        <Box>
            {/* ======================================================
          HEADER
          ====================================================== */}

            <Box
                sx={{
                    mb: 3,

                    display:
                        'flex',

                    alignItems: {
                        xs:
                            'stretch',

                        sm:
                            'center',
                    },

                    justifyContent:
                        'space-between',

                    flexDirection: {
                        xs:
                            'column',

                        sm:
                            'row',
                    },

                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        component="h1"
                        sx={{
                            fontSize:
                                26,

                            fontWeight:
                                850,

                            letterSpacing:
                                '-0.03em',
                        }}
                    >
                        Trips
                    </Typography>

                    <Typography
                        sx={{
                            mt: 0.5,

                            color:
                                'text.secondary',

                            fontSize:
                                13.5,
                        }}
                    >
                        Schedule and manage dated transport operations.
                    </Typography>
                </Box>

                {canManageTrips ? (
                    <Button
                        variant="contained"
                        startIcon={
                            <AddRounded />
                        }
                        disabled={
                            !canOpenScheduler
                        }
                        onClick={
                            openScheduler
                        }
                    >
                        Schedule trip
                    </Button>
                ) : null}
            </Box>

            {/* ======================================================
          SUMMARY
          ====================================================== */}

            <Box
                sx={{
                    mb: 3,

                    display:
                        'grid',

                    gridTemplateColumns: {
                        xs:
                            'repeat(2, minmax(0, 1fr))',

                        md:
                            'repeat(4, minmax(0, 1fr))',
                    },

                    gap: 1.5,
                }}
            >
                {[
                    {
                        label:
                            'Current trips',

                        value:
                            summary.current,

                        icon:
                            <AltRouteRounded />,
                    },

                    {
                        label:
                            'Today',

                        value:
                            summary.today,

                        icon:
                            <CalendarMonthRounded />,
                    },

                    {
                        label:
                            'Scheduled',

                        value:
                            summary.scheduled,

                        icon:
                            <ScheduleRounded />,
                    },

                    {
                        label:
                            'Action required',

                        value:
                            summary.actionRequired,

                        icon:
                            <DirectionsBusRounded />,
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

                                    gap: 1.25,
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
                                            'action.hover',

                                        color:
                                            'primary.main',
                                    }}
                                >
                                    {item.icon}
                                </Box>

                                <Box>
                                    <Typography
                                        sx={{
                                            fontSize:
                                                22,

                                            fontWeight:
                                                850,
                                        }}
                                    >
                                        {item.value}
                                    </Typography>

                                    <Typography
                                        sx={{
                                            color:
                                                'text.secondary',

                                            fontSize:
                                                11.5,
                                        }}
                                    >
                                        {item.label}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
                    ),
                )}
            </Box>

            {/* ======================================================
          HISTORY / STATUS FILTER
          ====================================================== */}

            <Paper
                elevation={0}
                sx={{
                    mb: 2,

                    p: 2,

                    display:
                        'flex',

                    alignItems: {
                        xs:
                            'stretch',

                        sm:
                            'center',
                    },

                    justifyContent:
                        'space-between',

                    flexDirection: {
                        xs:
                            'column',

                        sm:
                            'row',
                    },

                    gap: 1.5,

                    border:
                        '1px solid',

                    borderColor:
                        'divider',
                }}
            >
                <Box>
                    <Typography
                        sx={{
                            fontSize:
                                12.5,

                            fontWeight:
                                750,
                        }}
                    >
                        Trip history
                    </Typography>

                    <Typography
                        sx={{
                            mt: 0.3,

                            color:
                                'text.secondary',

                            fontSize:
                                11,
                        }}
                    >
                        Completed and cancelled trips are hidden by default.
                        {historicalCount >
                            0
                            ? ` ${historicalCount} historical ${historicalCount ===
                                1
                                ? 'trip is'
                                : 'trips are'
                            } available.`
                            : ''}
                    </Typography>
                </Box>

                <TextField
                    select
                    size="small"
                    label="View"
                    value={
                        viewFilter
                    }
                    onChange={(
                        event,
                    ) =>
                        setViewFilter(
                            event.target
                                .value as TripViewFilter,
                        )
                    }
                    sx={{
                        minWidth:
                            170,
                    }}
                >
                    <MenuItem
                        value="current"
                    >
                        Current
                    </MenuItem>

                    <MenuItem
                        value="completed"
                    >
                        Completed
                    </MenuItem>

                    <MenuItem
                        value="cancelled"
                    >
                        Cancelled
                    </MenuItem>

                    <MenuItem
                        value="all"
                    >
                        All trips
                    </MenuItem>
                </TextField>
            </Paper>

            {/* ======================================================
          RESOURCE WARNINGS
          ====================================================== */}

            {schedulingResourcesError ? (
                <Alert
                    severity="warning"
                    sx={{
                        mb: 2,
                    }}
                >
                    Some scheduling information could not be loaded. Existing
                    trips can still be viewed, but scheduling and reassignment may
                    not be available until routes, vehicles and drivers load.
                </Alert>
            ) : null}

            {canManageTrips &&
                !schedulingResourcesLoading &&
                !schedulingResourcesError &&
                !canOpenScheduler ? (
                <Alert
                    severity="info"
                    sx={{
                        mb: 2,
                    }}
                >
                    To schedule a trip you need an active route with at least one
                    stop, an active vehicle and an active driver.
                </Alert>
            ) : null}

            {/* ======================================================
          QUERY STATES
          ====================================================== */}

            {tripsQuery.isLoading ? (
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

            {tripsQuery.isError ? (
                <Alert
                    severity="error"
                >
                    {errorMessage(
                        tripsQuery.error,
                    )}
                </Alert>
            ) : null}

            {!tripsQuery.isLoading &&
                !tripsQuery.isError &&
                visibleTrips.length ===
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
                    <ScheduleRounded
                        sx={{
                            fontSize:
                                44,

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
                        {emptyMessage()}
                    </Typography>
                </Paper>
            ) : null}

            {/* ======================================================
          TRIP LIST
          ====================================================== */}

            {!tripsQuery.isLoading &&
                !tripsQuery.isError &&
                visibleTrips.length >
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
                                '1.05fr 1.3fr .95fr .95fr .8fr 90px',

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
                            'Date / time',
                            'Route',
                            'Vehicle',
                            'Driver',
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

                    {visibleTrips.map(
                        (
                            trip,
                            index,
                        ) => {
                            const showEdit =
                                canManageTrips &&
                                tripCanBeEdited(
                                    trip,
                                );

                            const showCancel =
                                canCancelTrips &&
                                tripCanBeCancelled(
                                    trip,
                                );

                            return (
                                <Box
                                    key={
                                        trip.id
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
                                                '1.05fr 1.3fr .95fr .95fr .8fr 90px',
                                        },

                                        gap: {
                                            xs:
                                                1.3,

                                            lg:
                                                2,
                                        },

                                        alignItems:
                                            'center',

                                        borderBottom:
                                            index ===
                                                visibleTrips.length -
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
                                    <Box>
                                        <Typography
                                            sx={{
                                                fontSize:
                                                    12.5,

                                                fontWeight:
                                                    800,
                                            }}
                                        >
                                            {formatDate(
                                                trip.scheduledStartAt,
                                            )}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                mt: 0.25,

                                                color:
                                                    'text.secondary',

                                                fontSize:
                                                    11.5,
                                            }}
                                        >
                                            {formatTime(
                                                trip.scheduledStartAt,
                                            )}
                                            {' – '}
                                            {formatTime(
                                                trip.scheduledEndAt,
                                            )}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography
                                            sx={{
                                                fontSize:
                                                    12.5,

                                                fontWeight:
                                                    750,
                                            }}
                                        >
                                            {trip.routeName}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                mt: 0.25,

                                                color:
                                                    'text.secondary',

                                                fontSize:
                                                    11.5,
                                            }}
                                        >
                                            {trip.routeCode ??
                                                `${trip.stopCount} stops`}
                                        </Typography>
                                    </Box>

                                    <Box
                                        sx={{
                                            display:
                                                'flex',

                                            alignItems:
                                                'center',

                                            gap: 0.75,
                                        }}
                                    >
                                        <DirectionsBusRounded
                                            sx={{
                                                fontSize:
                                                    17,

                                                color:
                                                    'text.secondary',
                                            }}
                                        />

                                        <Typography
                                            sx={{
                                                fontSize:
                                                    12,
                                            }}
                                        >
                                            {trip.vehicleRegistrationNumber ??
                                                'Not assigned'}
                                        </Typography>
                                    </Box>

                                    <Box
                                        sx={{
                                            display:
                                                'flex',

                                            alignItems:
                                                'center',

                                            gap: 0.75,
                                        }}
                                    >
                                        <PersonRounded
                                            sx={{
                                                fontSize:
                                                    17,

                                                color:
                                                    'text.secondary',
                                            }}
                                        />

                                        <Typography
                                            sx={{
                                                fontSize:
                                                    12,
                                            }}
                                        >
                                            {trip.driverName ??
                                                'Not assigned'}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Chip
                                            size="small"
                                            label={
                                                statusLabel(
                                                    trip.status,
                                                )
                                            }
                                            sx={{
                                                bgcolor:
                                                    `${statusColor(
                                                        trip.status,
                                                    )}18`,

                                                color:
                                                    statusColor(
                                                        trip.status,
                                                    ),

                                                fontWeight:
                                                    750,
                                            }}
                                        />

                                        {tripNeedsAttention(
                                            trip,
                                        ) ? (
                                            <Typography
                                                sx={{
                                                    mt: 0.5,

                                                    color:
                                                        'warning.main',

                                                    fontSize:
                                                        10.5,

                                                    fontWeight:
                                                        700,
                                                }}
                                            >
                                                Action required
                                            </Typography>
                                        ) : null}
                                    </Box>

                                    <Box
                                        sx={{
                                            display:
                                                'flex',

                                            alignItems:
                                                'center',

                                            gap: 0.4,
                                        }}
                                    >
                                        {showEdit ? (
                                            <Tooltip
                                                title="Edit trip"
                                            >
                                                <IconButton
                                                    size="small"
                                                    aria-label="Edit trip"
                                                    onClick={() =>
                                                        openEditor(
                                                            trip,
                                                        )
                                                    }
                                                >
                                                    <EditRounded
                                                        fontSize="small"
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        ) : null}

                                        {showCancel ? (
                                            <Tooltip
                                                title="Cancel trip"
                                            >
                                                <IconButton
                                                    size="small"
                                                    aria-label="Cancel trip"
                                                    onClick={() =>
                                                        openCancel(
                                                            trip,
                                                        )
                                                    }
                                                    sx={{
                                                        color:
                                                            'error.main',
                                                    }}
                                                >
                                                    <BlockRounded
                                                        fontSize="small"
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                        ) : null}

                                        {!showEdit &&
                                            !showCancel ? (
                                            <Typography
                                                sx={{
                                                    color:
                                                        'text.secondary',

                                                    fontSize:
                                                        12,
                                                }}
                                            >
                                                —
                                            </Typography>
                                        ) : null}
                                    </Box>
                                </Box>
                            );
                        },
                    )}
                </Paper>
            ) : null}

            {/* ======================================================
          SCHEDULE DIALOG
          ====================================================== */}

            <TripScheduleDialog
                key={
                    scheduleDialogKey
                }
                open={
                    scheduleOpen
                }
                routes={
                    routes
                }
                vehicles={
                    vehicles
                }
                drivers={
                    drivers
                }
                saving={
                    scheduleMutation.isPending
                }
                error={
                    scheduleOpen
                        ? mutationError
                        : null
                }
                onClose={() => {
                    if (
                        !scheduleMutation.isPending
                    ) {
                        setScheduleOpen(
                            false,
                        );

                        setMutationError(
                            null,
                        );
                    }
                }}
                onSchedule={
                    async (
                        input,
                    ) => {
                        await scheduleMutation.mutateAsync(
                            input,
                        );
                    }
                }
            />

            {/* ======================================================
          EDIT DIALOG
          ====================================================== */}

            <TripEditDialog
                key={
                    editingTrip?.id ??
                    'trip-edit'
                }
                open={
                    editingTrip !==
                    null
                }
                trip={
                    editingTrip
                }
                vehicles={
                    vehicles
                }
                drivers={
                    drivers
                }
                saving={
                    updateMutation.isPending
                }
                error={
                    editingTrip
                        ? mutationError
                        : null
                }
                onClose={() => {
                    if (
                        !updateMutation.isPending
                    ) {
                        setEditingTrip(
                            null,
                        );

                        setMutationError(
                            null,
                        );
                    }
                }}
                onSave={
                    async (
                        input,
                    ) => {
                        if (
                            !editingTrip
                        ) {
                            return;
                        }

                        await updateMutation.mutateAsync(
                            {
                                tripId:
                                    editingTrip.id,

                                input,
                            },
                        );
                    }
                }
            />

            {/* ======================================================
          CANCEL
          ====================================================== */}

            <Dialog
                open={
                    cancelTarget !==
                    null
                }
                onClose={() => {
                    if (
                        !cancelMutation.isPending
                    ) {
                        setCancelTarget(
                            null,
                        );

                        setMutationError(
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
                    Cancel trip?
                </DialogTitle>

                <DialogContent>
                    {cancelMutation.isError &&
                        mutationError ? (
                        <Alert
                            severity="error"
                            sx={{
                                mb: 2,
                            }}
                        >
                            {mutationError}
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
                        {cancelTarget
                            ? `Cancel ${cancelTarget.routeName} scheduled for ${formatDate(
                                cancelTarget.scheduledStartAt,
                            )} at ${formatTime(
                                cancelTarget.scheduledStartAt,
                            )}?`
                            : ''}
                    </Typography>

                    <Typography
                        sx={{
                            mt: 1.5,

                            color:
                                'text.secondary',

                            fontSize:
                                12,

                            lineHeight:
                                1.7,
                        }}
                    >
                        The record will remain in Trip History and can be viewed by
                        selecting Cancelled or All trips.
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
                            cancelMutation.isPending
                        }
                        onClick={() => {
                            setCancelTarget(
                                null,
                            );

                            setMutationError(
                                null,
                            );
                        }}
                    >
                        Keep trip
                    </Button>

                    <Button
                        variant="contained"
                        color="error"
                        disabled={
                            cancelMutation.isPending ||
                            !cancelTarget
                        }
                        onClick={() => {
                            if (
                                cancelTarget
                            ) {
                                cancelMutation.mutate(
                                    cancelTarget.id,
                                );
                            }
                        }}
                    >
                        {cancelMutation.isPending
                            ? 'Cancelling...'
                            : 'Cancel trip'}
                    </Button>
                </DialogActions>
            </Dialog>

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