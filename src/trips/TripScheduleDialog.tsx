import {
    useState,
    type FormEvent,
} from 'react';

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';

import type {
    Driver,
} from '../drivers/drivers.api';

import type {
    Route,
} from '../routes/routes.api';

import type {
    Vehicle,
} from '../vehicles/vehicles.api';

import type {
    CreateTripInput,
} from './trips.api';

const BUSINESS_TIME_ZONE =
    'Africa/Nairobi';

const BUSINESS_UTC_OFFSET =
    '+03:00';

interface TripScheduleDialogProps {
    open: boolean;

    routes: readonly Route[];

    vehicles: readonly Vehicle[];

    drivers: readonly Driver[];

    saving: boolean;

    error: string | null;

    onClose: () => void;

    /**
     * The parent will:
     *
     * 1. create the draft trip
     * 2. immediately call /trips/:id/schedule
     */
    onSchedule: (
        input: CreateTripInput,
    ) => Promise<void>;
}

interface ScheduleFormState {
    routeId: string;

    serviceDate: string;

    startTime: string;

    endTime: string;

    vehicleId: string;

    driverId: string;

    notes: string;
}

/**
 * Return today's calendar date in the platform's
 * business timezone.
 *
 * We avoid relying on the browser computer's timezone.
 */
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

/**
 * Convert the user's Nairobi calendar date/time into
 * the explicit ISO 8601 value expected by the backend.
 *
 * Kenya currently uses UTC+03:00 year-round.
 *
 * NOTE:
 * This is intentionally retained for now.
 * We will replace the fixed Nairobi timezone with each
 * school's own IANA timezone in the timezone checkpoint.
 */
function toBusinessIso(
    serviceDate: string,
    time: string,
): string {
    return (
        `${serviceDate}` +
        `T${time}:00` +
        BUSINESS_UTC_OFFSET
    );
}

function routeLabel(
    route: Route,
): string {
    const code =
        route.code
            ? ` (${route.code})`
            : '';

    const type =
        route.routeType ===
            'pickup'
            ? 'Pickup'
            : route.routeType ===
                'dropoff'
                ? 'Drop-off'
                : 'Other';

    return (
        `${route.name}${code}` +
        ` — ${type}`
    );
}

function vehicleLabel(
    vehicle: Vehicle,
): string {
    const description =
        [
            vehicle.make,
            vehicle.model,
        ]
            .filter(Boolean)
            .join(' ');

    return description
        ? `${vehicle.registrationNumber} — ${description}`
        : vehicle.registrationNumber;
}

function driverLabel(
    driver: Driver,
): string {
    return [
        driver.firstName,
        driver.lastName,
    ]
        .filter(Boolean)
        .join(' ');
}

