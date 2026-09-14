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
    Trip,
    UpdateTripInput,
} from './trips.api';

const BUSINESS_TIME_ZONE =
    'Africa/Nairobi';

const BUSINESS_UTC_OFFSET =
    '+03:00';

interface TripEditDialogProps {
    open: boolean;

    trip:
        | Trip
        | null;

    routes:
        readonly Route[];

    vehicles:
        readonly Vehicle[];

    drivers:
        readonly Driver[];

    saving: boolean;

    error:
        | string
        | null;

    onClose: () => void;

    onSave: (
        input: UpdateTripInput,
    ) => Promise<void>;
}

interface TripEditFormState {
    routeId: string;

    serviceDate: string;

    startTime: string;

    endTime: string;

    vehicleId: string;

    driverId: string;

    notes: string;
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
        throw new Error(
            'Unable to determine business date',
        );
    }

    return `${year}-${month}-${day}`;
}

function businessTimeFromTimestamp(
    value:
        | string
        | null,
): string {
    if (!value) {
        return '';
    }

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

                hour:
                    '2-digit',

                minute:
                    '2-digit',

                hour12:
                    false,
            },
        ).formatToParts(
            date,
        );

    const hour =
        parts.find(
            (part) =>
                part.type ===
                'hour',
        )?.value ?? '';

    const minute =
        parts.find(
            (part) =>
                part.type ===
                'minute',
        )?.value ?? '';

    return `${hour}:${minute}`;
}

function toBusinessIso(
    date: string,
    time: string,
): string {
    return `${date}T${time}:00${BUSINESS_UTC_OFFSET}`;
}