export function TripScheduleDialog({
    open,
    routes,
    vehicles,
    drivers,
    saving,
    error,
    onClose,
    onSchedule,
}: TripScheduleDialogProps) {
    /**
     * Only usable route templates appear to users.
     *
     * A route with zero stops cannot create a valid trip
     * snapshot, so it should not be offered for scheduling.
     */
    const eligibleRoutes =
        routes.filter(
            (route) =>
                route.status ===
                'active' &&
                route.stopCount >
                0,
        );

    const [
        form,
        setForm,
    ] =
        useState<ScheduleFormState>(
            () => ({
                routeId:
                    eligibleRoutes.length ===
                        1
                        ? eligibleRoutes[0]
                            .id
                        : '',

                serviceDate:
                    businessDateToday(),

                startTime:
                    '06:30',

                endTime:
                    '08:00',

                vehicleId:
                    '',

                driverId:
                    '',

                notes:
                    '',
            }),
        );

    const [
        validationError,
        setValidationError,
    ] =
        useState<string | null>(
            null,
        );

    const selectedRoute =
        eligibleRoutes.find(
            (route) =>
                route.id ===
                form.routeId,
        ) ?? null;

    /**
     * A vehicle or driver may either:
     *
     * - belong specifically to the route's school
     * - be tenant-wide with schoolId === null
     *
     * The backend remains authoritative and performs
     * the final school / tenant checks.
     */
    const compatibleVehicles =
        vehicles.filter(
            (vehicle) =>
                vehicle.status ===
                'active' &&
                (
                    !selectedRoute ||
                    vehicle.schoolId ===
                    null ||
                    vehicle.schoolId ===
                    selectedRoute.schoolId
                ),
        );

    const compatibleDrivers =
        drivers.filter(
            (driver) =>
                driver.status ===
                'active' &&
                (
                    !selectedRoute ||
                    driver.schoolId ===
                    null ||
                    driver.schoolId ===
                    selectedRoute.schoolId
                ),
        );

    function updateField<
        K extends keyof ScheduleFormState,
    >(
        key: K,
        value:
            ScheduleFormState[K],
    ): void {
        setForm(
            (current) => ({
                ...current,

                [key]:
                    value,
            }),
        );
    }

    function selectRoute(
        routeId: string,
    ): void {
        const route =
            eligibleRoutes.find(
                (item) =>
                    item.id ===
                    routeId,
            ) ?? null;

        setForm(
            (current) => {
                const vehicle =
                    vehicles.find(
                        (item) =>
                            item.id ===
                            current.vehicleId,
                    );

                const driver =
                    drivers.find(
                        (item) =>
                            item.id ===
                            current.driverId,
                    );

                const vehicleStillValid =
                    !route ||
                    !vehicle ||
                    vehicle.schoolId ===
                    null ||
                    vehicle.schoolId ===
                    route.schoolId;

                const driverStillValid =
                    !route ||
                    !driver ||
                    driver.schoolId ===
                    null ||
                    driver.schoolId ===
                    route.schoolId;

                return {
                    ...current,

                    routeId,

                    vehicleId:
                        vehicleStillValid
                            ? current.vehicleId
                            : '',

                    driverId:
                        driverStillValid
                            ? current.driverId
                            : '',
                };
            },
        );
    }

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        setValidationError(
            null,
        );

        if (
            !form.routeId
        ) {
            setValidationError(
                'Please select a route.',
            );

            return;
        }

        if (
            !form.serviceDate
        ) {
            setValidationError(
                'Please select the service date.',
            );

            return;
        }

        if (
            !form.startTime
        ) {
            setValidationError(
                'Please enter the departure time.',
            );

            return;
        }

        if (
            !form.endTime
        ) {
            setValidationError(
                'Please enter the expected finish time.',
            );

            return;
        }

        if (
            !form.vehicleId
        ) {
            setValidationError(
                'Please select a vehicle.',
            );

            return;
        }

        if (
            !form.driverId
        ) {
            setValidationError(
                'Please select a driver.',
            );

            return;
        }

        const scheduledStartAt =
            toBusinessIso(
                form.serviceDate,
                form.startTime,
            );

        const scheduledEndAt =
            toBusinessIso(
                form.serviceDate,
                form.endTime,
            );

        const start =
            new Date(
                scheduledStartAt,
            );

        const end =
            new Date(
                scheduledEndAt,
            );

        if (
            end.getTime() <=
            start.getTime()
        ) {
            setValidationError(
                'Expected finish time must be later than the departure time.',
            );

            return;
        }

        const notes =
            form.notes.trim();

        const input:
            CreateTripInput = {
            routeId:
                form.routeId,

            vehicleId:
                form.vehicleId,

            driverId:
                form.driverId,

            serviceDate:
                form.serviceDate,

            scheduledStartAt,

            scheduledEndAt,

            notes:
                notes ||
                undefined,
        };

        /**
         * IMPORTANT:
         *
         * The parent callback returns Promise<void>.
         *
         * We await it so the dialog remains in its saving state
         * until both draft creation and scheduling have completed.
         */
        await onSchedule(
            input,
        );
    }

    return (
        <Dialog
            open={
                open
            }
            onClose={
                saving
                    ? undefined
                    : onClose
            }
            fullWidth
            maxWidth="sm"
        >
            <Box
                component="form"
                onSubmit={
                    handleSubmit
                }
            >
                <DialogTitle
                    sx={{
                        fontWeight:
                            850,
                    }}
                >
                    Schedule trip
                </DialogTitle>

                <DialogContent>
                    <Typography
                        sx={{
                            mb:
                                2.5,

                            color:
                                'text.secondary',

                            fontSize:
                                13,

                            lineHeight:
                                1.6,
                        }}
                    >
                        Create a dated transport run and assign its vehicle, driver and
                        operating times.
                    </Typography>

                    <Box
                        sx={{
                            display:
                                'grid',

                            gridTemplateColumns: {
                                xs:
                                    '1fr',

                                sm:
                                    'repeat(2, minmax(0, 1fr))',
                            },

                            gap:
                                2,
                        }}
                    >
                        {validationError ||
                            error ? (
                            <Alert
                                severity="error"
                                sx={{
                                    gridColumn:
                                        '1 / -1',
                                }}
                            >
                                {validationError ??
                                    error}
                            </Alert>
                        ) : null}

                        {eligibleRoutes.length ===
                            0 ? (
                            <Alert
                                severity="warning"
                                sx={{
                                    gridColumn:
                                        '1 / -1',
                                }}
                            >
                                There are no active routes with stops available to schedule.
                            </Alert>
                        ) : null}

                        <TextField
                            select
                            required
                            label="Route"
                            value={
                                form.routeId
                            }
                            disabled={
                                saving ||
                                eligibleRoutes.length ===
                                0
                            }
                            onChange={(
                                event,
                            ) =>
                                selectRoute(
                                    event.target
                                        .value,
                                )
                            }
                            helperText={
                                selectedRoute
                                    ? `${selectedRoute.stopCount} stops`
                                    : 'Choose the route for this trip.'
                            }
                            sx={{
                                gridColumn:
                                    '1 / -1',
                            }}
                        >
                            {eligibleRoutes.map(
                                (
                                    route,
                                ) => (
                                    <MenuItem
                                        key={
                                            route.id
                                        }
                                        value={
                                            route.id
                                        }
                                    >
                                        {routeLabel(
                                            route,
                                        )}
                                    </MenuItem>
                                ),
                            )}
                        </TextField>

                        <TextField
                            required
                            type="date"
                            label="Service date"
                            value={
                                form.serviceDate
                            }
                            disabled={
                                saving
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'serviceDate',
                                    event.target
                                        .value,
                                )
                            }
                            slotProps={{
                                inputLabel: {
                                    shrink:
                                        true,
                                },
                            }}
                        />

                        <Box />

                        <TextField
                            required
                            type="time"
                            label="Departure"
                            value={
                                form.startTime
                            }
                            disabled={
                                saving
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'startTime',
                                    event.target
                                        .value,
                                )
                            }
                            slotProps={{
                                inputLabel: {
                                    shrink:
                                        true,
                                },
                            }}
                        />

                        <TextField
                            required
                            type="time"
                            label="Expected finish"
                            value={
                                form.endTime
                            }
                            disabled={
                                saving
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'endTime',
                                    event.target
                                        .value,
                                )
                            }
                            slotProps={{
                                inputLabel: {
                                    shrink:
                                        true,
                                },
                            }}
                        />

                        <TextField
                            select
                            required
                            label="Vehicle"
                            value={
                                form.vehicleId
                            }
                            disabled={
                                saving ||
                                !selectedRoute
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'vehicleId',
                                    event.target
                                        .value,
                                )
                            }
                            helperText={
                                selectedRoute
                                    ? compatibleVehicles.length >
                                        0
                                        ? 'Choose an active vehicle.'
                                        : 'No compatible active vehicles are available.'
                                    : 'Select a route first.'
                            }
                        >
                            {compatibleVehicles.map(
                                (
                                    vehicle,
                                ) => (
                                    <MenuItem
                                        key={
                                            vehicle.id
                                        }
                                        value={
                                            vehicle.id
                                        }
                                    >
                                        {vehicleLabel(
                                            vehicle,
                                        )}
                                    </MenuItem>
                                ),
                            )}
                        </TextField>

                        <TextField
                            select
                            required
                            label="Driver"
                            value={
                                form.driverId
                            }
                            disabled={
                                saving ||
                                !selectedRoute
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'driverId',
                                    event.target
                                        .value,
                                )
                            }
                            helperText={
                                selectedRoute
                                    ? compatibleDrivers.length >
                                        0
                                        ? 'Choose an active driver.'
                                        : 'No compatible active drivers are available.'
                                    : 'Select a route first.'
                            }
                        >
                            {compatibleDrivers.map(
                                (
                                    driver,
                                ) => (
                                    <MenuItem
                                        key={
                                            driver.id
                                        }
                                        value={
                                            driver.id
                                        }
                                    >
                                        {driverLabel(
                                            driver,
                                        )}
                                    </MenuItem>
                                ),
                            )}
                        </TextField>

                        <TextField
                            multiline
                            minRows={
                                3
                            }
                            label="Notes"
                            value={
                                form.notes
                            }
                            disabled={
                                saving
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'notes',
                                    event.target
                                        .value,
                                )
                            }
                            placeholder="Optional instructions or operational notes"
                            slotProps={{
                                htmlInput: {
                                    maxLength:
                                        2000,
                                },
                            }}
                            sx={{
                                gridColumn:
                                    '1 / -1',
                            }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions
                    sx={{
                        px:
                            3,

                        pb:
                            3,
                    }}
                >
                    <Button
                        disabled={
                            saving
                        }
                        onClick={
                            onClose
                        }
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={
                            saving ||
                            eligibleRoutes.length ===
                            0
                        }
                    >
                        {saving
                            ? 'Scheduling...'
                            : 'Schedule trip'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}