function routeLabel(
    route: Route,
): string {
    return route.code
        ? `${route.name} (${route.code})`
        : route.name;
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

function createFormState(
    trip:
        | Trip
        | null,
): TripEditFormState {
    if (!trip) {
        return {
            routeId:
                '',

            serviceDate:
                '',

            startTime:
                '',

            endTime:
                '',

            vehicleId:
                '',

            driverId:
                '',

            notes:
                '',
        };
    }

    return {
        routeId:
            trip.routeId,

        serviceDate:
            trip.serviceDate,

        startTime:
            businessTimeFromTimestamp(
                trip.scheduledStartAt,
            ),

        endTime:
            businessTimeFromTimestamp(
                trip.scheduledEndAt,
            ),

        vehicleId:
            trip.vehicleId ??
            '',

        driverId:
            trip.driverId ??
            '',

        notes:
            trip.notes ??
            '',
    };
}

export function TripEditDialog({
    open,
    trip,
    routes,
    vehicles,
    drivers,
    saving,
    error,
    onClose,
    onSave,
}: TripEditDialogProps) {
    const [
        form,
        setForm,
    ] =
        useState<TripEditFormState>(
            () =>
                createFormState(
                    trip,
                ),
        );

    const [
        validationError,
        setValidationError,
    ] =
        useState<
            string | null
        >(null);

    if (!trip) {
        return null;
    }

    /**
     * Capture the non-null trip after the guard.
     *
     * TypeScript does not retain prop narrowing inside nested
     * callbacks because props can theoretically change between
     * renders.
     */
    const currentTrip =
        trip;

    const routeEditable =
        currentTrip.status ===
        'draft';

    const routeOptions =
        routes.filter(
            (route) =>
                route.schoolId ===
                currentTrip.schoolId &&
                (
                    route.id ===
                    currentTrip.routeId ||
                    (
                        route.status ===
                        'active' &&
                        route.stopCount >
                        0
                    )
                ),
        );

    const vehicleOptions =
        vehicles.filter(
            (vehicle) =>
                vehicle.status ===
                'active' ||
                vehicle.id ===
                currentTrip.vehicleId,
        );

    const driverOptions =
        drivers.filter(
            (driver) =>
                driver.status ===
                'active' ||
                driver.id ===
                currentTrip.driverId,
        );

    function updateField<
        K extends keyof TripEditFormState,
    >(
        key: K,
        value:
            TripEditFormState[K],
    ): void {
        setForm(
            (current) => ({
                ...current,

                [key]:
                    value,
            }),
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
            routeEditable &&
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
                'Service date is required.',
            );

            return;
        }

        if (
            form.serviceDate <
            businessDateToday()
        ) {
            setValidationError(
                'The service date cannot be in the past.',
            );

            return;
        }

        if (
            !form.startTime
        ) {
            setValidationError(
                'Departure time is required.',
            );

            return;
        }

        if (
            form.endTime &&
            form.endTime <=
            form.startTime
        ) {
            setValidationError(
                'Finish time must be later than departure time.',
            );

            return;
        }

        const notes =
            form.notes.trim();

        const input:
            UpdateTripInput = {
            ...(
                routeEditable &&
                form.routeId !==
                currentTrip.routeId
                    ? {
                        routeId:
                            form.routeId,
                    }
                    : {}
            ),

            vehicleId:
                form.vehicleId ||
                null,

            driverId:
                form.driverId ||
                null,

            serviceDate:
                form.serviceDate,

            scheduledStartAt:
                toBusinessIso(
                    form.serviceDate,
                    form.startTime,
                ),

            scheduledEndAt:
                form.endTime
                    ? toBusinessIso(
                        form.serviceDate,
                        form.endTime,
                    )
                    : null,

            notes:
                notes ||
                null,
        };

        await onSave(
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
                    Edit trip
                </DialogTitle>

                <DialogContent>
                    <Box
                        sx={{
                            pt:
                                1,

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

                        <TextField
                            select
                            label="Route"
                            value={
                                form.routeId
                            }
                            disabled={
                                !routeEditable ||
                                saving
                            }
                            onChange={(
                                event,
                            ) =>
                                updateField(
                                    'routeId',
                                    event.target
                                        .value,
                                )
                            }
                            helperText={
                                routeEditable
                                    ? 'Route can be changed while this trip remains a draft.'
                                    : 'Route is locked once the trip has been scheduled.'
                            }
                            sx={{
                                gridColumn:
                                    '1 / -1',
                            }}
                        >
                            {routeOptions.map(
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
                            type="date"
                            label="Service date"
                            value={
                                form.serviceDate
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

                                htmlInput: {
                                    min:
                                        businessDateToday(),
                                },
                            }}
                        />

                        <TextField
                            type="time"
                            label="Departure"
                            value={
                                form.startTime
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
                            type="time"
                            label="Finish"
                            value={
                                form.endTime
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
                            helperText={
                                currentTrip.status ===
                                'draft'
                                    ? 'Required before scheduling.'
                                    : undefined
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
                            label="Vehicle"
                            value={
                                form.vehicleId
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
                        >
                            <MenuItem value="">
                                Unassigned
                            </MenuItem>

                            {vehicleOptions.map(
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
                            label="Driver"
                            value={
                                form.driverId
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
                        >
                            <MenuItem value="">
                                Unassigned
                            </MenuItem>

                            {driverOptions.map(
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
                            label="Notes"
                            value={
                                form.notes
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
                            multiline
                            minRows={
                                3
                            }
                            sx={{
                                gridColumn:
                                    '1 / -1',
                            }}
                        />

                        <Typography
                            sx={{
                                gridColumn:
                                    '1 / -1',

                                color:
                                    'text.secondary',

                                fontSize:
                                    11.5,
                            }}
                        >
                            {currentTrip.status ===
                            'draft'
                                ? 'Draft trips can be amended and scheduled again after resolving route, vehicle, driver or timing conflicts.'
                                : 'This trip is already scheduled, so its route is locked.'}
                        </Typography>
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
                        onClick={
                            onClose
                        }
                        disabled={
                            saving
                        }
                    >
                        Cancel
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={
                            saving
                        }
                    >
                        {saving
                            ? 'Saving...'
                            : 'Save changes'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
